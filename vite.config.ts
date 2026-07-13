import { defineConfig } from 'vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Verse8(Agent8)는 Vite 프로젝트를 그대로 빌드/배포한다.
// 요구사항: index.html 을 game/ 폴더 안에 둔다 → Vite 의 `root` 를 game 으로 지정.
// vite.config.ts 는 프로젝트 루트에 그대로 유지한다.
export default defineConfig({
  // index.html 과 소스가 위치한 앱 루트
  root: 'game',

  // 배포 경로에 관계없이 자산이 로드되도록 상대 경로(base) 사용.
  // Verse8 처럼 하위 경로에서 서빙될 때도 안전하다.
  base: './',

  build: {
    // 빌드 산출물은 프로젝트 루트의 dist/ 로 내보낸다.
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0, // 고양이 스프라이트는 파일로 유지 (data URI 인라인 방지)
  },

  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
  },

  plugins: [
    {
      name: 'copy-server-dist',
      writeBundle() {
        const serverSrc = resolve(__dirname, 'server/dist/server.js');
        const serverDest = resolve(__dirname, 'dist/server.js');
        if (existsSync(serverSrc)) {
          copyFileSync(serverSrc, serverDest);
          console.log('✅ Copied server/dist/server.js → dist/server.js');
        } else {
          console.warn('⚠️  server/dist/server.js not found. Skipping server copy. Run npx -y @agent8/gameserver-node build first.');
        }
      },
    },
  ],
});
