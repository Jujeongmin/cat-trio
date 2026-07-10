import React from "react";

interface CatSVGProps {
  typeId: number;
  className?: string;
}

export const TILE_TYPES = [
  { id: 0, name: "Siamese Cat", color: "#fef08a", bgColor: "bg-amber-100 border-amber-300" },
  { id: 1, name: "Orange Cat", color: "#fed7aa", bgColor: "bg-orange-100 border-orange-300" },
  { id: 2, name: "Calico Cat", color: "#fef08a", bgColor: "bg-yellow-50 border-yellow-300" },
  { id: 3, name: "Grey Tabby", color: "#e2e8f0", bgColor: "bg-slate-100 border-slate-300" },
  { id: 4, name: "Black Cat", color: "#cbd5e1", bgColor: "bg-zinc-800 border-zinc-700 text-white" },
  { id: 5, name: "White Fluff", color: "#ffffff", bgColor: "bg-white border-pink-200" },
  { id: 6, name: "Scottish Fold", color: "#ffedd5", bgColor: "bg-amber-50 border-amber-200" },
  { id: 7, name: "Sphynx Cat", color: "#ffe4e6", bgColor: "bg-rose-50 border-rose-200" },
  { id: 8, name: "Yummy Fish", color: "#bae6fd", bgColor: "bg-sky-50 border-sky-200" },
  { id: 9, name: "Strawberry Milk", color: "#fbcfe8", bgColor: "bg-pink-50 border-pink-200" },
  { id: 10, name: "Yarn Ball", color: "#fca5a5", bgColor: "bg-red-50 border-red-200" },
  { id: 11, name: "Lucky Paw", color: "#fed7aa", bgColor: "bg-orange-50 border-orange-200" },
];

export const CatSVG: React.FC<CatSVGProps> = ({ typeId, className = "w-full h-full" }) => {
  switch (typeId) {
    case 0: // Siamese
      return (
        <svg viewBox="0 0 100 100" className={className}>
          {/* Background cream face */}
          <circle cx="50" cy="50" r="42" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="2" />
          {/* Dark brown mask */}
          <path d="M 30,55 C 30,30 70,30 70,55 C 70,72 30,72 30,55 Z" fill="#44403c" />
          {/* Pointy ears */}
          <polygon points="15,30 32,15 35,38" fill="#44403c" />
          <polygon points="85,30 68,15 65,38" fill="#44403c" />
          <polygon points="18,28 30,18 31,35" fill="#fca5a5" />
          <polygon points="82,28 70,18 69,35" fill="#fca5a5" />
          {/* Blue eyes */}
          <ellipse cx="40" cy="48" rx="6" ry="8" fill="#38bdf8" />
          <ellipse cx="60" cy="48" rx="6" ry="8" fill="#38bdf8" />
          {/* Pupils */}
          <ellipse cx="40" cy="48" rx="2" ry="5" fill="#1c1917" />
          <ellipse cx="60" cy="48" rx="2" ry="5" fill="#1c1917" />
          <circle cx="38" cy="45" r="1.5" fill="#ffffff" />
          <circle cx="58" cy="45" r="1.5" fill="#ffffff" />
          {/* Nose & Mouth */}
          <polygon points="50,58 46,54 54,54" fill="#fca5a5" />
          <path d="M 46,62 Q 50,65 50,62 Q 50,65 54,62" fill="none" stroke="#292524" strokeWidth="2" strokeLinecap="round" />
          {/* Cute Whiskers */}
          <line x1="25" y1="58" x2="10" y2="56" stroke="#44403c" strokeWidth="1.5" />
          <line x1="25" y1="62" x2="8" y2="64" stroke="#44403c" strokeWidth="1.5" />
          <line x1="75" y1="58" x2="90" y2="56" stroke="#44403c" strokeWidth="1.5" />
          <line x1="75" y1="62" x2="92" y2="64" stroke="#44403c" strokeWidth="1.5" />
        </svg>
      );

    case 1: // Orange Cat
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="42" fill="#fdba74" stroke="#ea580c" strokeWidth="2" />
          {/* Stripes */}
          <path d="M 45,10 L 50,22 L 55,10 Z" fill="#ea580c" />
          <path d="M 38,12 L 44,22 L 46,12 Z" fill="#ea580c" />
          <path d="M 62,12 L 56,22 L 54,12 Z" fill="#ea580c" />
          {/* Cheek stripes */}
          <path d="M 8,50 Q 22,50 20,46" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <path d="M 8,56 Q 22,54 20,50" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <path d="M 92,50 Q 78,50 80,46" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <path d="M 92,56 Q 78,54 80,50" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          {/* Ears */}
          <polygon points="12,32 26,12 36,32" fill="#fdba74" stroke="#ea580c" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="88,32 74,12 64,32" fill="#fdba74" stroke="#ea580c" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="16,29 24,16 30,29" fill="#ffccd5" />
          <polygon points="84,29 76,16 70,29" fill="#ffccd5" />
          {/* Happy closed eyes */}
          <path d="M 30,46 Q 38,38 42,46" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 70,46 Q 62,38 58,46" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          {/* Pink Cheeks */}
          <circle cx="28" cy="54" r="5" fill="#f43f5e" opacity="0.4" />
          <circle cx="72" cy="54" r="5" fill="#f43f5e" opacity="0.4" />
          {/* Nose & Mouth */}
          <polygon points="50,54 46,50 54,50" fill="#f43f5e" />
          <path d="M 45,58 Q 50,62 50,58 Q 50,62 55,58" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 2: // Calico Cat
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="42" fill="#ffffff" stroke="#d1d5db" strokeWidth="2" />
          {/* Calico patches */}
          <path d="M 12,25 C 20,20 35,30 35,42 C 35,55 20,55 12,42 Z" fill="#4b5563" />
          <path d="M 88,30 C 80,25 65,30 65,45 C 65,58 80,58 88,45 Z" fill="#ea580c" />
          {/* Ears */}
          <polygon points="12,32 26,12 36,32" fill="#4b5563" />
          <polygon points="88,32 74,12 64,32" fill="#ea580c" />
          <polygon points="16,29 24,16 30,29" fill="#ffccd5" />
          <polygon points="84,29 76,16 70,29" fill="#ffccd5" />
          {/* Playful big eyes */}
          <circle cx="38" cy="46" r="6" fill="#1f2937" />
          <circle cx="62" cy="46" r="6" fill="#1f2937" />
          <circle cx="36" cy="44" r="2.2" fill="#ffffff" />
          <circle cx="60" cy="44" r="2.2" fill="#ffffff" />
          <circle cx="40" cy="48" r="1.1" fill="#ffffff" />
          <circle cx="64" cy="48" r="1.1" fill="#ffffff" />
          {/* Pink Nose/Cheeks & Mouth */}
          <polygon points="50,52 47,49 53,49" fill="#fca5a5" />
          <path d="M 45,55 Q 50,59 50,55 Q 50,59 55,55" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="55" x2="10" y2="54" stroke="#9ca3af" strokeWidth="1.5" />
          <line x1="24" y1="59" x2="11" y2="61" stroke="#9ca3af" strokeWidth="1.5" />
          <line x1="76" y1="55" x2="90" y2="54" stroke="#9ca3af" strokeWidth="1.5" />
          <line x1="76" y1="59" x2="89" y2="61" stroke="#9ca3af" strokeWidth="1.5" />
        </svg>
      );

    case 3: // Grey Tabby
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="42" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          {/* Stripes */}
          <path d="M 46,10 L 50,24 L 54,10 Z" fill="#334155" />
          <path d="M 38,12 L 43,22 L 44,12 Z" fill="#334155" />
          <path d="M 62,12 L 57,22 L 56,12 Z" fill="#334155" />
          <path d="M 10,48 L 24,48 L 22,44 Z" fill="#334155" />
          <path d="M 10,54 L 24,53 L 22,49 Z" fill="#334155" />
          <path d="M 90,48 L 76,48 L 78,44 Z" fill="#334155" />
          <path d="M 90,54 L 76,53 L 78,49 Z" fill="#334155" />
          {/* Ears */}
          <polygon points="12,32 26,12 36,32" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          <polygon points="88,32 74,12 64,32" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          <polygon points="16,29 24,16 30,29" fill="#fda4af" />
          <polygon points="84,29 76,16 70,29" fill="#fda4af" />
          {/* Cute green eyes */}
          <circle cx="38" cy="46" r="6" fill="#4ade80" />
          <circle cx="62" cy="46" r="6" fill="#4ade80" />
          <ellipse cx="38" cy="46" rx="2" ry="5" fill="#0f172a" />
          <ellipse cx="62" cy="46" rx="2" ry="5" fill="#0f172a" />
          <circle cx="36" cy="44" r="1.5" fill="#ffffff" />
          <circle cx="60" cy="44" r="1.5" fill="#ffffff" />
          {/* Nose & Mouth */}
          <polygon points="50,53 47,49 53,49" fill="#fda4af" />
          <path d="M 45,57 Q 50,61 50,57 Q 50,61 55,57" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 4: // Black Cat
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="42" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          {/* Ears */}
          <polygon points="12,32 26,11 36,32" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          <polygon points="88,32 74,11 64,32" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          <polygon points="17,28 24,16 30,28" fill="#fda4af" />
          <polygon points="83,28 76,16 70,28" fill="#fda4af" />
          {/* Large Gold Eyes */}
          <circle cx="38" cy="46" r="7.5" fill="#fbbf24" />
          <circle cx="62" cy="46" r="7.5" fill="#fbbf24" />
          <ellipse cx="38" cy="46" rx="2" ry="6" fill="#020617" />
          <ellipse cx="62" cy="46" rx="2" ry="6" fill="#020617" />
          <circle cx="36" cy="42" r="1.8" fill="#ffffff" />
          <circle cx="60" cy="42" r="1.8" fill="#ffffff" />
          {/* Pink Nose & Tiny Mouth */}
          <polygon points="50,53 47,50 53,50" fill="#f43f5e" />
          <path d="M 45,56 Q 50,60 50,56 Q 50,60 55,56" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          {/* Whiskers */}
          <line x1="22" y1="54" x2="6" y2="53" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="22" y1="58" x2="7" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="78" y1="54" x2="94" y2="53" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="78" y1="58" x2="93" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
        </svg>
      );

    case 5: // White Fluff
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="42" fill="#ffffff" stroke="#f1f5f9" strokeWidth="2" />
          {/* Fluffy cheeks outlines */}
          <path d="M 12,50 C 4,56 4,64 12,70" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
          <path d="M 88,50 C 96,56 96,64 88,70" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
          {/* Ears */}
          <polygon points="12,32 26,12 36,32" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          <polygon points="88,32 74,12 64,32" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          <polygon points="16,29 24,16 30,29" fill="#fbcfe8" />
          <polygon points="84,29 76,16 70,29" fill="#fbcfe8" />
          {/* Heterochromia Eyes (One Blue, One Yellow) */}
          <circle cx="38" cy="46" r="6" fill="#06b6d4" />
          <circle cx="62" cy="46" r="6" fill="#f59e0b" />
          <circle cx="38" cy="46" r="2.5" fill="#1e293b" />
          <circle cx="62" cy="46" r="2.5" fill="#1e293b" />
          <circle cx="36" cy="44" r="1.5" fill="#ffffff" />
          <circle cx="60" cy="44" r="1.5" fill="#ffffff" />
          {/* Nose & Mouth */}
          <polygon points="50,52 47,49 53,49" fill="#f472b6" />
          <path d="M 45,56 Q 50,60 50,56 Q 50,60 55,56" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          {/* Rosy blush */}
          <circle cx="26" cy="54" r="4" fill="#fda4af" opacity="0.5" />
          <circle cx="74" cy="54" r="4" fill="#fda4af" opacity="0.5" />
        </svg>
      );

    case 6: // Scottish Fold
      return (
        <svg viewBox="0 0 100 100" className={className}>
          {/* Chubby round face */}
          <circle cx="50" cy="50" r="42" fill="#fed7aa" stroke="#f97316" strokeWidth="2" />
          {/* Folded tiny ears */}
          <path d="M 12,32 L 20,24 Q 28,26 24,36 Z" fill="#ea580c" />
          <path d="M 88,32 L 80,24 Q 72,26 76,36 Z" fill="#ea580c" />
          <path d="M 14,31 L 18,26 Q 23,28 21,33" fill="#fca5a5" />
          <path d="M 86,31 L 82,26 Q 77,28 79,33" fill="#fca5a5" />
          {/* Big bewildered eyes */}
          <circle cx="37" cy="45" r="7" fill="#1e293b" />
          <circle cx="63" cy="45" r="7" fill="#1e293b" />
          <circle cx="35" cy="42" r="2" fill="#ffffff" />
          <circle cx="61" cy="42" r="2" fill="#ffffff" />
          <circle cx="39" cy="47" r="1" fill="#ffffff" />
          <circle cx="65" cy="47" r="1" fill="#ffffff" />
          {/* Small nose and shocked open mouth */}
          <polygon points="50,52 47,49 53,49" fill="#fca5a5" />
          <ellipse cx="50" cy="59" rx="3.5" ry="4.5" fill="#f43f5e" />
          {/* Chubby cheeks lines */}
          <path d="M 38,55 Q 44,57 47,53" fill="none" stroke="#7c2d12" strokeWidth="1.5" />
          <path d="M 62,55 Q 56,57 53,53" fill="none" stroke="#7c2d12" strokeWidth="1.5" />
        </svg>
      );

    case 7: // Sphynx Cat
      return (
        <svg viewBox="0 0 100 100" className={className}>
          {/* Angular triangular face */}
          <polygon points="50,92 18,44 18,34 50,44 82,34 82,44" fill="#fda4af" stroke="#e11d48" strokeWidth="2" strokeLinejoin="round" />
          {/* Huge alert ears */}
          <polygon points="18,36 2,2 34,26" fill="#fda4af" stroke="#e11d48" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="82,36 98,2 66,26" fill="#fda4af" stroke="#e11d48" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="16,30 6,10 28,24" fill="#fecdd3" />
          <polygon points="84,30 94,10 72,24" fill="#fecdd3" />
          {/* Forehead wrinkles */}
          <path d="M 42,35 Q 50,39 58,35" fill="none" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 44,40 Q 50,44 56,40" fill="none" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" />
          {/* Big tilted teal eyes */}
          <path d="M 28,48 Q 36,40 42,48 Q 36,54 28,48 Z" fill="#0ea5e9" />
          <path d="M 72,48 Q 64,40 58,48 Q 64,54 72,48 Z" fill="#0ea5e9" />
          <ellipse cx="35" cy="47" rx="2" ry="4" fill="#0f172a" />
          <ellipse cx="65" cy="47" rx="2" ry="4" fill="#0f172a" />
          <circle cx="34" cy="45" r="1" fill="#ffffff" />
          <circle cx="64" cy="45" r="1" fill="#ffffff" />
          {/* Sharp nose & mouth */}
          <polygon points="50,56 47,51 53,51" fill="#e11d48" />
          <path d="M 46,60 Q 50,63 50,60 Q 50,63 54,60" fill="none" stroke="#9f1239" strokeWidth="1.5" />
        </svg>
      );

    case 8: // Golden Fish
      return (
        <svg viewBox="0 0 100 100" className={className}>
          {/* Fish body */}
          <path d="M 15,50 C 25,30 65,30 75,50 C 65,70 25,70 15,50 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          {/* Tail fin */}
          <path d="M 72,50 L 90,32 L 84,50 L 90,68 Z" fill="#0ea5e9" stroke="#0284c7" strokeWidth="2" strokeLinejoin="round" />
          {/* Gill line & scales */}
          <path d="M 38,40 Q 42,50 38,60" fill="none" stroke="#0284c7" strokeWidth="2" />
          <path d="M 48,44 Q 51,50 48,56" fill="none" stroke="#0284c7" strokeWidth="1.5" />
          <path d="M 56,46 Q 59,50 56,54" fill="none" stroke="#0284c7" strokeWidth="1.5" />
          {/* Cute bubble eye */}
          <circle cx="28" cy="45" r="5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
          <circle cx="28" cy="45" r="2.5" fill="#0f172a" />
          <circle cx="27" cy="43" r="1" fill="#ffffff" />
          {/* Little happy mouth */}
          <path d="M 16,53 Q 20,55 18,50" fill="none" stroke="#0284c7" strokeWidth="2" />
        </svg>
      );

    case 9: // Strawberry Milk
      return (
        <svg viewBox="0 0 100 100" className={className}>
          {/* Milk carton container */}
          <polygon points="30,85 70,85 70,45 50,30 30,45" fill="#fce7f3" stroke="#db2777" strokeWidth="2.5" />
          <polygon points="30,45 70,45 70,40 50,25 30,40" fill="#fbcfe8" stroke="#db2777" strokeWidth="2" />
          {/* Cute Pink Label */}
          <rect x="36" y="52" width="28" height="24" rx="3" fill="#f472b6" />
          {/* Cute Strawberry */}
          <path d="M 45,60 C 45,55 55,55 55,60 C 55,68 45,68 45,60 Z" fill="#ef4444" />
          <polygon points="48,56 50,54 52,56" fill="#22c55e" />
          <circle cx="48" cy="61" r="0.5" fill="#fef08a" />
          <circle cx="52" cy="61" r="0.5" fill="#fef08a" />
          <circle cx="50" cy="64" r="0.5" fill="#fef08a" />
          {/* Straw */}
          <line x1="50" y1="28" x2="60" y2="12" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
          <line x1="53" y1="23" x2="59" y2="14" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 10: // Yarn Ball
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="35" fill="#fca5a5" stroke="#dc2626" strokeWidth="2.5" />
          {/* Yarn swirls */}
          <path d="M 22,35 Q 50,25 78,35" fill="none" stroke="#dc2626" strokeWidth="2" />
          <path d="M 18,45 Q 50,40 82,45" fill="none" stroke="#b91c1c" strokeWidth="2" />
          <path d="M 18,55 Q 50,60 82,55" fill="none" stroke="#dc2626" strokeWidth="2" />
          <path d="M 22,65 Q 50,75 78,65" fill="none" stroke="#b91c1c" strokeWidth="2" />
          <path d="M 35,22 Q 45,50 35,78" fill="none" stroke="#dc2626" strokeWidth="2" />
          <path d="M 50,15 Q 52,50 50,85" fill="none" stroke="#b91c1c" strokeWidth="2" />
          <path d="M 65,22 Q 55,50 65,78" fill="none" stroke="#dc2626" strokeWidth="2" />
          {/* Loose thread hanging out */}
          <path d="M 75,70 Q 88,85 78,92 Q 68,98 60,90" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 11: // Lucky Paw
      return (
        <svg viewBox="0 0 100 100" className={className}>
          {/* Round cream badge */}
          <circle cx="50" cy="50" r="42" fill="#fff7ed" stroke="#f97316" strokeWidth="2.5" />
          {/* Main paw pad */}
          <path d="M 32,60 C 32,50 40,44 50,44 C 60,44 68,50 68,60 C 68,70 60,74 50,74 C 40,74 32,70 32,60 Z" fill="#fda4af" />
          {/* Four toe pads */}
          <ellipse cx="28" cy="38" rx="6" ry="8" fill="#fda4af" transform="rotate(-15, 28, 38)" />
          <ellipse cx="42" cy="28" rx="6.5" ry="9" fill="#fda4af" />
          <ellipse cx="58" cy="28" rx="6.5" ry="9" fill="#fda4af" />
          <ellipse cx="72" cy="38" rx="6" ry="8" fill="#fda4af" transform="rotate(15, 72, 38)" />
          {/* Highlight cheeks or sparkles */}
          <circle cx="18" cy="22" r="1.5" fill="#fb923c" />
          <circle cx="82" cy="22" r="1.5" fill="#fb923c" />
          <circle cx="15" cy="28" r="1.0" fill="#fb923c" />
          <circle cx="85" cy="28" r="1.0" fill="#fb923c" />
        </svg>
      );

    default:
      return null;
  }
};
