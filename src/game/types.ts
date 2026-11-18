export type GamePhase = 'menu' | 'levels' | 'garage' | 'playing' | 'victory' | 'paused' | 'levelcomplete' | 'gameover';

export type PlayMode = 'solo' | 'two_player' | 'ai_compete';

export type RoundFormat = 'single' | 'bo3' | 'bo5' | 'endless';

export interface RoundFormatInfo {
  id: RoundFormat;
  label: string;
  targetWins: number;
}

export const ROUND_FORMATS: RoundFormatInfo[] = [
  { id: 'single', label: '1 Round', targetWins: 1 },
  { id: 'bo3', label: 'Best of 3', targetWins: 2 },
  { id: 'bo5', label: 'Best of 5', targetWins: 3 },
  { id: 'endless', label: 'Endless', targetWins: 1 },
];

export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'ace';

export interface AiDifficultyConfig {
  id: AiDifficulty;
  label: string;
  tagline: string;
  agilityScale: number;
  fireIntervalMult: number;
  avoidanceStrength: number;
  dodgeChance: number;
  gateSeekWeight: number;
  missileAggression: number;
  shipShape: ShipShapeId;
}

export const AI_DIFFICULTIES: AiDifficultyConfig[] = [
  {
    id: 'easy',
    label: 'Easy',
    tagline: 'Cadet Pilot · Relaxed Pace',
    agilityScale: 0.72,
    fireIntervalMult: 1.4,
    avoidanceStrength: 0.65,
    dodgeChance: 0.2,
    gateSeekWeight: 0.55,
    missileAggression: 0.3,
    shipShape: 'valkyrie',
  },
  {
    id: 'medium',
    label: 'Medium',
    tagline: 'Squadron Pilot · Balanced',
    agilityScale: 0.96,
    fireIntervalMult: 1.05,
    avoidanceStrength: 0.95,
    dodgeChance: 0.45,
    gateSeekWeight: 0.85,
    missileAggression: 0.6,
    shipShape: 'trident',
  },
  {
    id: 'hard',
    label: 'Hard',
    tagline: 'Veteran Wing · Tactical',
    agilityScale: 1.2,
    fireIntervalMult: 0.82,
    avoidanceStrength: 1.25,
    dodgeChance: 0.72,
    gateSeekWeight: 1.15,
    missileAggression: 0.85,
    shipShape: 'phantom',
  },
  {
    id: 'ace',
    label: 'Ace',
    tagline: 'Apex Rival · Relentless',
    agilityScale: 1.44,
    fireIntervalMult: 0.68,
    avoidanceStrength: 1.5,
    dodgeChance: 0.92,
    gateSeekWeight: 1.4,
    missileAggression: 1.0,
    shipShape: 'sovereign',
  },
];

export type CameraMode = 'chase' | 'cockpit' | 'wide';

export type GlowMode = 'crisp' | 'balanced' | 'vivid';

export type RealmId = 0 | 1 | 2 | 3 | 4 | 5;

export type ShipShapeId =
  | 'valkyrie'
  | 'trident'
  | 'titan'
  | 'raptor'
  | 'talon'
  | 'phantom'
  | 'corsair'
  | 'wyvern'
  | 'mantis'
  | 'seraph'
  | 'hammerhead'
  | 'eclipse'
  | 'valhalla'
  | 'chronowing'
  | 'sovereign'
  | 'hyperion';

export type ShipSkinId = 'titanium' | 'solar' | 'stealth' | 'cobalt' | 'crimson_ops' | 'emerald_ace';

export type WeaponMode = 'plasma' | 'spread' | 'beam';

export type EnemyKind = 'dart' | 'gyro' | 'monolith' | 'cruiser' | 'prism' | 'boss';

export type CollectibleKind =
  | 'shard'
  | 'overdrive'
  | 'repair'
  | 'magnet'
  | 'chronos'
  | 'coin_copper'
  | 'coin_silver'
  | 'coin_gold';

export type CoinTier = 'copper' | 'silver' | 'gold';

export interface CoinWallet {
  gold: number;
  silver: number;
  copper: number;
}

export interface CoinCost {
  tier: CoinTier;
  amount: number;
}

export type SpecialMoveId =
  | 'roll_left'
  | 'roll_right'
  | 'triple_slash'
  | 'sky_loop'
  | 'dive_emp'
  | 'apex_barrage';

export interface SpecialMoveInfo {
  id: SpecialMoveId;
  name: string;
  comboLabel: string;
  description: string;
  unlockLevel: number;
  cost: CoinCost;
  cooldownSec: number;
}

export const SPECIAL_MOVES: SpecialMoveInfo[] = [
  {
    id: 'roll_left',
    name: 'Barrel Roll Left',
    comboLabel: '2x Left (←← / AA)',
    description: '360° evasive roll left with brief shield deflect.',
    unlockLevel: 0,
    cost: { tier: 'copper', amount: 0 },
    cooldownSec: 0.5,
  },
  {
    id: 'roll_right',
    name: 'Barrel Roll Right',
    comboLabel: '2x Right (→→ / DD)',
    description: '360° evasive roll right with brief shield deflect.',
    unlockLevel: 0,
    cost: { tier: 'copper', amount: 0 },
    cooldownSec: 0.5,
  },
  {
    id: 'triple_slash',
    name: 'Sonic Side-Flip Fan',
    comboLabel: '3x Left or Right (←←← / →→→)',
    description: 'High-speed triple spin dash firing a 7-bolt plasma arc.',
    unlockLevel: 2,
    cost: { tier: 'copper', amount: 6 },
    cooldownSec: 3.0,
  },
  {
    id: 'sky_loop',
    name: 'Sky-Loop Solar Nova',
    comboLabel: '2x Up (↑↑ / WW)',
    description: 'Full vertical 360° loop unleashing a clearing shockwave.',
    unlockLevel: 4,
    cost: { tier: 'copper', amount: 15 },
    cooldownSec: 4.5,
  },
  {
    id: 'dive_emp',
    name: 'Hyper Dive-Slam EMP',
    comboLabel: '2x Down (↓↓ / SS)',
    description: 'Snap-dive pulse slowing all enemies & projectiles for 4s.',
    unlockLevel: 5,
    cost: { tier: 'copper', amount: 6 },
    cooldownSec: 5.5,
  },
  {
    id: 'apex_barrage',
    name: 'Apex Nova Barrage',
    comboLabel: 'Up-Down-Up (↑↓↑ / B)',
    description: 'Fires 8 homing hyper-missiles + 3.5s Golden Overdrive.',
    unlockLevel: 10,
    cost: { tier: 'gold', amount: 3 },
    cooldownSec: 8.0,
  },
];

export interface ShipShapeInfo {
  id: ShipShapeId;
  name: string;
  tagline: string;
  bonusHull: number;
  speedScale: number;
  unlockLevel: number | null; // null = Coins Only
  cost: CoinCost;
}

export const SHIP_SHAPES: ShipShapeInfo[] = [
  {
    id: 'valkyrie',
    name: 'Valkyrie Mk.I',
    tagline: 'Balanced Delta Interceptor',
    bonusHull: 0,
    speedScale: 1.0,
    unlockLevel: 0,
    cost: { tier: 'copper', amount: 0 },
  },
  {
    id: 'trident',
    name: 'Trident Tri-Wing',
    tagline: 'Agile 3-Blade (+15% Speed)',
    bonusHull: 0,
    speedScale: 1.15,
    unlockLevel: 0,
    cost: { tier: 'copper', amount: 0 },
  },
  {
    id: 'raptor',
    name: 'F-22 Raptor Strike',
    tagline: 'Stealth Chine (+10% Speed)',
    bonusHull: 0,
    speedScale: 1.1,
    unlockLevel: null,
    cost: { tier: 'copper', amount: 12 },
  },
  {
    id: 'titan',
    name: 'Titan Gunship',
    tagline: 'Heavy Hull (+1 Hull · Magnet)',
    bonusHull: 1,
    speedScale: 0.96,
    unlockLevel: 0,
    cost: { tier: 'copper', amount: 0 },
  },
  {
    id: 'talon',
    name: 'Talon Twin-Boom',
    tagline: 'Dual Nose Booms (+12% Speed)',
    bonusHull: 0,
    speedScale: 1.12,
    unlockLevel: null,
    cost: { tier: 'copper', amount: 20 },
  },
  {
    id: 'phantom',
    name: 'Phantom Needle',
    tagline: 'Forward-Swept (+22% Speed)',
    bonusHull: 0,
    speedScale: 1.22,
    unlockLevel: 8,
    cost: { tier: 'silver', amount: 3 },
  },
  {
    id: 'corsair',
    name: 'Corsair Gull-Wing',
    tagline: 'Inverted Gull-Wing (+1 Hull)',
    bonusHull: 1,
    speedScale: 1.06,
    unlockLevel: null,
    cost: { tier: 'silver', amount: 3 },
  },
  {
    id: 'wyvern',
    name: 'Wyvern Biplane',
    tagline: 'Dual-Deck Strut (+1 Hull · Agile)',
    bonusHull: 1,
    speedScale: 1.12,
    unlockLevel: null,
    cost: { tier: 'silver', amount: 4 },
  },
  {
    id: 'mantis',
    name: 'Mantis Split-Claw',
    tagline: 'Twin Mandibles (+18% Speed)',
    bonusHull: 0,
    speedScale: 1.18,
    unlockLevel: null,
    cost: { tier: 'silver', amount: 5 },
  },
  {
    id: 'seraph',
    name: 'Seraph Halo',
    tagline: 'Ring-Wing (+15% Score · +1 Hull)',
    bonusHull: 1,
    speedScale: 1.1,
    unlockLevel: 15,
    cost: { tier: 'silver', amount: 6 },
  },
  {
    id: 'hammerhead',
    name: 'Hammerhead Bomber',
    tagline: 'Canard Fortress (+2 Hull)',
    bonusHull: 2,
    speedScale: 0.98,
    unlockLevel: null,
    cost: { tier: 'silver', amount: 7 },
  },
  {
    id: 'eclipse',
    name: 'Eclipse Crescent',
    tagline: 'Stealth Flying Wing (+20% Speed)',
    bonusHull: 1,
    speedScale: 1.2,
    unlockLevel: null,
    cost: { tier: 'silver', amount: 9 },
  },
  {
    id: 'valhalla',
    name: 'Valhalla X-Star',
    tagline: '4-Blade Gunstar (+1 Hull · Fast)',
    bonusHull: 1,
    speedScale: 1.16,
    unlockLevel: null,
    cost: { tier: 'gold', amount: 2 },
  },
  {
    id: 'chronowing',
    name: 'Chrono-Wing Disc',
    tagline: 'Shroud Disc (+24% Speed)',
    bonusHull: 1,
    speedScale: 1.24,
    unlockLevel: null,
    cost: { tier: 'gold', amount: 4 },
  },
  {
    id: 'sovereign',
    name: 'Apex Sovereign',
    tagline: 'Quad-Ion Ace (+2 Hull)',
    bonusHull: 2,
    speedScale: 1.16,
    unlockLevel: 25,
    cost: { tier: 'gold', amount: 5 },
  },
  {
    id: 'hyperion',
    name: 'Hyperion Emperor',
    tagline: 'Flagship (+3 Hull · +18% Speed)',
    bonusHull: 3,
    speedScale: 1.18,
    unlockLevel: null,
    cost: { tier: 'gold', amount: 8 },
  },
];

export interface ShipSkinInfo {
  id: ShipSkinId;
  name: string;
  hullColor: number;
  trimColor: number;
  flameColor: number;
  swatchHex: string;
}

export const SHIP_SKINS: ShipSkinInfo[] = [
  {
    id: 'titanium',
    name: 'Titanium',
    hullColor: 0xcbd5e1,
    trimColor: 0x0284c7,
    flameColor: 0x38bdf8,
    swatchHex: '#CBD5E1',
  },
  {
    id: 'solar',
    name: 'Desert Gold',
    hullColor: 0xe7d3a8,
    trimColor: 0xd97706,
    flameColor: 0xf59e0b,
    swatchHex: '#D97706',
  },
  {
    id: 'stealth',
    name: 'Graphite',
    hullColor: 0x262e3d,
    trimColor: 0x38bdf8,
    flameColor: 0x0ea5e9,
    swatchHex: '#334155',
  },
  {
    id: 'cobalt',
    name: 'Naval Blue',
    hullColor: 0x294b82,
    trimColor: 0x94a3b8,
    flameColor: 0x60a5fa,
    swatchHex: '#2563EB',
  },
  {
    id: 'crimson_ops',
    name: 'Olive Tactical',
    hullColor: 0x4b5842,
    trimColor: 0xd97706,
    flameColor: 0xfbbf24,
    swatchHex: '#4B5842',
  },
  {
    id: 'emerald_ace',
    name: 'Arctic White',
    hullColor: 0xe2e8f0,
    trimColor: 0x0f766e,
    flameColor: 0x14b8a6,
    swatchHex: '#0F766E',
  },
];

export interface LevelConfig {
  id: number; // 1..100 for Campaign, 0 for Endless
  name: string;
  subtitle: string;
  realmId: RealmId;
  durationSec: number;
  baseSpeed: number;
  enemyInterval: number;
  obstacleInterval: number;
  bossName: string;
  bossHp: number;
  star2Score: number;
  star3Score: number;
  allowedEnemies: EnemyKind[];
}

export const SECTOR_NAMES = [
  'Redrock Mesa',
  'Arctic Fjord',
  'Obsidian Caldera',
  'Metro Skyline',
  'Emerald Tropics',
  'Asteroid Belt',
  'Sunburst Gorge',
  'Glacier Citadel',
  'Magma Core',
  'Omega Orbit',
];

const BOSS_TITLES = [
  'Sentinel Warden',
  'Cryo Arbiter',
  'Obsidian Bastion',
  'Skyline Enforcer',
  'Solaris Dreadnought',
  'Omega Sovereign',
];

export function getLevelConfig(levelId: number): LevelConfig {
  if (levelId === 0) {
    return {
      id: 0,
      name: 'Endless Overdrive',
      subtitle: 'Infinite Waves & Escalating Bosses',
      realmId: 0,
      durationSec: 0,
      baseSpeed: 64,
      enemyInterval: 1.4,
      obstacleInterval: 2.8,
      bossName: 'Apex Dreadnought',
      bossHp: 100,
      star2Score: 15000,
      star3Score: 30000,
      allowedEnemies: ['dart', 'prism', 'gyro', 'monolith', 'cruiser'],
    };
  }

  const clamped = Math.max(1, Math.min(100, levelId));
  const sectorIdx = Math.floor((clamped - 1) / 10);
  const stageInSector = ((clamped - 1) % 10) + 1;
  const realmId = (sectorIdx % 6) as RealmId;
  const sectorName = SECTOR_NAMES[sectorIdx];

  const allowedEnemies: EnemyKind[] = ['dart', 'prism'];
  if (clamped >= 2) allowedEnemies.push('gyro');
  if (clamped >= 3) allowedEnemies.push('monolith');
  if (clamped >= 4) allowedEnemies.push('cruiser');

  const isMajorBoss = clamped % 10 === 0 || clamped === 100;
  const bossTitle = BOSS_TITLES[Math.min(BOSS_TITLES.length - 1, Math.floor((clamped - 1) / 16))];

  return {
    id: clamped,
    name: `${sectorName} ${sectorIdx + 1}-${stageInSector}`,
    subtitle: isMajorBoss ? 'Sector Dreadnought Showdown' : `Sector ${sectorIdx + 1} · Stage ${stageInSector}`,
    realmId,
    durationSec: Math.min(80, 38 + Math.floor(clamped * 0.42)),
    baseSpeed: Math.min(118, 62 + clamped * 0.56),
    enemyInterval: Math.max(0.52, 1.65 - clamped * 0.011),
    obstacleInterval: Math.max(1.3, 3.4 - clamped * 0.021),
    bossName: clamped === 100 ? 'Emperor Omega Dreadnought' : `${bossTitle} Mk.${clamped}`,
    bossHp: Math.round(60 + clamped * 7.5 + (isMajorBoss ? 40 : 0)),
    star2Score: 5000 + clamped * 450,
    star3Score: 9000 + clamped * 750,
    allowedEnemies,
  };
}

export function getArenaRoundConfig(
  roundNum: number,
  realmId: RealmId,
  isEndless: boolean
): LevelConfig {
  if (isEndless) {
    return {
      ...getLevelConfig(0),
      name: 'Arena Endless Duel',
      subtitle: 'Continuous Head-to-Head',
      realmId,
    };
  }
  const r = Math.max(1, roundNum);
  return {
    id: 0,
    name: `Arena Round ${r}`,
    subtitle: 'Competitive Head-to-Head',
    realmId,
    durationSec: 40,
    baseSpeed: Math.min(92, 66 + (r - 1) * 5),
    enemyInterval: Math.max(0.75, 1.18 - (r - 1) * 0.06),
    obstacleInterval: Math.max(1.8, 2.5 - (r - 1) * 0.1),
    bossName: `Arena Dreadnought R${r}`,
    bossHp: 85 + (r - 1) * 20,
    star2Score: 5000,
    star3Score: 9000,
    allowedEnemies: ['dart', 'gyro', 'cruiser', 'prism'],
  };
}

export interface LevelRecord {
  bestScore: number;
  stars: number; // 0..3
}

export interface MilestoneProgress {
  totalKills: number;
  totalGates: number;
  totalShards: number;
  highestLevelCleared: number;
  rewardedMilestones: string[];
}

export type WorldPropKind = 'mesa' | 'glacier' | 'basalt' | 'skyscraper' | 'temple' | 'asteroid';

export interface RealmTheme {
  id: RealmId;
  name: string;
  propKind: WorldPropKind;
  hasTerrain: boolean;
  valleyFloorType: 'none' | 'ice' | 'lava' | 'highway' | 'ocean';
  skyTop: string;
  skyHorizon: string;
  fogColor: number;
  fogDensity: number;
  keyLightColor: number;
  keyLightIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  rimLightColor: number;
  terrainLowColor: [number, number, number];
  terrainHighColor: [number, number, number];
  terrainSecondary: number;
  terrainGrid: number;
  terrainWireOpacity: number;
  accentHex: string;
  accentColor: number;
}

export const REALM_THEMES: RealmTheme[] = [
  {
    id: 0,
    name: 'Redrock Canyon',
    propKind: 'mesa',
    hasTerrain: true,
    valleyFloorType: 'none',
    skyTop: '#1c3b63',
    skyHorizon: '#d98a5f',
    fogColor: 0xc9825c,
    fogDensity: 0.0042,
    keyLightColor: 0xffe4b8,
    keyLightIntensity: 2.35,
    hemiSkyColor: 0x8cb8e8,
    hemiGroundColor: 0x6b3a28,
    rimLightColor: 0xffb36b,
    terrainLowColor: [0.36, 0.21, 0.14],
    terrainHighColor: [0.68, 0.36, 0.22],
    terrainSecondary: 0x8f4729,
    terrainGrid: 0xf59e0b,
    terrainWireOpacity: 0.0,
    accentHex: '#EA580C',
    accentColor: 0xb45309,
  },
  {
    id: 1,
    name: 'Arctic Glacier',
    propKind: 'glacier',
    hasTerrain: true,
    valleyFloorType: 'ice',
    skyTop: '#163554',
    skyHorizon: '#a7cde6',
    fogColor: 0x9ac1db,
    fogDensity: 0.0044,
    keyLightColor: 0xf8fbff,
    keyLightIntensity: 2.2,
    hemiSkyColor: 0xbfe2ff,
    hemiGroundColor: 0x3b5875,
    rimLightColor: 0x7dd3fc,
    terrainLowColor: [0.34, 0.46, 0.58],
    terrainHighColor: [0.78, 0.86, 0.94],
    terrainSecondary: 0x5c85a6,
    terrainGrid: 0x38bdf8,
    terrainWireOpacity: 0.0,
    accentHex: '#38BDF8',
    accentColor: 0x7dd3fc,
  },
  {
    id: 2,
    name: 'Obsidian Caldera',
    propKind: 'basalt',
    hasTerrain: true,
    valleyFloorType: 'lava',
    skyTop: '#0d090c',
    skyHorizon: '#421a12',
    fogColor: 0x2e130e,
    fogDensity: 0.0046,
    keyLightColor: 0xffb07a,
    keyLightIntensity: 2.1,
    hemiSkyColor: 0x5e3c38,
    hemiGroundColor: 0x451408,
    rimLightColor: 0xf97316,
    terrainLowColor: [0.11, 0.09, 0.1],
    terrainHighColor: [0.24, 0.17, 0.16],
    terrainSecondary: 0x262124,
    terrainGrid: 0xf97316,
    terrainWireOpacity: 0.0,
    accentHex: '#F97316',
    accentColor: 0xea580c,
  },
  {
    id: 3,
    name: 'Cyber Metropolis',
    propKind: 'skyscraper',
    hasTerrain: true,
    valleyFloorType: 'highway',
    skyTop: '#0b1224',
    skyHorizon: '#2a3554',
    fogColor: 0x1d2640,
    fogDensity: 0.0042,
    keyLightColor: 0xdbeafe,
    keyLightIntensity: 2.0,
    hemiSkyColor: 0x64748b,
    hemiGroundColor: 0x1e293b,
    rimLightColor: 0x38bdf8,
    terrainLowColor: [0.12, 0.14, 0.18],
    terrainHighColor: [0.22, 0.25, 0.32],
    terrainSecondary: 0x334155,
    terrainGrid: 0x06b6d4,
    terrainWireOpacity: 0.02,
    accentHex: '#06B6D4',
    accentColor: 0x38bdf8,
  },
  {
    id: 4,
    name: 'Emerald Tropics',
    propKind: 'temple',
    hasTerrain: true,
    valleyFloorType: 'ocean',
    skyTop: '#164d5e',
    skyHorizon: '#8dd4c5',
    fogColor: 0x74bfb4,
    fogDensity: 0.0042,
    keyLightColor: 0xfff1c9,
    keyLightIntensity: 2.35,
    hemiSkyColor: 0x99f6e4,
    hemiGroundColor: 0x1d4034,
    rimLightColor: 0xfde047,
    terrainLowColor: [0.11, 0.26, 0.17],
    terrainHighColor: [0.23, 0.48, 0.27],
    terrainSecondary: 0x365e39,
    terrainGrid: 0x10b981,
    terrainWireOpacity: 0.0,
    accentHex: '#10B981',
    accentColor: 0xca8a04,
  },
  {
    id: 5,
    name: 'Deep Space Belt',
    propKind: 'asteroid',
    hasTerrain: false,
    valleyFloorType: 'none',
    skyTop: '#03050a',
    skyHorizon: '#101b33',
    fogColor: 0x080f1f,
    fogDensity: 0.0026,
    keyLightColor: 0xf1f5f9,
    keyLightIntensity: 2.3,
    hemiSkyColor: 0x60a5fa,
    hemiGroundColor: 0x1e1b4b,
    rimLightColor: 0xa78bfa,
    terrainLowColor: [0.12, 0.14, 0.18],
    terrainHighColor: [0.26, 0.28, 0.34],
    terrainSecondary: 0x475569,
    terrainGrid: 0x818cf8,
    terrainWireOpacity: 0.0,
    accentHex: '#818CF8',
    accentColor: 0x64748b,
  },
];

export interface BossHudInfo {
  name: string;
  hp: number;
  maxHp: number;
}

export interface FloatingPopup {
  id: number;
  text: string;
  x: number;
  y: number;
  tone: 'good' | 'power' | 'bad' | 'coin';
  age: number;
}

export interface RivalHudSnapshot {
  name: string;
  isAi: boolean;
  alive: boolean;
  shipShape: ShipShapeId;
  score: number;
  combo: number;
  multiplier: number;
  hull: number;
  maxHull: number;
  boostEnergy: number;
  missileReady: number;
  overdriveTimer: number;
  kills: number;
  ringsCleared: number;
  screenX: number | null;
  screenY: number | null;
}

export interface MatchResult {
  winner: 'p1' | 'rival' | 'draw';
  reason: string;
  p1Score: number;
  rivalScore: number;
  p1Kills: number;
  rivalKills: number;
  p1Rings: number;
  rivalRings: number;
  isSeriesFinal: boolean;
  roundNumber: number;
  p1RoundWins: number;
  rivalRoundWins: number;
  targetWins: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  playMode: PlayMode;
  aiDifficulty: AiDifficulty;
  p2ShipShape: ShipShapeId;
  aiShipShape: ShipShapeId;
  roundFormat: RoundFormat;
  roundNumber: number;
  p1RoundWins: number;
  rivalRoundWins: number;
  levelId: number;
  levelName: string;
  levelProgress: number;
  score: number;
  highScore: number;
  combo: number;
  comboTimer: number;
  multiplier: number;
  wave: number;
  hull: number;
  maxHull: number;
  boostEnergy: number;
  missileReady: number;
  overdriveTimer: number;
  magnetTimer: number;
  chronosTimer: number;
  speedKmh: number;
  kills: number;
  ringsCleared: number;
  earnedStars: number;
  levelRecords: Record<number, LevelRecord>;
  wallet: CoinWallet;
  milestones: MilestoneProgress;
  unlockedMoves: SpecialMoveId[];
  unlockedShips: ShipShapeId[];
  moveCooldowns: Record<SpecialMoveId, number>;
  activeInputBuffer: string;
  cameraMode: CameraMode;
  glowMode: GlowMode;
  realmId: RealmId;
  shipShape: ShipShapeId;
  previewShipShape: ShipShapeId;
  previewRivalShipShape: ShipShapeId;
  shipSkin: ShipSkinId;
  weaponMode: WeaponMode;
  autoFire: boolean;
  muted: boolean;
  boss: BossHudInfo | null;
  rival: RivalHudSnapshot | null;
  matchResult: MatchResult | null;
  bannerText: string | null;
  rewardNotice: string | null;
  webglError: string | null;
}

export interface TargetReticle {
  id: number;
  x: number;
  y: number;
  locked: boolean;
  kind: EnemyKind;
}
