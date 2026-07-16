import { CatPlacement, StageData, GameResult } from './types';
import { catSprite, costumeSprite } from './assets';
import { cellKey, reachableEmpty, isEscapable } from './escape';
import { store, persist } from './storage';
import { haptics } from './haptics';
import { sfx } from './audio';
import { t } from './i18n';
import {
  VW,
  VH,
  CELL,
  CELL_BOX,
  SLOT_Y,
  MAX_CAPACITY,
  gridX,
  gridY,
  setBoardRowSpan,
  slotCenterX,
  slotBoxSize,
  slotCatSize,
} from './layout';

// 아이템 가격(코인)
const ITEM_COST = { shuffle: 30, undo: 40, slotPlus: 60 } as const;

type BoardCat = CatPlacement & { present: boolean };
interface SlotCat {
  id: string;
  type: number;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// 스프라이트 시트 정면 정자세 = (0행, 1열)
const DIR = { down: 0, left: 1, right: 2, up: 3 } as const;

const timeLimitFor = (stage: StageData) => {
  const queued = stage.spawners.reduce((n, s) => n + s.queue.length, 0);
  return (30 + (stage.cats.length + queued) * 2.2) * 1000;
};

// 별 구간별 코인 보상. 재도전 시 무한 파밍 방지를 위해 실제 지급액은
// (이번 별 구간 보상 - 이전 최고 별 구간 보상)의 차액만 지급한다.
const coinsForStars = (stars: number) => (stars > 0 ? 50 + stars * 30 : 0);

export class Game {
  private wrap!: HTMLDivElement;
  private boardEl!: HTMLDivElement;
  private slotEl!: HTMLDivElement;
  private hudEl!: HTMLDivElement;
  private barEl!: HTMLDivElement;
  private itemsEl!: HTMLDivElement;

  private els = new Map<string, HTMLDivElement>();
  private cats: BoardCat[] = [];
  private occupied = new Set<string>(); // 현재 고양이가 있는 칸
  private walls = new Set<string>(); // 통과 불가 벽 칸
  private shapeSet = new Set<string>(); // 컨테이너(유효) 칸
  private passable = new Set<string>(); // 통행 가능 칸 (shape - walls)
  private slots: SlotCat[] = [];
  private history: string[] = []; // 슬롯에 넣은 순서(아직 매치 안 된 것만 유지) — 되돌리기용

  private capacity = 7;
  private slotPlusUsed = false; // 슬롯+1은 스테이지당 1회만
  private over = false;
  private inFlight = 0; // 진행 중인 select() 애니메이션 수 — 아이템 버튼 잠금용

  private limitMs: number;
  private startTime = 0;
  private stars = 3;
  private timerId = 0;

  private barStars: HTMLElement[] = [];
  private readonly starThresholds = [2 / 3, 1 / 3, 0];

  private spawners: {
    col: number;
    row: number;
    queue: number[];
    countEl: HTMLElement | null;
  }[] = [];
  private spawnSeq = 0;

  // 튜토리얼 (스테이지 1 첫 플레이)
  private tutStep = 0; // 0=꺼짐, 1=고양이 선택 안내, 2=3매치 안내
  private tutEls: HTMLElement[] = [];
  private tutHandEl: HTMLElement | null = null;
  private tutMsgEl: HTMLElement | null = null;

  constructor(
    private root: HTMLElement,
    private stage: StageData,
    private onEnd: (result: GameResult) => void,
    private onBack: () => void,
    private tutorial = false,
  ) {
    this.cats = stage.cats.map((c) => ({ ...c, present: true }));
    for (const c of this.cats) this.occupied.add(cellKey(c.col, c.row));
    for (const w of stage.walls) this.walls.add(cellKey(w.col, w.row));
    for (const s of stage.shape) this.shapeSet.add(cellKey(s.col, s.row));
    for (const k of this.shapeSet) if (!this.walls.has(k)) this.passable.add(k);
    this.spawners = stage.spawners.map((s) => ({
      col: s.col,
      row: s.row,
      queue: [...s.queue],
      countEl: null,
    }));
    this.limitMs = timeLimitFor(stage);
    // 실제 고양이/파이프가 놓인 행 범위를 화면 세로 중앙에 맞춘다 (gridY 오프셋)
    const rowsUsed = [...this.cats.map((c) => c.row), ...this.spawners.map((s) => s.row)];
    setBoardRowSpan(Math.min(...rowsUsed), Math.max(...rowsUsed));
    this.build();
    this.renderBoard();
    this.computeEscapable();
    this.fitScale();
    window.addEventListener('resize', this.fitScale);
    if (this.tutorial) {
      this.startTutorial(); // 타이머는 튜토리얼이 끝난 뒤 시작
    } else {
      this.startTimer();
    }
  }

  private startTimer() {
    this.startTime = performance.now();
    this.timerId = window.setInterval(this.tick, 100);
  }

  destroy() {
    clearInterval(this.timerId);
    window.removeEventListener('resize', this.fitScale);
    this.root.innerHTML = '';
  }

  // ---- DOM 구성 ----------------------------------------------------------
  private build() {
    this.root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.style.width = `${VW}px`;
    wrap.style.height = `${VH}px`;

    this.hudEl = document.createElement('div');
    this.hudEl.className = 'hud';

    this.barEl = document.createElement('div');
    this.barEl.className = 'timebar';
    this.barEl.innerHTML =
      '<i></i>' +
      this.starThresholds
        .map((t) => `<span class="bar-star" style="left:${Math.max(3, t * 100)}%">★</span>`)
        .join('');
    this.barStars = Array.from(this.barEl.querySelectorAll<HTMLElement>('.bar-star'));

    this.boardEl = document.createElement('div');
    this.boardEl.className = 'board';

    this.slotEl = document.createElement('div');
    this.slotEl.className = 'slotbar';
    this.renderSlotBar();

    this.itemsEl = document.createElement('div');
    this.itemsEl.className = 'itembar';
    this.itemsEl.innerHTML = `
      <button class="item-btn" data-item="shuffle">
        <span class="item-ic">🔀</span><span class="item-label">${t('shuffleLabel')}</span>
        <span class="item-cost"><i class="coin-ic"></i>${ITEM_COST.shuffle}</span>
      </button>
      <button class="item-btn" data-item="undo">
        <span class="item-ic">↩️</span><span class="item-label">${t('undoLabel')}</span>
        <span class="item-cost"><i class="coin-ic"></i>${ITEM_COST.undo}</span>
      </button>
      <button class="item-btn" data-item="slotplus">
        <span class="item-ic">➕</span><span class="item-label">${t('slotPlusLabel')}</span>
        <span class="item-cost"><i class="coin-ic"></i>${ITEM_COST.slotPlus}</span>
      </button>
    `;
    this.itemsEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-item]') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      if (btn.dataset.item === 'shuffle') this.useShuffle();
      else if (btn.dataset.item === 'undo') this.useUndo();
      else if (btn.dataset.item === 'slotplus') this.useSlotPlus();
    });

    wrap.append(this.hudEl, this.barEl, this.boardEl, this.slotEl, this.itemsEl);
    this.root.appendChild(wrap);
    this.wrap = wrap;

    this.boardEl.addEventListener('click', this.onBoardClick);
    this.hudEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.back-btn')) this.onBack();
    });
    this.renderHud();
    this.updateItemBar();
  }

  private renderHud() {
    this.hudEl.innerHTML = `
      <button class="back-btn" aria-label="${t('backAria')}">‹</button>
      <div class="hud-item hud-stage">
        <span class="hud-stage-label">STAGE</span><b class="hud-stage-num">${this.stage.id}</b>
      </div>
      <div class="hud-item hud-coin"><i class="coin-ic"></i><b>${store.coins}</b></div>
    `;
  }

  // 슬롯 칸(배경) 다시 그리기 — capacity 변경(슬롯+1) 시에도 호출
  private renderSlotBar() {
    const box = slotBoxSize(this.capacity);
    this.slotEl.innerHTML = '';
    for (let i = 0; i < this.capacity; i++) {
      const cell = document.createElement('div');
      cell.className = 'slot';
      cell.style.width = `${box}px`;
      cell.style.height = `${box}px`;
      cell.style.left = `${slotCenterX(i, this.capacity) - box / 2}px`;
      cell.style.top = `${SLOT_Y - box / 2}px`;
      this.slotEl.appendChild(cell);
    }
  }

  private remaining() {
    return this.cats.filter((c) => c.present).length;
  }

  // ---- 타이머 / 별 --------------------------------------------------------
  private tick = () => {
    if (this.over) return;
    const elapsed = performance.now() - this.startTime;
    const ratio = Math.max(0, 1 - elapsed / this.limitMs);
    const stars = ratio > 2 / 3 ? 3 : ratio > 1 / 3 ? 2 : ratio > 0 ? 1 : 0;
    this.stars = stars;
    (this.barEl.firstElementChild as HTMLElement).style.width = `${ratio * 100}%`;
    this.barEl.classList.toggle('low', ratio <= 1 / 3);
    this.barStars.forEach((el, i) =>
      el.classList.toggle('lost', ratio <= this.starThresholds[i]),
    );
    if (stars <= 0) this.end(false);
  };

  private fitScale = () => {
    const parentWidth = this.root.clientWidth || window.innerWidth;
    const parentHeight = this.root.clientHeight || window.innerHeight;
    const s = Math.min(parentWidth / VW, parentHeight / VH);
    this.wrap.style.transform = `translate(-50%, -50%) scale(${s})`;
  };

  // ---- 스프라이트 프레임 --------------------------------------------------
  // 프레임 위치를 각 .cat-layer 자식에 background-position "shorthand" 로 직접 지정.
  // (background-position-x/y 개별 longhand·CSS 변수는 일부 웹뷰에서 안 먹어
  //  뒤 레이어가 렌더 안 되는 원인이 되므로 shorthand·인라인만 사용한다.)
  private setFrame(el: HTMLElement, col: number, row: number) {
    const pos = `${col * 50}% ${(row * 100) / 3}%`;
    el.dataset.pos = pos; // applyLayers 가 레이어 재생성 시 재사용
    for (const child of el.children) {
      if (child.classList.contains('cat-layer')) {
        (child as HTMLElement).style.backgroundPosition = pos;
      }
    }
  }

  // ---- 렌더링 -------------------------------------------------------------
  private renderBoard() {
    const { cols } = this.stage;
    const exitKeys = new Set(this.stage.exits.map((e) => cellKey(e.col, e.row)));
    const inShape = (c: number, r: number) => this.shapeSet.has(cellKey(c, r));
    const add = (el: HTMLDivElement) => this.boardEl.appendChild(el);

    // 1) 컨테이너 채움(밝은 타일) — shape 칸
    for (const s of this.stage.shape) {
      const fill = document.createElement('div');
      fill.className = 'maze-fill';
      fill.style.width = `${CELL_BOX}px`;
      fill.style.height = `${CELL_BOX}px`;
      this.placeAt(fill, gridX(s.col, cols), gridY(s.row), CELL_BOX);
      add(fill);
    }

    // 2) 경계 벽(파란 선분) — shape 칸이 바깥과 접한 변. 탈출구 바닥변은 비운다.
    const TH = 7;
    for (const s of this.stage.shape) {
      const cx = gridX(s.col, cols);
      const cy = gridY(s.row);
      const half = CELL_BOX / 2;
      const isExit = exitKeys.has(cellKey(s.col, s.row));
      const seg = (x: number, y: number, w: number, h: number) => {
        const d = document.createElement('div');
        d.className = 'maze-border';
        d.style.left = `${x}px`;
        d.style.top = `${y}px`;
        d.style.width = `${w}px`;
        d.style.height = `${h}px`;
        add(d);
      };
      if (!inShape(s.col, s.row - 1)) seg(cx - half - TH / 2, cy - half - TH / 2, CELL_BOX + TH, TH);
      if (!inShape(s.col - 1, s.row)) seg(cx - half - TH / 2, cy - half - TH / 2, TH, CELL_BOX + TH);
      if (!inShape(s.col + 1, s.row)) seg(cx + half - TH / 2, cy - half - TH / 2, TH, CELL_BOX + TH);
      if (!inShape(s.col, s.row + 1) && !isExit)
        seg(cx - half - TH / 2, cy + half - TH / 2, CELL_BOX + TH, TH);
    }

    // 3) 셀 홈(recess) — shape 중 벽이 아닌 칸
    const holeSize = CELL_BOX * 0.86;
    for (const s of this.stage.shape) {
      if (this.walls.has(cellKey(s.col, s.row))) continue;
      const hole = document.createElement('div');
      hole.className = 'cell';
      hole.style.width = `${holeSize}px`;
      hole.style.height = `${holeSize}px`;
      this.placeAt(hole, gridX(s.col, cols), gridY(s.row), holeSize);
      add(hole);
    }

    // 4) 벽 블록(갈색)
    for (const w of this.stage.walls) {
      const el = document.createElement('div');
      el.className = 'wall';
      const size = CELL_BOX * 0.94;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      this.placeAt(el, gridX(w.col, cols), gridY(w.row), size);
      add(el);
    }

    // 5) 탈출구 화살표
    for (const e of this.stage.exits) {
      const arrow = document.createElement('div');
      arrow.className = 'exit-arrow';
      arrow.textContent = '▼';
      arrow.style.left = `${gridX(e.col, cols) - 14}px`;
      arrow.style.top = `${gridY(e.row) + CELL_BOX / 2 + 6}px`;
      add(arrow);
    }

    // 6) 스폰 박스 — 한 칸을 통째로 차지하는 열린 골판지 상자. 고양이가 이
    //    상자 안에서 튀어나오는 연출(spawn-in)과 어우러진다. 고양이(z5)가
    //    상자(z4) 위에 얹혀 "상자 속 고양이"처럼 보인다.
    for (const sp of this.spawners) {
      const box = document.createElement('div');
      box.className = 'spawn-box';
      box.style.width = `${CELL_BOX}px`;
      box.style.height = `${CELL_BOX}px`;
      this.placeAt(box, gridX(sp.col, cols), gridY(sp.row), CELL_BOX);
      box.innerHTML =
        '<i class="spawn-flap spawn-flap-l"></i>' +
        '<i class="spawn-flap spawn-flap-r"></i>' +
        '<span class="spawn-hole"></span>' +
        '<b class="spawn-count"></b>';
      add(box);
      sp.countEl = box.querySelector('.spawn-count');
      this.updateSpawnCount(sp);
    }

    // 7) 고양이 (한 칸에 하나, 겹치지 않음)
    for (const c of this.cats) this.makeCatEl(c);
  }

  // 고양이 스프라이트 + 착용물을 각각 별도의 자식 레이어(.cat-layer)로 쌓는다.
  // CSS 다중 배경(background-image 여러 겹)은 일부 웹뷰/런타임에서 뒤 레이어가
  // 렌더되지 않는 문제가 있어(에디터 OK·런치 실패), 겹침을 DOM 요소로 처리한다.
  // 쌓는 순서(뒤→앞): 고양이 → 의상 → 모자. (나중 자식이 위에 그려짐)
  // 각 레이어의 프레임 위치는 인라인 스타일로 직접 주입해 CSS 변수 상속 끊김에
  // 대비한다.
  private applyLayers(el: HTMLElement, type: number) {
    el.textContent = '';
    const pos = el.dataset.pos || '50% 0%';
    const urls = [catSprite(type)];
    const clothes = store.equippedClothes[type];
    const hat = store.equippedHats[type];
    if (clothes !== undefined) urls.push(costumeSprite(clothes));
    if (hat !== undefined) urls.push(costumeSprite(hat));
    for (const u of urls) {
      const layer = document.createElement('div');
      layer.className = 'cat-layer';
      // 렌더링에 필요한 모든 속성을 인라인·shorthand 로 지정 — CSS 클래스/변수/inset
      // 지원 여부와 무관하게 어떤 런타임에서도 겹침이 깨지지 않도록.
      const s = layer.style;
      s.position = 'absolute';
      s.top = '0';
      s.left = '0';
      s.width = '100%';
      s.height = '100%';
      s.backgroundImage = `url(${u})`;
      s.backgroundRepeat = 'no-repeat';
      s.backgroundSize = '300% 400%';
      s.backgroundPosition = pos;
      s.imageRendering = 'pixelated';
      el.appendChild(layer);
    }
  }

  private makeCatEl(cat: { id: string; type: number; col: number; row: number }) {
    const el = document.createElement('div');
    el.className = 'cat';
    el.dataset.id = cat.id;
    this.applyLayers(el, cat.type);
    el.style.width = `${CELL}px`;
    el.style.height = `${CELL}px`;
    el.style.zIndex = '5';
    this.setFrame(el, 1, DIR.down);
    this.placeAt(el, gridX(cat.col, this.stage.cols), gridY(cat.row), CELL);
    this.boardEl.appendChild(el);
    this.els.set(cat.id, el);
    return el;
  }

  private updateSpawnCount(sp: (typeof this.spawners)[number]) {
    if (!sp.countEl) return;
    const n = sp.queue.length;
    sp.countEl.textContent = String(n);
    sp.countEl.classList.toggle('empty', n === 0);
  }

  // 출구 칸이 빈 파이프가 있으면 다음 고양이를 밀어낸다.
  private trySpawn() {
    let spawned = false;
    for (const sp of this.spawners) {
      if (sp.queue.length === 0) continue;
      const key = cellKey(sp.col, sp.row);
      if (this.occupied.has(key)) continue; // 출구가 아직 참
      const type = sp.queue.shift()!;
      this.updateSpawnCount(sp);
      const cat: BoardCat = {
        id: `p${this.spawnSeq++}`,
        type,
        col: sp.col,
        row: sp.row,
        present: true,
      };
      this.cats.push(cat);
      this.occupied.add(key);
      const el = this.makeCatEl(cat);
      el.classList.add('spawn-in');
      el.addEventListener('animationend', () => el.classList.remove('spawn-in'), { once: true });
      spawned = true;
    }
    if (spawned) this.computeEscapable();
  }

  private placeAt(el: HTMLElement, cx: number, cy: number, size: number) {
    el.style.left = `${cx - size / 2}px`;
    el.style.top = `${cy - size / 2}px`;
  }

  // 길찾기용 점유 칸 — 파이프에 고양이가 남아있으면 그 출구 칸은 (곧 다시
  // 채워지므로) 계속 막힌 것으로 본다. 스폰 지연 동안 안쪽 칸이 잘못 열리는 것 방지.
  private blockedForPath(): Set<string> {
    const active = this.spawners.filter((sp) => sp.queue.length > 0);
    if (active.length === 0) return this.occupied;
    const s = new Set(this.occupied);
    for (const sp of active) s.add(cellKey(sp.col, sp.row));
    return s;
  }

  // 탈출 가능한 고양이만 선택 가능 → 나머지는 반투명
  private computeEscapable() {
    const { exits } = this.stage;
    const blocked = this.blockedForPath();
    const reach = reachableEmpty(blocked, this.passable, exits);
    for (const c of this.cats) {
      if (!c.present) continue;
      const esc = isEscapable(c.col, c.row, blocked, this.passable, exits, reach);
      const el = this.els.get(c.id)!;
      el.classList.toggle('free', esc);
      el.classList.toggle('locked', !esc);
    }
    if (this.tutStep > 0) this.updateTutorialHand();
  }

  // ---- 튜토리얼 -----------------------------------------------------------
  private startTutorial() {
    this.wrap.classList.add('tut-on');
    (this.barEl.firstElementChild as HTMLElement).style.width = '100%'; // 시간바 꽉 찬 채 고정

    const dim = document.createElement('div');
    dim.className = 'tut-dim';

    const hand = document.createElement('div');
    hand.className = 'tut-hand';
    hand.textContent = '👆';
    this.tutHandEl = hand;

    const msg = document.createElement('div');
    msg.className = 'tut-msg';
    msg.innerHTML = `<p class="tut-text"></p><button class="tut-skip">${t('skipBtn')}</button>`;
    msg.querySelector('.tut-skip')!.addEventListener('click', () => this.finishTutorial());
    this.tutMsgEl = msg.querySelector('.tut-text');

    this.wrap.append(dim, hand, msg);
    this.tutEls = [dim, hand, msg];

    this.showTutorialStep(1);
  }

  private showTutorialStep(step: number) {
    this.tutStep = step;
    if (this.tutMsgEl) {
      this.tutMsgEl.textContent = step === 1 ? t('tutorialStep1') : t('tutorialStep2');
    }
    this.updateTutorialHand();
  }

  // 손가락을 현재 선택 가능한 고양이 위에 놓는다 (1단계에서만)
  private updateTutorialHand() {
    const hand = this.tutHandEl;
    if (!hand) return;
    if (this.tutStep !== 1) {
      hand.style.display = 'none';
      return;
    }
    const free = this.cats.find(
      (c) => c.present && this.els.get(c.id)?.classList.contains('free'),
    );
    if (!free) {
      hand.style.display = 'none';
      return;
    }
    hand.style.display = 'block';
    hand.style.left = `${gridX(free.col, this.stage.cols) - 14}px`;
    hand.style.top = `${gridY(free.row) + CELL * 0.42}px`;
  }

  private finishTutorial() {
    if (!this.tutorial) return;
    this.tutorial = false;
    this.tutStep = 0;
    store.tutorialDone = true;
    persist();
    this.wrap.classList.remove('tut-on');
    for (const el of this.tutEls) el.remove();
    this.tutEls = [];
    this.tutHandEl = null;
    this.tutMsgEl = null;
    this.startTimer(); // 이제부터 시간 흐름
  }

  private nearestExit(cat: BoardCat) {
    let best = this.stage.exits[0];
    let bd = Infinity;
    for (const e of this.stage.exits) {
      const d = Math.abs(e.col - cat.col) + Math.abs(e.row - cat.row);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // ---- 인터랙션 -----------------------------------------------------------
  private onBoardClick = (e: MouseEvent) => {
    if (this.over) return;
    const target = (e.target as HTMLElement).closest('.cat') as HTMLDivElement | null;
    if (!target) return;
    const id = target.dataset.id!;
    const cat = this.cats.find((c) => c.id === id);
    if (!cat || !cat.present) return;
    if (target.classList.contains('locked')) return; // 탈출 불가
    if (this.slots.length >= this.capacity) return;
    haptics.tap();
    sfx.tap();
    void this.select(cat);
  };

  private async select(cat: BoardCat) {
    if (this.tutStep === 1) this.showTutorialStep(2); // 첫 선택 → 3매치 안내
    this.inFlight++;
    this.updateItemBar();
    try {
      cat.present = false;
      this.occupied.delete(cellKey(cat.col, cat.row));
      // 같은 종류가 이미 슬롯에 있으면 그 뒤에 끼워 넣어 종류별로 모이게 한다
      const lastSame = this.slots.map((s) => s.type).lastIndexOf(cat.type);
      if (lastSame !== -1) this.slots.splice(lastSame + 1, 0, { id: cat.id, type: cat.type });
      else this.slots.push({ id: cat.id, type: cat.type });
      this.history.push(cat.id);

      const el = this.els.get(cat.id)!;
      el.classList.remove('free', 'locked');
      el.classList.add('walk');
      el.style.zIndex = '1000';

      // 빈 칸이 생겨 이웃이 열릴 수 있음 → 즉시 재계산
      this.computeEscapable();

      // 탈출구로 빠져나간 뒤 슬롯으로
      const ex = this.nearestExit(cat);
      const exX = gridX(ex.col, this.stage.cols);
      const exY = gridY(ex.row) + CELL_BOX * 0.95;
      const catSize = slotCatSize(this.capacity);
      el.style.width = `${catSize}px`;
      el.style.height = `${catSize}px`;
      this.placeAt(el, exX, exY, catSize);
      await wait(560); // 이동 transition(0.6s)에 맞춰 걷기 애니메이션이 보이도록

      this.trySpawn(); // 출구 칸이 비었으면 파이프에서 다음 고양이

      // 슬롯까지 이동하는 동안에도 계속 걷게 두고, 도착 후에 걷기를 멈춘다.
      await this.moveToSlots();
      el.classList.remove('walk');
      this.setFrame(el, 1, DIR.down);

      const matched = this.resolveMatches();

      if (!matched && this.slots.length >= this.capacity) {
        this.end(false);
        return;
      }
      const pipesEmpty = this.spawners.every((sp) => sp.queue.length === 0);
      if (this.remaining() === 0 && this.slots.length === 0 && pipesEmpty) {
        await wait(560);
        this.end(true);
      }
    } finally {
      this.inFlight--;
      this.updateItemBar();
    }
  }

  private async moveToSlots() {
    const catSize = slotCatSize(this.capacity);
    this.slots.forEach((s, i) => {
      const el = this.els.get(s.id);
      if (!el) return;
      el.classList.add('inslot');
      el.style.width = `${catSize}px`;
      el.style.height = `${catSize}px`;
      this.placeAt(el, slotCenterX(i, this.capacity), SLOT_Y, catSize);
    });
    await wait(560);
  }

  // 3매치 — 데이터 즉시 제거, 회전 연출은 논블로킹
  private resolveMatches(): boolean {
    const byType = new Map<number, string[]>();
    for (const s of this.slots) {
      const arr = byType.get(s.type) ?? [];
      arr.push(s.id);
      byType.set(s.type, arr);
    }
    let match: string[] | null = null;
    for (const [, ids] of byType) {
      if (ids.length >= 3) {
        match = ids.slice(0, 3);
        break;
      }
    }
    if (!match) return false;
    haptics.match();
    sfx.match();
    if (this.tutorial) this.finishTutorial(); // 첫 3매치 성사 → 튜토리얼 완료

    const removing = match;
    this.slots = this.slots.filter((s) => !removing.includes(s.id));
    this.history = this.history.filter((id) => !removing.includes(id)); // 매치된 건 되돌리기 대상에서 제외
    this.repositionSlots();
    void this.playMatchAnim(removing);
    return true;
  }

  private repositionSlots() {
    const catSize = slotCatSize(this.capacity);
    this.slots.forEach((s, i) => {
      const el = this.els.get(s.id);
      if (el) this.placeAt(el, slotCenterX(i, this.capacity), SLOT_Y, catSize);
    });
  }

  private async playMatchAnim(ids: string[]) {
    for (const id of ids) this.els.get(id)?.classList.add('spin');
    await wait(520);
    for (const id of ids) {
      this.els.get(id)?.remove();
      this.els.delete(id);
    }
  }

  // ---- 아이템 ---------------------------------------------------------------
  // 마지막으로 슬롯에 들어간(아직 매치되지 않은) 고양이를 되돌릴 수 있는지.
  private canUndo(): boolean {
    const lastId = this.history[this.history.length - 1];
    if (lastId === undefined) return false;
    const cat = this.cats.find((c) => c.id === lastId);
    if (!cat) return false;
    // 파이프 칸에서 다음 고양이가 이미 그 자리를 채웠으면 되돌릴 자리가 없다.
    if (this.occupied.has(cellKey(cat.col, cat.row))) return false;
    return true;
  }

  private updateItemBar() {
    if (!this.itemsEl) return;
    const shuffleBtn = this.itemsEl.querySelector<HTMLButtonElement>('[data-item="shuffle"]')!;
    const undoBtn = this.itemsEl.querySelector<HTMLButtonElement>('[data-item="undo"]')!;
    const slotBtn = this.itemsEl.querySelector<HTMLButtonElement>('[data-item="slotplus"]')!;
    const blocked = this.over || this.inFlight > 0;
    const presentCount = this.remaining();
    shuffleBtn.disabled = blocked || store.coins < ITEM_COST.shuffle || presentCount < 2;
    undoBtn.disabled = blocked || store.coins < ITEM_COST.undo || !this.canUndo();
    slotBtn.disabled =
      blocked ||
      store.coins < ITEM_COST.slotPlus ||
      this.capacity >= MAX_CAPACITY ||
      this.slotPlusUsed;
  }

  // 셔플 — 보드 위 살아있는 고양이들의 "종류"를 서로 뒤섞는다.
  // 칸(위치) 구조는 그대로라 미로 풀림 보장이 깨지지 않는다.
  private useShuffle() {
    if (this.over || this.inFlight > 0) return;
    const present = this.cats.filter((c) => c.present);
    if (present.length < 2 || store.coins < ITEM_COST.shuffle) return;
    store.coins -= ITEM_COST.shuffle;
    persist();

    const types = present.map((c) => c.type);
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    present.forEach((c, i) => {
      c.type = types[i];
      const el = this.els.get(c.id)!;
      this.applyLayers(el, c.type);
      el.classList.add('shuffle-pulse');
      el.addEventListener('animationend', () => el.classList.remove('shuffle-pulse'), {
        once: true,
      });
    });

    this.renderHud();
    this.updateItemBar();
  }

  // 되돌리기 — 마지막으로 슬롯에 넣은(아직 매치 안 된) 고양이를 슬롯에서 빼서 원래 칸으로.
  private useUndo() {
    if (this.over || this.inFlight > 0) return;
    if (!this.canUndo() || store.coins < ITEM_COST.undo) return;
    store.coins -= ITEM_COST.undo;
    persist();

    const lastId = this.history.pop()!;
    const idx = this.slots.findIndex((s) => s.id === lastId);
    if (idx !== -1) this.slots.splice(idx, 1);
    this.repositionSlots();

    const cat = this.cats.find((c) => c.id === lastId)!;
    cat.present = true;
    this.occupied.add(cellKey(cat.col, cat.row));

    const el = this.els.get(lastId)!;
    el.classList.remove('inslot', 'walk');
    el.style.width = `${CELL}px`;
    el.style.height = `${CELL}px`;
    el.style.zIndex = '5';
    this.applyLayers(el, cat.type);
    this.placeAt(el, gridX(cat.col, this.stage.cols), gridY(cat.row), CELL);
    this.setFrame(el, 1, DIR.down);

    this.computeEscapable();
    this.renderHud();
    this.updateItemBar();
  }

  // 슬롯+1 — 이번 스테이지에서 슬롯 칸을 1개 늘린다. (스테이지당 1회)
  private useSlotPlus() {
    if (this.over || this.inFlight > 0) return;
    if (this.slotPlusUsed || this.capacity >= MAX_CAPACITY || store.coins < ITEM_COST.slotPlus)
      return;
    store.coins -= ITEM_COST.slotPlus;
    persist();

    this.slotPlusUsed = true;
    this.capacity++;
    this.renderSlotBar();
    this.repositionSlots();

    this.renderHud();
    this.updateItemBar();
  }

  // ---- 종료 ---------------------------------------------------------------
  private end(win: boolean) {
    if (this.over) return;
    this.over = true;
    this.updateItemBar();
    clearInterval(this.timerId);
    win ? haptics.win() : haptics.lose();
    win ? sfx.win() : sfx.lose();
    const timeMs = performance.now() - this.startTime;
    const stars = win ? this.stars : 0;
    // 이전 최고 별보다 개선됐을 때만, 그 구간 차액만큼만 코인 지급
    // (이미 3개 별로 깬 스테이지를 재도전해도 코인이 계속 나오는 파밍 방지)
    const prevBestStars = store.bestStars[this.stage.id] ?? 0;
    const coins =
      win && stars > prevBestStars ? coinsForStars(stars) - coinsForStars(prevBestStars) : 0;
    this.onEnd({ stageId: this.stage.id, win, stars, coins, timeMs });
  }
}
