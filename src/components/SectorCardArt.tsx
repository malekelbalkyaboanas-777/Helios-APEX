import { RealmId } from '../game/types';

interface SectorCardArtProps {
  sectorIdx: number;
  realmId: RealmId;
}

export function SectorCardArt({ sectorIdx, realmId }: SectorCardArtProps) {
  const isLater = sectorIdx >= 6;

  if (realmId === 0) {
    // Redrock Mesa / Sunburst Gorge
    return (
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-mesa-${sectorIdx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isLater ? '#1a1026' : '#162c4a'} />
            <stop offset="55%" stopColor={isLater ? '#9a3412' : '#b45309'} />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill={`url(#sky-mesa-${sectorIdx})`} />
        <circle cx="880" cy="155" r="72" fill="#fde68a" opacity="0.28" />
        <circle cx="880" cy="155" r="44" fill="#fef3c7" opacity="0.65" />
        <path
          d="M0 320 L120 320 L145 235 L265 235 L290 295 L440 295 L470 215 L590 215 L625 310 L810 310 L850 185 L990 185 L1035 280 L1200 280 L1200 420 L0 420 Z"
          fill="#6b2e1b"
          opacity="0.72"
        />
        <path
          d="M0 365 L95 365 L130 275 L235 275 L265 345 L490 345 L535 290 L670 290 L705 355 L930 355 L970 245 L1120 245 L1155 340 L1200 340 L1200 420 L0 420 Z"
          fill="#3b160c"
        />
        <path d="M510 420 L575 305 L625 305 L690 420 Z" fill="#1e0b06" opacity="0.7" />
      </svg>
    );
  }

  if (realmId === 1) {
    // Arctic Glacier / Glacier Citadel
    return (
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-ice-${sectorIdx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isLater ? '#0b192c' : '#102a45'} />
            <stop offset="60%" stopColor="#1e4e79" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill={`url(#sky-ice-${sectorIdx})`} />
        <path d="M0 130 Q300 45 640 120 T1200 85 L1200 170 Q680 125 0 190 Z" fill="#34d399" opacity="0.16" />
        <path
          d="M0 310 L130 165 L240 275 L380 130 L515 265 L690 190 L835 295 L985 120 L1125 255 L1200 205 L1200 420 L0 420 Z"
          fill="#264b6e"
        />
        <path
          d="M0 345 L190 230 L315 335 L465 215 L600 350 L790 250 L930 340 L1080 195 L1200 320 L1200 420 L0 420 Z"
          fill="#0f253c"
        />
        <polygon points="380,130 425,180 390,175 360,195" fill="#e0f2fe" opacity="0.7" />
        <polygon points="985,120 1030,178 995,168 958,190" fill="#e0f2fe" opacity="0.7" />
      </svg>
    );
  }

  if (realmId === 2) {
    // Obsidian Caldera / Magma Core
    return (
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-lava-${sectorIdx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#090609" />
            <stop offset="65%" stopColor="#3a120a" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill={`url(#sky-lava-${sectorIdx})`} />
        <path
          d="M0 320 L140 185 L260 280 L430 140 L570 295 L740 165 L910 275 L1065 130 L1200 265 L1200 420 L0 420 Z"
          fill="#1f1110"
        />
        <path
          d="M490 420 L575 295 L625 295 L710 420 Z"
          fill="#f97316"
          opacity="0.72"
        />
        <path d="M525 420 L585 300 L615 300 L675 420 Z" fill="#fdba74" opacity="0.75" />
      </svg>
    );
  }

  if (realmId === 3) {
    // Cyber Metropolis
    return (
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-city-${sectorIdx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#070d1b" />
            <stop offset="65%" stopColor="#162442" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill={`url(#sky-city-${sectorIdx})`} />
        {[40, 120, 210, 310, 420, 740, 845, 955, 1065].map((x, idx) => (
          <g key={x}>
            <rect
              x={x}
              y={110 + ((idx * 37) % 120)}
              width={68 + (idx % 3) * 14}
              height={310}
              fill={idx % 2 === 0 ? '#0f172a' : '#172540'}
            />
            <rect
              x={x + 10}
              y={130 + ((idx * 37) % 120)}
              width={14}
              height={8}
              fill="#38bdf8"
              opacity="0.75"
            />
            <rect
              x={x + 36}
              y={160 + ((idx * 37) % 120)}
              width={14}
              height={8}
              fill="#fbbf24"
              opacity="0.65"
            />
          </g>
        ))}
        <path d="M460 420 L565 275 L635 275 L740 420 Z" fill="#090f1d" />
        <line x1="600" y1="275" x2="600" y2="420" stroke="#f59e0b" strokeWidth="4" strokeDasharray="16 14" />
      </svg>
    );
  }

  if (realmId === 4) {
    // Emerald Tropics
    return (
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-trop-${sectorIdx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f3c4a" />
            <stop offset="60%" stopColor="#2c7a7b" />
            <stop offset="100%" stopColor="#81e6d9" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill={`url(#sky-trop-${sectorIdx})`} />
        <circle cx="600" cy="230" r="68" fill="#fef08a" opacity="0.45" />
        <path
          d="M0 320 Q200 220 390 295 Q520 265 650 315 Q870 205 1200 290 L1200 420 L0 420 Z"
          fill="#14452f"
        />
        <rect x="860" y="215" width="140" height="32" fill="#274e2c" />
        <rect x="885" y="185" width="90" height="32" fill="#2f5d34" />
        <rect x="910" y="158" width="40" height="28" fill="#ca8a04" opacity="0.8" />
        <rect y="335" width="1200" height="85" fill="#0b534b" opacity="0.88" />
      </svg>
    );
  }

  // Deep Space Belt / Omega Orbit
  return (
    <svg
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-space-${sectorIdx}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#03050a" />
          <stop offset="55%" stopColor={isLater ? '#1e1b4b' : '#0f172a'} />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="1200" height="420" fill={`url(#sky-space-${sectorIdx})`} />
      <circle cx="910" cy="150" r="95" fill="#312e81" opacity="0.55" />
      <ellipse
        cx="910"
        cy="150"
        rx="165"
        ry="32"
        transform="rotate(-16 910 150)"
        fill="none"
        stroke="#818cf8"
        strokeWidth="6"
        opacity="0.45"
      />
      {[
        [110, 75, 2],
        [240, 140, 1.5],
        [360, 55, 2.2],
        [520, 110, 1.6],
        [670, 68, 2.4],
        [790, 210, 1.5],
        [1080, 90, 2],
        [165, 250, 1.8],
        [440, 260, 1.5],
      ].map(([cx, cy, r], idx) => (
        <circle key={idx} cx={cx} cy={cy} r={r} fill="#e2e8f0" opacity="0.7" />
      ))}
      <polygon points="150,275 195,245 235,280 215,325 162,315" fill="#334155" />
      <polygon points="325,215 360,198 388,225 365,252 330,242" fill="#475569" />
      <polygon points="1010,270 1065,248 1105,288 1072,332 1018,315" fill="#334155" />
    </svg>
  );
}
