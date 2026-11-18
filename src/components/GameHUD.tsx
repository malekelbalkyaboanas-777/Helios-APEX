import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Lock,
  Magnet,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trophy,
  User,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  AI_DIFFICULTIES,
  AiDifficulty,
  CoinCost,
  CoinTier,
  FloatingPopup,
  GlowMode,
  HudSnapshot,
  PlayMode,
  REALM_THEMES,
  RealmId,
  ROUND_FORMATS,
  RoundFormat,
  SECTOR_NAMES,
  SHIP_SHAPES,
  SHIP_SKINS,
  SPECIAL_MOVES,
  ShipShapeId,
  ShipSkinId,
  SpecialMoveId,
  TargetReticle,
  getLevelConfig,
} from '../game/types';
import { SectorCardArt } from './SectorCardArt';

interface GameHUDProps {
  hud: HudSnapshot;
  reticles: TargetReticle[];
  popups: FloatingPopup[];
  onStart: (levelId?: number) => void;
  onNextLevel: () => void;
  onNextRound: () => void;
  onSelectLevel: (levelId: number) => void;
  onSelectPlayMode: (mode: PlayMode) => void;
  onSelectAiDifficulty: (diff: AiDifficulty) => void;
  onSelectP1Ship: (shape: ShipShapeId) => void;
  onSelectP2Ship: (shape: ShipShapeId) => void;
  onSelectAiShip: (shape: ShipShapeId) => void;
  onSelectRoundFormat: (format: RoundFormat) => void;
  onSelectRealm: (id: RealmId) => void;
  onOpenLevels: () => void;
  onCloseLevels: () => void;
  onOpenGarage: () => void;
  onCloseGarage: () => void;
  onPreviewShip: (shape: ShipShapeId, pilot?: 'p1' | 'rival') => void;
  onUnlockShip: (shape: ShipShapeId, pilot?: 'p1' | 'rival') => void;
  onSelectShipSkin: (skin: ShipSkinId) => void;
  onSelectGlow: (mode: GlowMode) => void;
  onUnlockMove: (moveId: SpecialMoveId) => void;
  onTriggerSpecialMove: (moveId: SpecialMoveId) => void;
  onPause: () => void;
  onResume: () => void;
  onSkipVictory: () => void;
  onReturnMenu: () => void;
  onFireMissiles: () => void;
  onBarrelRoll: () => void;
}

type GarageTab = 'planes' | 'paint' | 'moves';

const GLOW_MODES: Array<{ id: GlowMode; label: string }> = [
  { id: 'crisp', label: 'Crisp' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'vivid', label: 'Vivid' },
];

const LEVEL_MILESTONE_CARDS = [
  { key: 'lvl5', level: 5, reward: '10 Silver' },
  { key: 'lvl10', level: 10, reward: '5 Gold' },
  { key: 'lvl25', level: 25, reward: '10 Gold' },
  { key: 'lvl50', level: 50, reward: '15 Gold' },
  { key: 'lvl100', level: 100, reward: '30 Gold' },
];

function walletTotalCopper(gold: number, silver: number, copper: number): number {
  return gold * 100 + silver * 10 + copper;
}

function costToCopper(cost: CoinCost): number {
  if (cost.tier === 'gold') return cost.amount * 100;
  if (cost.tier === 'silver') return cost.amount * 10;
  return cost.amount;
}

function formatCost(cost: CoinCost): string {
  const unit = cost.tier === 'gold' ? 'Gold' : cost.tier === 'silver' ? 'Silver' : 'Copper';
  return `${cost.amount} ${unit}`;
}

function tierTextClass(tier: CoinTier): string {
  if (tier === 'gold') return 'text-yellow-300';
  if (tier === 'silver') return 'text-slate-200';
  return 'text-amber-500';
}

function moveShortCombo(id: SpecialMoveId): string {
  switch (id) {
    case 'roll_left':
      return '←←';
    case 'roll_right':
      return '→→';
    case 'triple_slash':
      return '←←← / →→→';
    case 'sky_loop':
      return '↑↑';
    case 'dive_emp':
      return '↓↓';
    case 'apex_barrage':
      return '↑↓↑ / B';
  }
}

export function GameHUD({
  hud,
  reticles,
  popups,
  onStart,
  onNextLevel,
  onNextRound,
  onSelectLevel,
  onSelectPlayMode,
  onSelectAiDifficulty,
  onSelectP1Ship,
  onSelectP2Ship,
  onSelectAiShip,
  onSelectRoundFormat,
  onSelectRealm,
  onOpenLevels,
  onCloseLevels,
  onOpenGarage,
  onCloseGarage,
  onPreviewShip,
  onUnlockShip,
  onSelectShipSkin,
  onSelectGlow,
  onUnlockMove,
  onTriggerSpecialMove,
  onPause,
  onResume,
  onSkipVictory,
  onReturnMenu,
  onFireMissiles,
  onBarrelRoll,
}: GameHUDProps) {
  const [garageTab, setGarageTab] = useState<GarageTab>('planes');
  const [sectorIdx, setSectorIdx] = useState<number>(() =>
    hud.levelId > 0 ? Math.floor((hud.levelId - 1) / 10) : 0
  );
  const [modeTab, setModeTab] = useState<'campaign' | 'endless'>(() =>
    hud.levelId === 0 ? 'endless' : 'campaign'
  );

  const totalCopper = walletTotalCopper(hud.wallet.gold, hud.wallet.silver, hud.wallet.copper);
  const selectedLevelCfg = getLevelConfig(hud.levelId);
  const sectorStart = sectorIdx * 10 + 1;
  const sectorEnd = sectorStart + 9;
  const sectorLevels = Array.from({ length: 10 }, (_, i) => sectorStart + i);
  const sectorRealmId = (sectorIdx % 6) as RealmId;
  const sectorTheme = REALM_THEMES[sectorRealmId];

  const isLevelUnlocked = (lvl: number) =>
    lvl <= 1 || Boolean(hud.levelRecords[lvl - 1]) || lvl - 1 <= hud.milestones.highestLevelCleared;

  const equippedShipMeta = SHIP_SHAPES.find((s) => s.id === hud.shipShape) || SHIP_SHAPES[0];
  const previewShipMeta = SHIP_SHAPES.find((s) => s.id === hud.previewShipShape) || SHIP_SHAPES[0];
  const previewUnlocked = hud.unlockedShips.includes(previewShipMeta.id);
  const previewEquipped = hud.shipShape === previewShipMeta.id;
  const previewAffordable = totalCopper >= costToCopper(previewShipMeta.cost);

  const equippedRivalId = hud.playMode === 'ai_compete' ? hud.aiShipShape : hud.p2ShipShape;
  const previewRivalMeta = SHIP_SHAPES.find((s) => s.id === hud.previewRivalShipShape) || SHIP_SHAPES[1];
  const previewRivalUnlocked = hud.unlockedShips.includes(previewRivalMeta.id);
  const previewRivalEquipped = equippedRivalId === previewRivalMeta.id;
  const previewRivalAffordable = totalCopper >= costToCopper(previewRivalMeta.cost);

  const activeDiff = AI_DIFFICULTIES.find((d) => d.id === hud.aiDifficulty) || AI_DIFFICULTIES[1];
  const activeRoundFormat = ROUND_FORMATS.find((f) => f.id === hud.roundFormat) || ROUND_FORMATS[0];
  const activeArenaRealm = REALM_THEMES[hud.realmId] || REALM_THEMES[0];
  const aiShipMeta = SHIP_SHAPES.find((s) => s.id === hud.aiShipShape) || SHIP_SHAPES[0];
  const p2ShipMeta = SHIP_SHAPES.find((s) => s.id === hud.p2ShipShape) || SHIP_SHAPES[0];
  const rivalShipMeta = hud.rival
    ? SHIP_SHAPES.find((s) => s.id === hud.rival?.shipShape) || SHIP_SHAPES[0]
    : hud.playMode === 'ai_compete'
      ? aiShipMeta
      : p2ShipMeta;

  const unlockedShipsList = hud.unlockedShips.length > 0 ? hud.unlockedShips : (['valkyrie'] as ShipShapeId[]);

  const stepShip = (current: ShipShapeId, dir: number, onPick: (id: ShipShapeId) => void) => {
    const idx = Math.max(0, unlockedShipsList.indexOf(current));
    const next = unlockedShipsList[(idx + dir + unlockedShipsList.length) % unlockedShipsList.length];
    onPick(next);
  };

  const playLaunchLabel = () => {
    if (hud.playMode === 'two_player') {
      return hud.roundFormat === 'endless'
        ? 'Start 2P Endless Duel'
        : `Start 2P Duel · ${activeRoundFormat.label}`;
    }
    if (hud.playMode === 'ai_compete') {
      return hud.roundFormat === 'endless'
        ? `Start vs ${activeDiff.label} AI`
        : `Start vs ${activeDiff.label} AI · ${activeRoundFormat.label}`;
    }
    return hud.levelId === 0 ? 'Play Endless Mode' : `Play Level ${hud.levelId}`;
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
      {/* Screen-Projected Enemy Target Lock Reticles, Rival Marker & Floating Score Popups */}
      {(hud.phase === 'playing' || hud.phase === 'victory') && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {hud.phase === 'playing' &&
            reticles.map((r) => (
              <div
                key={r.id}
                style={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <div
                  className={`border transition-transform ${
                    r.kind === 'boss'
                      ? 'w-16 h-16 border-rose-500 border-2'
                      : r.locked
                        ? 'w-8 h-8 border-rose-500 border-2 rotate-45'
                        : 'w-7 h-7 border-rose-400/75'
                  }`}
                />
              </div>
            ))}

          {hud.phase === 'playing' &&
            hud.rival &&
            hud.rival.alive &&
            hud.rival.screenX !== null &&
            hud.rival.screenY !== null && (
              <div
                style={{
                  left: `${hud.rival.screenX * 100}%`,
                  top: `${hud.rival.screenY * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-full -mt-7"
              >
                <div className="px-2 py-0.5 rounded-md bg-[#070b14]/92 border border-orange-400/80 text-orange-300 text-[10px] font-display font-bold tracking-wide whitespace-nowrap shadow-lg">
                  {hud.rival.isAi ? `AI · ${hud.aiDifficulty.toUpperCase()}` : 'P2'}
                </div>
              </div>
            )}

          {popups.map((p) => (
            <div
              key={p.id}
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                opacity: Math.max(0, 1 - p.age),
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 font-display font-bold text-sm tracking-wide whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${
                p.tone === 'bad'
                  ? 'text-rose-400 text-base'
                  : p.tone === 'coin'
                    ? 'text-yellow-300 text-base'
                    : p.tone === 'power'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
              }`}
            >
              {p.text}
            </div>
          ))}
        </div>
      )}

      {/* VICTORY ASCENT OVERLAY (RETURNING FROM BATTLE) */}
      {hud.phase === 'victory' && (
        <div className="flex-1 flex flex-col items-center justify-between py-8 px-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-[#070b14]/92 border border-emerald-400/55 rounded-2xl shadow-xl">
              <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-display text-sm sm:text-base font-extrabold tracking-wide text-emerald-300 uppercase">
                {hud.playMode === 'solo'
                  ? `Level ${hud.levelId} Clear · Returning From Battle`
                  : `Round ${hud.roundNumber} Clear · Returning From Battle`}
              </span>
            </div>
            {hud.rewardNotice && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0a131f]/95 border border-yellow-400/50 rounded-xl text-xs font-display font-semibold text-yellow-300 shadow-lg">
                <Coins className="w-3.5 h-3.5 shrink-0" />
                <span>{hud.rewardNotice}</span>
              </div>
            )}
          </div>

          <div className="pointer-events-auto mb-6">
            <button
              type="button"
              onClick={onSkipVictory}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold text-slate-200 bg-[#070b14]/88 hover:bg-[#0c1424] border border-white/20 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* IN-FLIGHT / PAUSE / GAMEOVER TOP BAR */}
      {(hud.phase === 'playing' || hud.phase === 'paused' || hud.phase === 'levelcomplete' || hud.phase === 'gameover') &&
        (hud.playMode !== 'solo' && hud.rival ? (
          <header className="flex items-start justify-between gap-3 p-3 sm:p-5">
            {/* LEFT: PLAYER 1 CARD (CYAN) */}
            <div className="flex flex-col gap-2">
              <div className="pointer-events-auto bg-[#070b14]/90 border border-cyan-400/45 rounded-xl px-3.5 py-2.5 min-w-[225px] max-w-[260px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 text-[10px] font-display font-extrabold rounded bg-cyan-400 text-slate-950 shrink-0">
                      P1
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {equippedShipMeta.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono-tabular shrink-0">
                    {hud.kills}K · {hud.ringsCleared}G
                  </span>
                </div>

                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="text-2xl font-display font-bold tracking-tight text-white font-mono-tabular">
                    {hud.score.toLocaleString()}
                  </div>
                  {hud.combo > 1 && (
                    <span className="text-[11px] font-semibold text-emerald-400 font-mono-tabular whitespace-nowrap">
                      {hud.multiplier}x Combo
                    </span>
                  )}
                </div>

                <div
                  className="mt-2 grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${hud.maxHull}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: hud.maxHull }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-sm transition-colors ${
                        idx < hud.hull ? (hud.hull <= 2 ? 'bg-rose-500' : 'bg-cyan-400') : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Boost</span>
                      <span className="font-mono-tabular text-slate-200">{hud.boostEnergy}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${hud.boostEnergy}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Missiles</span>
                      <span className="font-mono-tabular text-slate-200">{hud.missileReady}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${hud.missileReady >= 100 ? 'bg-amber-400' : 'bg-cyan-500'}`}
                        style={{ width: `${hud.missileReady}%` }}
                      />
                    </div>
                  </div>
                </div>

                {hud.playMode === 'two_player' ? (
                  <div className="mt-1.5 text-[10px] text-cyan-300/90 font-mono-tabular">
                    WASD · L-Shift · F/Q/E
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onFireMissiles}
                      disabled={hud.missileReady < 100}
                      className={`flex-1 py-1 px-2 text-[10px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        hud.missileReady >= 100
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Salvo (F)
                    </button>
                    <button
                      type="button"
                      onClick={onBarrelRoll}
                      className="flex-1 py-1 px-2 text-[10px] font-semibold rounded-md bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Roll (E)
                    </button>
                  </div>
                )}
              </div>

              {hud.phase === 'playing' && hud.playMode === 'ai_compete' && (
                <div className="hidden lg:block pointer-events-auto bg-[#070b14]/84 border border-white/12 rounded-xl px-3 py-2 w-[236px]">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">Special Moves</span>
                    {hud.activeInputBuffer && (
                      <span className="font-mono-tabular text-cyan-300 font-bold">{hud.activeInputBuffer}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {SPECIAL_MOVES.map((m) => {
                      const unlocked = hud.unlockedMoves.includes(m.id);
                      const cd = hud.moveCooldowns[m.id] || 0;
                      const ready = unlocked && cd <= 0.05;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!ready}
                          onClick={() => onTriggerSpecialMove(m.id)}
                          title={`${m.name} (${m.comboLabel})`}
                          className={`flex items-center justify-between gap-1 px-2 py-1 rounded-md border text-[10px] transition-colors whitespace-nowrap ${
                            !unlocked
                              ? 'bg-white/3 border-white/8 text-slate-600 cursor-not-allowed'
                              : ready
                                ? 'bg-cyan-500/12 border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/25 cursor-pointer'
                                : 'bg-white/5 border-white/10 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="truncate font-semibold">{moveShortCombo(m.id)}</span>
                          <span className="font-mono-tabular shrink-0">
                            {!unlocked ? <Lock className="w-2.5 h-2.5" /> : cd > 0.05 ? `${cd.toFixed(1)}s` : 'RDY'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CENTER: VS SCOREBOARD, BOSS, BANNERS & PAUSE */}
            <div className="flex flex-col items-center gap-2 max-w-md w-full px-1">
              <div className="pointer-events-auto flex items-center gap-2.5 bg-[#070b14]/90 border border-white/15 rounded-xl px-3.5 py-2 shadow-lg">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">P1</div>
                  <div className="text-sm font-display font-extrabold text-white font-mono-tabular">
                    {hud.score.toLocaleString()}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-white/8 border border-white/12 text-[10px] font-display font-extrabold text-amber-300">
                  VS
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-orange-300 font-semibold">
                    {hud.rival.isAi ? `AI (${hud.aiDifficulty})` : 'P2'}
                  </div>
                  <div className="text-sm font-display font-extrabold text-white font-mono-tabular">
                    {hud.rival.score.toLocaleString()}
                  </div>
                </div>
                {hud.phase === 'playing' && (
                  <button
                    type="button"
                    onClick={onPause}
                    aria-label="Pause Game"
                    className="ml-1 p-1.5 bg-white/6 border border-white/15 rounded-lg text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer shrink-0"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
              </div>

              {hud.roundFormat !== 'endless' && !hud.boss && (
                <div className="w-full max-w-[275px] bg-[#070b14]/86 border border-white/12 rounded-lg px-3 py-1">
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span className="truncate font-semibold">
                      {activeRoundFormat.targetWins > 1
                        ? `Round ${hud.roundNumber} · Series ${hud.p1RoundWins}–${hud.rivalRoundWins}`
                        : `Round ${hud.roundNumber} · ${activeArenaRealm.name}`}
                    </span>
                    <span className="font-mono-tabular ml-2">{Math.round(hud.levelProgress * 100)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-100"
                      style={{ width: `${Math.round(hud.levelProgress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {hud.roundFormat === 'endless' && !hud.boss && (
                <div className="px-3 py-1 rounded-lg bg-[#070b14]/86 border border-white/12 text-[10px] font-semibold text-cyan-300">
                  Arena Endless · Wave {hud.wave}
                </div>
              )}

              {hud.boss && (
                <div className="w-full bg-[#070b14]/92 border border-rose-500/50 rounded-xl px-4 py-2">
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="font-display font-semibold text-rose-400">{hud.boss.name}</span>
                    <span className="font-mono-tabular text-slate-300">
                      {Math.ceil(hud.boss.hp)} / {hud.boss.maxHp}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-100"
                      style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {hud.rewardNotice && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0a131f]/95 border border-yellow-400/50 rounded-xl text-xs font-display font-semibold text-yellow-300 shadow-lg">
                  <Coins className="w-3.5 h-3.5 shrink-0" />
                  <span>{hud.rewardNotice}</span>
                </div>
              )}

              {hud.bannerText && (
                <div className="px-5 py-2 bg-[#070b14]/92 border border-amber-400/45 rounded-xl text-sm font-display font-semibold tracking-wide text-amber-300 text-center">
                  {hud.bannerText}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                {hud.overdriveTimer > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/50 rounded-lg text-xs font-semibold text-amber-300 font-mono-tabular">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Overdrive {hud.overdriveTimer.toFixed(1)}s</span>
                  </div>
                )}
                {hud.magnetTimer > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-400/50 rounded-lg text-xs font-semibold text-purple-300 font-mono-tabular">
                    <Magnet className="w-3.5 h-3.5" />
                    <span>Magnet {hud.magnetTimer.toFixed(1)}s</span>
                  </div>
                )}
                {hud.chronosTimer > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-lg text-xs font-semibold text-cyan-300 font-mono-tabular">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time Slow {hud.chronosTimer.toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: RIVAL CARD (P2 OR AI - SOLAR ORANGE) */}
            <div className="pointer-events-auto bg-[#070b14]/90 border border-orange-400/45 rounded-xl px-3.5 py-2.5 min-w-[225px] max-w-[260px]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 text-[10px] font-display font-extrabold rounded bg-orange-400 text-slate-950 shrink-0 whitespace-nowrap">
                    {hud.rival.isAi ? `AI · ${hud.aiDifficulty.toUpperCase()}` : 'P2'}
                  </span>
                  <span className="text-xs font-semibold text-white truncate">
                    {rivalShipMeta.name}
                  </span>
                </div>
                {!hud.rival.alive ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/25 text-rose-300 shrink-0">
                    DOWN
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono-tabular shrink-0">
                    {hud.rival.kills}K · {hud.rival.ringsCleared}G
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="text-2xl font-display font-bold tracking-tight text-white font-mono-tabular">
                  {hud.rival.score.toLocaleString()}
                </div>
                {hud.rival.combo > 1 && (
                  <span className="text-[11px] font-semibold text-orange-300 font-mono-tabular whitespace-nowrap">
                    {hud.rival.multiplier}x Combo
                  </span>
                )}
              </div>

              <div
                className="mt-2 grid gap-1"
                style={{ gridTemplateColumns: `repeat(${hud.rival.maxHull}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: hud.rival.maxHull }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-sm transition-colors ${
                      idx < hud.rival!.hull
                        ? hud.rival!.hull <= 2
                          ? 'bg-rose-500'
                          : 'bg-orange-400'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Boost</span>
                    <span className="font-mono-tabular text-slate-200">{hud.rival.boostEnergy}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400" style={{ width: `${hud.rival.boostEnergy}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Missiles</span>
                    <span className="font-mono-tabular text-slate-200">{hud.rival.missileReady}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${hud.rival.missileReady >= 100 ? 'bg-amber-400' : 'bg-orange-500'}`}
                      style={{ width: `${hud.rival.missileReady}%` }}
                    />
                  </div>
                </div>
              </div>

              {hud.playMode === 'two_player' ? (
                <div className="mt-1.5 text-[10px] text-orange-300/90 font-mono-tabular">
                  Arrows · R-Shift · Enter/M
                </div>
              ) : (
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Autonomous Rival</span>
                  <span className="font-mono-tabular text-orange-300">{activeDiff.tagline.split('·')[0].trim()}</span>
                </div>
              )}
            </div>
          </header>
        ) : (
          <header className="flex items-start justify-between gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2.5">
            <div className="pointer-events-auto bg-[#070b14]/88 border border-white/12 rounded-xl px-4 py-3 min-w-[236px]">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-400">
                  {hud.levelId === 0 ? `Endless · Wave ${hud.wave}` : `Lvl ${hud.levelId} · ${hud.levelName}`}
                </span>
                <span className="text-xs text-slate-400 font-mono-tabular">
                  Best {hud.highScore.toLocaleString()}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white font-mono-tabular">
                {hud.score.toLocaleString()}
              </div>

              <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono-tabular">
                <span className="inline-flex items-center gap-1 text-yellow-300">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  {hud.wallet.gold} Au
                </span>
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  {hud.wallet.silver} Ag
                </span>
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  {hud.wallet.copper} Cu
                </span>
              </div>

              {hud.levelId > 0 && !hud.boss && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                    <span>Boss Approach</span>
                    <span className="font-mono-tabular">{Math.round(hud.levelProgress * 100)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-100"
                      style={{ width: `${Math.round(hud.levelProgress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {hud.combo > 1 && (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 font-mono-tabular">
                      {hud.multiplier}x Combo · {hud.combo} chain
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.round(hud.comboTimer * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {hud.phase === 'playing' && (
              <div className="hidden sm:block pointer-events-auto bg-[#070b14]/84 border border-white/12 rounded-xl px-3 py-2.5 w-[236px]">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="font-semibold text-slate-200">Special Moves</span>
                  {hud.activeInputBuffer && (
                    <span className="font-mono-tabular text-cyan-300 font-bold">
                      {hud.activeInputBuffer}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {SPECIAL_MOVES.map((m) => {
                    const unlocked = hud.unlockedMoves.includes(m.id);
                    const cd = hud.moveCooldowns[m.id] || 0;
                    const ready = unlocked && cd <= 0.05;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!ready}
                        onClick={() => onTriggerSpecialMove(m.id)}
                        title={`${m.name} (${m.comboLabel})`}
                        className={`flex items-center justify-between gap-1 px-2 py-1 rounded-md border text-[10px] transition-colors whitespace-nowrap ${
                          !unlocked
                            ? 'bg-white/3 border-white/8 text-slate-600 cursor-not-allowed'
                            : ready
                              ? 'bg-cyan-500/12 border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/25 cursor-pointer'
                              : 'bg-white/5 border-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <span className="truncate font-semibold">{moveShortCombo(m.id)}</span>
                        <span className="font-mono-tabular shrink-0">
                          {!unlocked ? (
                            <Lock className="w-2.5 h-2.5" />
                          ) : cd > 0.05 ? (
                            `${cd.toFixed(1)}s`
                          ) : (
                            'RDY'
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 max-w-md w-full px-2">
            {hud.boss && (
              <div className="w-full bg-[#070b14]/92 border border-rose-500/50 rounded-xl px-4 py-2.5">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="font-display font-semibold text-rose-400">{hud.boss.name}</span>
                  <span className="font-mono-tabular text-slate-300">
                    {Math.ceil(hud.boss.hp)} / {hud.boss.maxHp}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-100"
                    style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {hud.rewardNotice && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0a131f]/95 border border-yellow-400/50 rounded-xl text-xs font-display font-semibold text-yellow-300 shadow-lg">
                <Coins className="w-3.5 h-3.5 shrink-0" />
                <span>{hud.rewardNotice}</span>
              </div>
            )}

            {hud.bannerText && (
              <div className="px-5 py-2 bg-[#070b14]/92 border border-amber-400/45 rounded-xl text-sm font-display font-semibold tracking-wide text-amber-300 text-center">
                {hud.bannerText}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              {hud.overdriveTimer > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/50 rounded-lg text-xs font-semibold text-amber-300 font-mono-tabular">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Overdrive {hud.overdriveTimer.toFixed(1)}s</span>
                </div>
              )}
              {hud.magnetTimer > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-400/50 rounded-lg text-xs font-semibold text-purple-300 font-mono-tabular">
                  <Magnet className="w-3.5 h-3.5" />
                  <span>Magnet {hud.magnetTimer.toFixed(1)}s</span>
                </div>
              )}
              {hud.chronosTimer > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-lg text-xs font-semibold text-cyan-300 font-mono-tabular">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time Slow {hud.chronosTimer.toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-auto flex items-start gap-2.5">
            <div className="bg-[#070b14]/88 border border-white/12 rounded-xl px-4 py-3 min-w-[220px]">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Hull Integrity</span>
                <span className="font-mono-tabular text-slate-200">{hud.speedKmh} km/h</span>
              </div>
              <div
                className="grid gap-1.5 mb-2.5"
                style={{ gridTemplateColumns: `repeat(${hud.maxHull}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: hud.maxHull }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2.5 rounded-sm transition-colors ${
                      idx < hud.hull
                        ? hud.hull <= 2
                          ? 'bg-rose-500'
                          : 'bg-cyan-400'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Boost</span>
                    <span className="font-mono-tabular text-slate-200">{hud.boostEnergy}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${hud.boostEnergy}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Missiles</span>
                    <span className="font-mono-tabular text-slate-200">{hud.missileReady}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${hud.missileReady >= 100 ? 'bg-amber-400' : 'bg-cyan-500'}`}
                      style={{ width: `${hud.missileReady}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onFireMissiles}
                  disabled={hud.missileReady < 100}
                  className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hud.missileReady >= 100
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Salvo (M)
                </button>
                <button
                  type="button"
                  onClick={onBarrelRoll}
                  className="flex-1 py-1 px-2 text-[11px] font-semibold rounded-md bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Roll (E)
                </button>
              </div>
            </div>

            {hud.phase === 'playing' && (
              <button
                type="button"
                onClick={onPause}
                aria-label="Pause Game"
                className="p-3 bg-[#070b14]/88 border border-white/15 rounded-xl text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>
        ))}

      {/* SLEEK TAB-FREE MAIN INTERFACE */}
      {hud.phase === 'menu' && (
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10">
          {/* Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="pointer-events-auto bg-[#070b14]/88 border border-white/15 rounded-2xl px-5 py-3 shadow-xl">
              <div className="text-[11px] font-semibold tracking-widest uppercase text-amber-400">
                Aerial Tactical Combat
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                HELIOS APEX
              </h1>
            </div>

            <div className="pointer-events-auto flex items-center gap-3 bg-[#070b14]/88 border border-white/15 rounded-2xl px-4 py-2.5 shadow-xl">
              <div className="text-right pr-3 border-r border-white/12">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Best Score</div>
                <div className="font-display font-bold text-base text-white font-mono-tabular">
                  {hud.highScore.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono-tabular font-bold">
                <span className="text-yellow-300">{hud.wallet.gold} Gold</span>
                <span className="text-slate-200">{hud.wallet.silver} Silver</span>
                <span className="text-amber-500">{hud.wallet.copper} Copper</span>
              </div>
            </div>
          </div>

          {/* Center-Left Attractive Hero Card (No Tabs, No Level Collections, No Hints) */}
          <div className="my-auto max-w-xl w-full pointer-events-auto">
            <div className="bg-[#070b14]/92 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <div>
                <div className="text-xs font-medium text-cyan-300">
                  {hud.playMode === 'solo'
                    ? 'Ready For Sortie'
                    : hud.playMode === 'two_player'
                      ? 'Local 2-Player Arena'
                      : 'AI Rival Arena'}
                </div>
                <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                  {hud.playMode === 'solo'
                    ? hud.levelId === 0
                      ? 'Endless Overdrive'
                      : `Level ${selectedLevelCfg.id}: ${selectedLevelCfg.name}`
                    : hud.playMode === 'two_player'
                      ? '2-Player Head-to-Head Duel'
                      : `AI Competition · ${activeDiff.label}`}
                </h2>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  {hud.playMode === 'solo' ? (
                    <>
                      <span>Plane: <strong className="text-slate-200">{equippedShipMeta.name}</strong></span>
                      <span>·</span>
                      <span>Cleared: <strong className="text-emerald-400">{hud.milestones.highestLevelCleared}/100</strong></span>
                    </>
                  ) : (
                    <>
                      <span>Format: <strong className="text-amber-300">{activeRoundFormat.label}</strong></span>
                      <span>·</span>
                      <span>World: <strong className="text-slate-200">{activeArenaRealm.name}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* PLAY MODE SELECTOR */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPlayMode('solo')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-display font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hud.playMode === 'solo'
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                        : 'bg-white/5 text-slate-300 border-white/12 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>Solo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPlayMode('two_player')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-display font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hud.playMode === 'two_player'
                        ? 'bg-orange-400 text-slate-950 border-orange-300'
                        : 'bg-white/5 text-slate-300 border-white/12 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>2 Players</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPlayMode('ai_compete')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-display font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hud.playMode === 'ai_compete'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-white/5 text-slate-300 border-white/12 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 shrink-0" />
                    <span>vs AI</span>
                  </button>
                </div>

                {/* COMPETITIVE SETUP: ROUNDS + AI DIFFICULTY + PER-PLAYER PLANE SELECTION */}
                {hud.playMode !== 'solo' && (
                  <div className="space-y-2.5">
                    {/* Optional Rounds Format */}
                    <div className="bg-white/4 border border-white/12 rounded-2xl p-2.5">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-slate-300">Match Format (Rounds Optional)</span>
                        <span className="text-slate-400">
                          {hud.roundFormat === 'single'
                            ? 'Quick 1-round duel'
                            : hud.roundFormat === 'endless'
                              ? 'Play until eliminated'
                              : `First to ${activeRoundFormat.targetWins} wins`}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ROUND_FORMATS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => onSelectRoundFormat(f.id)}
                            className={`py-1.5 px-2 text-[11px] font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              hud.roundFormat === f.id
                                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                                : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Difficulty Selector */}
                    {hud.playMode === 'ai_compete' && (
                      <div className="bg-white/4 border border-amber-400/25 rounded-2xl p-2.5">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-semibold text-amber-300">AI Difficulty</span>
                          <span className="text-slate-300">{activeDiff.tagline}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {AI_DIFFICULTIES.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => onSelectAiDifficulty(d.id)}
                              className={`py-1.5 px-2 text-xs font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                hud.aiDifficulty === d.id
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Both Pilots Vehicle / Plane Selector Before Playing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Player 1 Plane Picker */}
                      <div className="bg-[#090f1d] border border-cyan-400/35 rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-display font-bold text-cyan-300">
                            Player 1 Plane
                          </span>
                          {hud.playMode === 'two_player' && (
                            <span className="text-[10px] font-mono-tabular text-slate-400">WASD</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => stepShip(hud.shipShape, -1, onSelectP1Ship)}
                            aria-label="Previous P1 Plane"
                            className="p-1.5 rounded-lg bg-white/6 border border-white/12 text-slate-200 hover:bg-white/15 cursor-pointer shrink-0"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-center min-w-0">
                            <div className="text-xs font-display font-bold text-white truncate">
                              {equippedShipMeta.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-tabular truncate">
                              Hull {5 + equippedShipMeta.bonusHull} · Spd {Math.round(equippedShipMeta.speedScale * 100)}%
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => stepShip(hud.shipShape, 1, onSelectP1Ship)}
                            aria-label="Next P1 Plane"
                            className="p-1.5 rounded-lg bg-white/6 border border-white/12 text-slate-200 hover:bg-white/15 cursor-pointer shrink-0"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Player 2 / AI Rival Plane Picker */}
                      <div className="bg-[#090f1d] border border-orange-400/35 rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-display font-bold text-orange-300">
                            {hud.playMode === 'two_player' ? 'Player 2 Plane' : 'AI Opponent Plane'}
                          </span>
                          {hud.playMode === 'two_player' && (
                            <span className="text-[10px] font-mono-tabular text-slate-400">Arrows</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              stepShip(
                                hud.playMode === 'two_player' ? hud.p2ShipShape : hud.aiShipShape,
                                -1,
                                hud.playMode === 'two_player' ? onSelectP2Ship : onSelectAiShip
                              )
                            }
                            aria-label="Previous Rival Plane"
                            className="p-1.5 rounded-lg bg-white/6 border border-white/12 text-slate-200 hover:bg-white/15 cursor-pointer shrink-0"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-center min-w-0">
                            <div className="text-xs font-display font-bold text-white truncate">
                              {hud.playMode === 'two_player' ? p2ShipMeta.name : aiShipMeta.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-tabular truncate">
                              Hull {5 + (hud.playMode === 'two_player' ? p2ShipMeta.bonusHull : aiShipMeta.bonusHull)} · Spd{' '}
                              {Math.round(
                                (hud.playMode === 'two_player' ? p2ShipMeta.speedScale : aiShipMeta.speedScale) * 100
                              )}
                              %
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              stepShip(
                                hud.playMode === 'two_player' ? hud.p2ShipShape : hud.aiShipShape,
                                1,
                                hud.playMode === 'two_player' ? onSelectP2Ship : onSelectAiShip
                              )
                            }
                            aria-label="Next Rival Plane"
                            className="p-1.5 rounded-lg bg-white/6 border border-white/12 text-slate-200 hover:bg-white/15 cursor-pointer shrink-0"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Arena World Swatches */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {REALM_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => onSelectRealm(theme.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            hud.realmId === theme.id
                              ? 'bg-white/16 border-white/45 text-white font-semibold'
                              : 'bg-white/4 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: theme.accentHex }}
                          />
                          <span>{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {hud.rewardNotice && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/15 border border-yellow-400/40 rounded-xl text-xs font-semibold text-yellow-300">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{hud.rewardNotice}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => onStart(hud.playMode === 'solo' ? hud.levelId : undefined)}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 text-base font-display font-extrabold tracking-wide text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-2xl transition-colors shadow-lg cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-5 h-5 fill-current shrink-0" />
                  <span>{playLaunchLabel()}</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onOpenLevels}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-display font-bold text-white bg-white/8 hover:bg-white/15 border border-white/18 rounded-2xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{hud.playMode === 'solo' ? 'Levels & Mode' : 'Arena & Vehicles'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenGarage}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-display font-bold text-cyan-200 bg-cyan-500/16 hover:bg-cyan-500/26 border border-cyan-400/45 rounded-2xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span>Garage ({hud.unlockedShips.length}/{SHIP_SHAPES.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div />
        </div>
      )}

      {/* DEDICATED LEVELS & MODE (SOLO) OR ARENA & VEHICLES SETUP (2P / AI) */}
      {hud.phase === 'levels' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 bg-[#050811]/82 pointer-events-auto overflow-y-auto">
          {/* Header */}
          <div className="mx-auto w-full max-w-5xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCloseLevels}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#080d18] hover:bg-white/12 border border-white/15 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Main Menu</span>
              </button>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">
                  {hud.playMode === 'solo' ? 'LEVELS & MODE' : 'ARENA & VEHICLES'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hud.playMode === 'solo' && (
                <div className="flex items-center p-1 bg-[#080d18] border border-white/15 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setModeTab('campaign');
                      if (hud.levelId === 0) {
                        onSelectLevel(Math.min(100, Math.max(1, hud.milestones.highestLevelCleared + 1)));
                      }
                    }}
                    className={`px-3.5 py-1.5 text-xs font-display font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      modeTab === 'campaign'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Campaign (1–100)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModeTab('endless');
                      onSelectLevel(0);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-display font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      modeTab === 'endless'
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Endless Mode
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-3 bg-[#080d18] border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono-tabular font-bold">
                <span className="text-yellow-300">{hud.wallet.gold} Gold</span>
                <span className="text-slate-200">{hud.wallet.silver} Silver</span>
                <span className="text-amber-500">{hud.wallet.copper} Copper</span>
              </div>
            </div>
          </div>

          {/* Battle Mode, Rounds & AI Difficulty Bar */}
          <div className="mx-auto w-full max-w-5xl mt-3 flex flex-wrap items-center justify-between gap-3 bg-[#080d18] border border-white/15 rounded-2xl px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">Battle Mode</span>
              <button
                type="button"
                onClick={() => onSelectPlayMode('solo')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  hud.playMode === 'solo'
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Solo</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPlayMode('two_player')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  hud.playMode === 'two_player'
                    ? 'bg-orange-400 text-slate-950 border-orange-300'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>2 Players</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPlayMode('ai_compete')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  hud.playMode === 'ai_compete'
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5 shrink-0" />
                <span>vs AI</span>
              </button>
            </div>

            {hud.playMode === 'ai_compete' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-amber-300 font-semibold mr-1">AI Difficulty</span>
                {AI_DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectAiDifficulty(d.id)}
                    className={`px-2.5 py-1 text-xs font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hud.aiDifficulty === d.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {hud.playMode !== 'solo' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold mr-1">Rounds</span>
                {ROUND_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectRoundFormat(f.id)}
                    className={`px-2.5 py-1 text-xs font-display font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hud.roundFormat === f.id
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center Card: Arena Pre-Match Setup (2P / vs AI) OR Levels Card (Solo) */}
          <div className="mx-auto w-full max-w-5xl my-auto py-4">
            {hud.playMode !== 'solo' ? (
              <div className="relative rounded-3xl overflow-hidden border border-white/18 bg-[#070b14] shadow-2xl">
                <div className="relative min-h-[450px] w-full">
                  <SectorCardArt sectorIdx={hud.realmId} realmId={hud.realmId} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/78 to-[#050811]/45" />

                  <div className="relative z-10 flex flex-col justify-between p-5 sm:p-7 gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/55 border border-white/15 text-[11px] font-semibold text-amber-300">
                          <span>{hud.playMode === 'two_player' ? 'Local 2-Player Duel' : `vs ${activeDiff.label} AI`}</span>
                          <span>·</span>
                          <span>{activeRoundFormat.label}</span>
                        </div>
                        <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-2">
                          Select Vehicles & Arena World
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {REALM_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => onSelectRealm(theme.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              hud.realmId === theme.id
                                ? 'bg-white/20 border-white/55 text-white font-semibold'
                                : 'bg-black/45 border-white/15 text-slate-300 hover:text-white'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: theme.accentHex }}
                            />
                            <span>{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dual Full Aircraft Selection Grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Player 1 Vehicle Picker */}
                      <div className="bg-[#070b14]/88 border border-cyan-400/40 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <div>
                            <div className="text-xs font-display font-extrabold text-cyan-300">
                              PLAYER 1 AIRCRAFT
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {hud.playMode === 'two_player' ? 'WASD · L-Shift · F / Q / E' : 'Mouse / WASD · F / Q / E'}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-white">{equippedShipMeta.name}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                          {unlockedShipsList.map((shipId) => {
                            const meta = SHIP_SHAPES.find((s) => s.id === shipId);
                            if (!meta) return null;
                            const active = hud.shipShape === meta.id;
                            return (
                              <button
                                key={meta.id}
                                type="button"
                                onClick={() => onSelectP1Ship(meta.id)}
                                className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-cyan-400/22 border-cyan-400 text-white'
                                    : 'bg-white/5 border-white/12 text-slate-300 hover:border-white/30'
                                }`}
                              >
                                <div className="text-[11px] font-bold truncate">{meta.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono-tabular mt-0.5">
                                  H{5 + meta.bonusHull} · {Math.round(meta.speedScale * 100)}%
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Player 2 / AI Rival Vehicle Picker */}
                      <div className="bg-[#070b14]/88 border border-orange-400/40 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <div>
                            <div className="text-xs font-display font-extrabold text-orange-300">
                              {hud.playMode === 'two_player' ? 'PLAYER 2 AIRCRAFT' : 'AI OPPONENT AIRCRAFT'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {hud.playMode === 'two_player'
                                ? 'Arrows · R-Shift · Enter / M'
                                : `${activeDiff.label} AI Pilot`}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-white">
                            {hud.playMode === 'two_player' ? p2ShipMeta.name : aiShipMeta.name}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                          {unlockedShipsList.map((shipId) => {
                            const meta = SHIP_SHAPES.find((s) => s.id === shipId);
                            if (!meta) return null;
                            const active =
                              (hud.playMode === 'two_player' ? hud.p2ShipShape : hud.aiShipShape) === meta.id;
                            return (
                              <button
                                key={meta.id}
                                type="button"
                                onClick={() =>
                                  hud.playMode === 'two_player'
                                    ? onSelectP2Ship(meta.id)
                                    : onSelectAiShip(meta.id)
                                }
                                className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-orange-400/22 border-orange-400 text-white'
                                    : 'bg-white/5 border-white/12 text-slate-300 hover:border-white/30'
                                }`}
                              >
                                <div className="text-[11px] font-bold truncate">{meta.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono-tabular mt-0.5">
                                  H{5 + meta.bonusHull} · {Math.round(meta.speedScale * 100)}%
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={onOpenGarage}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-display font-bold text-cyan-200 bg-cyan-500/16 hover:bg-cyan-500/25 border border-cyan-400/40 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Unlock More Planes in Garage ({hud.unlockedShips.length}/{SHIP_SHAPES.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStart()}
                        className="inline-flex items-center gap-2 px-7 py-3 text-sm font-display font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{playLaunchLabel()}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : modeTab === 'campaign' ? (
              <div className="relative rounded-3xl overflow-hidden border border-white/18 bg-[#070b14] shadow-2xl">
                {/* Illustrated World Image Backdrop */}
                <div className="relative h-[430px] sm:h-[460px] w-full">
                  <SectorCardArt sectorIdx={sectorIdx} realmId={sectorRealmId} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/65 to-[#050811]/30" />

                  {/* Embedded Sector Title & 10 Levels Inside the Same Visual Card */}
                  <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/55 border border-white/15 text-[11px] font-semibold text-amber-300">
                          <span>Sector {sectorIdx + 1} / 10</span>
                          <span>·</span>
                          <span>{sectorTheme.name}</span>
                        </div>
                        <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-2">
                          {SECTOR_NAMES[sectorIdx]} · Levels {sectorStart}–{sectorEnd}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={sectorIdx === 0}
                          onClick={() => setSectorIdx((s) => Math.max(0, s - 1))}
                          aria-label="Previous 10 Levels"
                          className={`p-2.5 rounded-xl border transition-colors ${
                            sectorIdx === 0
                              ? 'bg-black/30 border-white/10 text-slate-600 cursor-not-allowed'
                              : 'bg-black/60 border-white/25 text-white hover:bg-white/15 cursor-pointer'
                          }`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          disabled={sectorIdx === 9}
                          onClick={() => setSectorIdx((s) => Math.min(9, s + 1))}
                          aria-label="Next 10 Levels"
                          className={`p-2.5 rounded-xl border transition-colors ${
                            sectorIdx === 9
                              ? 'bg-black/30 border-white/10 text-slate-600 cursor-not-allowed'
                              : 'bg-black/60 border-white/25 text-white hover:bg-white/15 cursor-pointer'
                          }`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* 10 Levels Grid Inside the Visual World Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                      {sectorLevels.map((lvlNum) => {
                        const unlocked = isLevelUnlocked(lvlNum);
                        const rec = hud.levelRecords[lvlNum];
                        const selected = hud.levelId === lvlNum;
                        const isBossStage = lvlNum % 10 === 0;
                        return (
                          <button
                            key={lvlNum}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => onSelectLevel(lvlNum)}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              !unlocked
                                ? 'bg-[#070b14]/70 border-white/8 text-slate-500 cursor-not-allowed'
                                : selected
                                  ? 'bg-amber-400/24 border-amber-400 text-white shadow-lg cursor-pointer'
                                  : isBossStage
                                    ? 'bg-[#120b14]/85 border-rose-400/40 text-white hover:border-rose-400 cursor-pointer'
                                    : 'bg-[#090f1d]/85 border-white/18 text-slate-100 hover:border-cyan-400/70 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between text-sm font-display font-bold">
                              <span>Level {lvlNum}</span>
                              {!unlocked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                              ) : isBossStage ? (
                                <span className="text-[10px] font-bold text-rose-400">BOSS</span>
                              ) : null}
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${
                                      (rec?.stars || 0) >= s
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-700'
                                    }`}
                                  />
                                ))}
                              </div>
                              {rec && (
                                <span className="text-[10px] font-mono-tabular text-slate-300">
                                  {rec.bestScore.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Card Footer: Page Indicator + Launch */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 10 }, (_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSectorIdx(idx)}
                            aria-label={`Sector ${idx + 1}`}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                              sectorIdx === idx
                                ? 'w-7 bg-amber-400'
                                : 'w-2 bg-white/25 hover:bg-white/45'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => onStart(hud.levelId > 0 ? hud.levelId : 1)}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-display font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          Launch {hud.levelId > 0 ? `Level ${hud.levelId}` : 'Level 1'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden border border-cyan-400/35 bg-[#070b14] shadow-2xl">
                <div className="relative h-[400px] w-full">
                  <SectorCardArt sectorIdx={9} realmId={5} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/65 to-[#050811]/35" />
                  <div className="absolute inset-0 flex flex-col justify-between p-7">
                    <div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-xs font-semibold text-cyan-200">
                        Infinite Survival Mode
                      </span>
                      <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-3">
                        Endless Overdrive
                      </h3>
                      <p className="text-sm text-slate-300 mt-2 max-w-lg">
                        Continuous escalating waves, recurring Dreadnought bosses every 3 waves, and high-speed coin farming.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm font-mono-tabular text-slate-300">
                        Personal Best: <strong className="text-white">{hud.highScore.toLocaleString()}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => onStart(0)}
                        className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-display font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Launch Endless Mode</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div />
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE GARAGE (SOLO FULL VIEW OR 2P / VS AI SPLIT VIEW) */}
      {hud.phase === 'garage' && (
        <div className="relative flex-1 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
          {/* Split-Screen Center Divider in 2P / vs AI modes */}
          {hud.playMode !== 'solo' && (
            <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/18 pointer-events-none" />
          )}

          {/* Garage Top Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="pointer-events-auto flex items-center gap-3 bg-[#070b14]/90 border border-white/15 rounded-xl px-3.5 py-2">
              <button
                type="button"
                onClick={onCloseGarage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/8 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Main Menu</span>
              </button>
              <div>
                <div className="font-display text-lg font-extrabold tracking-wide text-white leading-tight">
                  GARAGE
                </div>
                <div className="text-[11px] text-cyan-300">
                  {hud.playMode === 'solo'
                    ? 'Drag to inspect · Scroll to zoom'
                    : hud.playMode === 'two_player'
                      ? 'Split Garage (P1 vs P2) · Drag either side'
                      : 'Split Garage (P1 vs AI) · Drag either side'}
                </div>
              </div>
            </div>

            {hud.rewardNotice && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a131f]/95 border border-yellow-400/55 rounded-xl text-xs font-display font-semibold text-yellow-300 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{hud.rewardNotice}</span>
              </div>
            )}

            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              {hud.playMode !== 'solo' && (
                <div className="flex items-center p-1 bg-[#070b14]/90 border border-white/15 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setGarageTab('planes')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      garageTab === 'planes'
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Split Planes
                  </button>
                  <button
                    type="button"
                    onClick={() => setGarageTab('paint')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      garageTab === 'paint'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Paint
                  </button>
                  <button
                    type="button"
                    onClick={() => setGarageTab('moves')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      garageTab === 'moves'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Moves
                  </button>
                </div>
              )}

              <div className="bg-[#070b14]/90 border border-white/15 rounded-xl px-3.5 py-2">
                <div className="flex items-center gap-3 text-xs font-mono-tabular font-bold">
                  <span className="text-yellow-300">{hud.wallet.gold} Gold</span>
                  <span className="text-slate-200">{hud.wallet.silver} Silver</span>
                  <span className="text-amber-500">{hud.wallet.copper} Copper</span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#070b14]/90 border border-white/15 rounded-xl p-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-300 ml-1" />
                {GLOW_MODES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSelectGlow(g.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      hud.glowMode === g.id
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onStart(hud.playMode === 'solo' ? hud.levelId : undefined)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{hud.playMode === 'solo' ? 'Launch Mission' : playLaunchLabel()}</span>
              </button>
            </div>
          </div>

          {/* Center Viewport Badges (Split Pilot Labels + Classified Vault Alerts) */}
          {hud.playMode === 'solo' ? (
            !previewUnlocked && (
              <div className="mx-auto my-auto pointer-events-none flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#070b14]/90 border border-cyan-400/50 rounded-2xl shadow-xl">
                  <Lock className="w-4 h-4 text-cyan-300" />
                  <span className="font-display text-xs font-bold tracking-widest uppercase text-cyan-200">
                    Classified Airframe · Unlock or Purchase to Reveal 3D Shape
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-6 my-2 pointer-events-none">
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#070b14]/88 border border-cyan-400/45 rounded-xl shadow-lg">
                  <span className="px-1.5 py-0.5 text-[10px] font-display font-extrabold rounded bg-cyan-400 text-slate-950">
                    PLAYER 1
                  </span>
                  <span className="text-xs font-display font-bold text-white">{previewShipMeta.name}</span>
                  {!previewUnlocked && <Lock className="w-3.5 h-3.5 text-amber-300" />}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#070b14]/88 border border-orange-400/45 rounded-xl shadow-lg">
                  <span className="px-1.5 py-0.5 text-[10px] font-display font-extrabold rounded bg-orange-400 text-slate-950">
                    {hud.playMode === 'two_player' ? 'PLAYER 2' : `AI · ${activeDiff.label.toUpperCase()}`}
                  </span>
                  <span className="text-xs font-display font-bold text-white">{previewRivalMeta.name}</span>
                  {!previewRivalUnlocked && <Lock className="w-3.5 h-3.5 text-amber-300" />}
                </div>
              </div>
            </div>
          )}

          {/* Garage Bottom Control Drawer */}
          {hud.playMode === 'solo' || garageTab !== 'planes' ? (
            <div className="pointer-events-auto mx-auto w-full max-w-[1100px] bg-[#070b14]/93 border border-white/15 rounded-2xl p-3.5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setGarageTab('planes')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      garageTab === 'planes'
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Plane Shapes ({hud.unlockedShips.length}/{SHIP_SHAPES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGarageTab('paint')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      garageTab === 'paint'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Armor Paint ({SHIP_SKINS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGarageTab('moves')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      garageTab === 'moves'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Special Moves
                  </button>
                </div>

                {/* Active Preview Spec & Buy/Equip Action */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-display font-bold text-white">
                      {previewShipMeta.name}{' '}
                      <span className="text-[11px] font-sans font-normal text-slate-400">
                        · {previewShipMeta.tagline}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      Hull {5 + previewShipMeta.bonusHull} · Speed {Math.round(previewShipMeta.speedScale * 100)}%
                      {!previewUnlocked && (
                        <span className="ml-2 text-amber-300">
                          {previewShipMeta.unlockLevel === null
                            ? `Requires ${formatCost(previewShipMeta.cost)}`
                            : `Pass Level ${previewShipMeta.unlockLevel} or Buy ${formatCost(previewShipMeta.cost)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {previewUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onPreviewShip(previewShipMeta.id, 'p1')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        previewEquipped
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                          : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      }`}
                    >
                      {previewEquipped ? 'Equipped for Flight' : 'Equip Plane'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!previewAffordable}
                      onClick={() => onUnlockShip(previewShipMeta.id, 'p1')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                        previewAffordable
                          ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 cursor-pointer'
                          : 'bg-white/5 border-white/12 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Buy for {formatCost(previewShipMeta.cost)}
                    </button>
                  )}
                </div>
              </div>

              {garageTab === 'planes' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 max-h-[156px] overflow-y-auto pr-0.5">
                  {SHIP_SHAPES.map((s) => {
                    const unlocked = hud.unlockedShips.includes(s.id);
                    const previewing = hud.previewShipShape === s.id;
                    const equipped = hud.shipShape === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onPreviewShip(s.id, 'p1')}
                        className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                          previewing
                            ? 'bg-cyan-500/22 border-cyan-400 text-white'
                            : unlocked
                              ? 'bg-white/6 border-white/14 text-slate-200 hover:border-white/30'
                              : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold truncate">{s.name}</span>
                          {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />}
                        </div>
                        <div className="mt-1 text-[10px] font-mono-tabular truncate">
                          {equipped ? (
                            <span className="text-emerald-300 font-semibold">Equipped</span>
                          ) : unlocked ? (
                            <span className="text-cyan-300">Owned</span>
                          ) : (
                            <span className={tierTextClass(s.cost.tier)}>{formatCost(s.cost)}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {garageTab === 'paint' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {SHIP_SKINS.map((sk) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => onSelectShipSkin(sk.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                        hud.shipSkin === sk.id
                          ? 'bg-white/15 border-white/60 text-white font-semibold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-xs shrink-0 border border-white/30"
                        style={{ backgroundColor: sk.swatchHex }}
                      />
                      <span className="truncate">{sk.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {garageTab === 'moves' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 max-h-[175px] overflow-y-auto pr-0.5">
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {SPECIAL_MOVES.map((m) => {
                      const unlocked = hud.unlockedMoves.includes(m.id);
                      const affordable = totalCopper >= costToCopper(m.cost);
                      return (
                        <div
                          key={m.id}
                          className={`p-2 rounded-xl border ${
                            unlocked
                              ? 'bg-emerald-500/8 border-emerald-400/30'
                              : 'bg-white/4 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-white truncate">{m.name}</span>
                            {unlocked ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300 shrink-0">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!affordable}
                                onClick={() => onUnlockMove(m.id)}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border whitespace-nowrap shrink-0 ${
                                  affordable
                                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 hover:bg-amber-400/30 cursor-pointer'
                                    : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                Buy {formatCost(m.cost)}
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-cyan-300 mt-0.5">
                            {m.comboLabel}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            {m.description}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-white/4 border border-white/10 rounded-xl p-2.5 text-[11px]">
                    <div className="font-semibold text-slate-200 mb-1.5">Coin Rewards</div>
                    <div className="space-y-1 font-mono-tabular text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">20 Enemies ({hud.milestones.totalKills % 20}/20)</span>
                        <span className="text-amber-400">+50 Copper</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">10 Gates ({hud.milestones.totalGates % 10}/10)</span>
                        <span className="text-slate-200">+3 Silver</span>
                      </div>
                      {LEVEL_MILESTONE_CARDS.map((mc) => {
                        const done = hud.milestones.rewardedMilestones.includes(mc.key);
                        return (
                          <div key={mc.key} className="flex justify-between">
                            <span className={done ? 'text-emerald-300' : 'text-slate-400'}>
                              {done ? '✓ ' : ''}Pass Level {mc.level}
                            </span>
                            <span className={done ? 'text-emerald-300' : 'text-yellow-300'}>
                              +{mc.reward}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SPLIT-SCREEN BOTTOM GARAGE DRAWERS: LEFT = PLAYER 1, RIGHT = PLAYER 2 / AI */
            <div className="pointer-events-auto grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {/* LEFT HALF: PLAYER 1 AIRCRAFT */}
              <div className="bg-[#070b14]/93 border border-cyan-400/40 rounded-2xl p-3.5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-display font-extrabold rounded bg-cyan-400 text-slate-950 shrink-0">
                        P1
                      </span>
                      <span className="text-xs font-display font-bold text-white truncate">
                        {previewShipMeta.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        · {previewShipMeta.tagline}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-tabular mt-0.5">
                      Hull {5 + previewShipMeta.bonusHull} · Speed {Math.round(previewShipMeta.speedScale * 100)}%
                      {hud.playMode === 'two_player' && <span className="ml-2 text-cyan-300">WASD</span>}
                    </div>
                  </div>

                  {previewUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onPreviewShip(previewShipMeta.id, 'p1')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        previewEquipped
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                          : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                      }`}
                    >
                      {previewEquipped ? 'Equipped' : 'Equip Plane'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!previewAffordable}
                      onClick={() => onUnlockShip(previewShipMeta.id, 'p1')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                        previewAffordable
                          ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 cursor-pointer'
                          : 'bg-white/5 border-white/12 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Buy {formatCost(previewShipMeta.cost)}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[154px] overflow-y-auto pr-0.5">
                  {SHIP_SHAPES.map((s) => {
                    const unlocked = hud.unlockedShips.includes(s.id);
                    const previewing = hud.previewShipShape === s.id;
                    const equipped = hud.shipShape === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onPreviewShip(s.id, 'p1')}
                        className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                          previewing
                            ? 'bg-cyan-500/22 border-cyan-400 text-white'
                            : unlocked
                              ? 'bg-white/6 border-white/14 text-slate-200 hover:border-white/30'
                              : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold truncate">{s.name}</span>
                          {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />}
                        </div>
                        <div className="mt-1 text-[10px] font-mono-tabular truncate">
                          {equipped ? (
                            <span className="text-emerald-300 font-semibold">Equipped</span>
                          ) : unlocked ? (
                            <span className="text-cyan-300">Owned</span>
                          ) : (
                            <span className={tierTextClass(s.cost.tier)}>{formatCost(s.cost)}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT HALF: PLAYER 2 / AI OPPONENT AIRCRAFT */}
              <div className="bg-[#070b14]/93 border border-orange-400/40 rounded-2xl p-3.5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-display font-extrabold rounded bg-orange-400 text-slate-950 shrink-0 whitespace-nowrap">
                        {hud.playMode === 'two_player' ? 'P2' : 'AI'}
                      </span>
                      <span className="text-xs font-display font-bold text-white truncate">
                        {previewRivalMeta.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        · {previewRivalMeta.tagline}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-tabular mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Hull {5 + previewRivalMeta.bonusHull} · Speed {Math.round(previewRivalMeta.speedScale * 100)}%</span>
                      {hud.playMode === 'two_player' ? (
                        <span className="text-orange-300">Arrows</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {AI_DIFFICULTIES.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => onSelectAiDifficulty(d.id)}
                              className={`px-1.5 py-0.5 text-[10px] font-display font-bold rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                hud.aiDifficulty === d.id
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  {previewRivalUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onPreviewShip(previewRivalMeta.id, 'rival')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        previewRivalEquipped
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                          : 'bg-orange-400 text-slate-950 hover:bg-orange-300'
                      }`}
                    >
                      {previewRivalEquipped ? 'Equipped' : 'Equip Plane'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!previewRivalAffordable}
                      onClick={() => onUnlockShip(previewRivalMeta.id, 'rival')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                        previewRivalAffordable
                          ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 cursor-pointer'
                          : 'bg-white/5 border-white/12 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Buy {formatCost(previewRivalMeta.cost)}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[154px] overflow-y-auto pr-0.5">
                  {SHIP_SHAPES.map((s) => {
                    const unlocked = hud.unlockedShips.includes(s.id);
                    const previewing = hud.previewRivalShipShape === s.id;
                    const equipped = equippedRivalId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onPreviewShip(s.id, 'rival')}
                        className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                          previewing
                            ? 'bg-orange-500/22 border-orange-400 text-white'
                            : unlocked
                              ? 'bg-white/6 border-white/14 text-slate-200 hover:border-white/30'
                              : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold truncate">{s.name}</span>
                          {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />}
                        </div>
                        <div className="mt-1 text-[10px] font-mono-tabular truncate">
                          {equipped ? (
                            <span className="text-emerald-300 font-semibold">Equipped</span>
                          ) : unlocked ? (
                            <span className="text-orange-300">Owned</span>
                          ) : (
                            <span className={tierTextClass(s.cost.tier)}>{formatCost(s.cost)}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEVEL COMPLETE MODAL */}
      {hud.phase === 'levelcomplete' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 pointer-events-auto p-4">
          {hud.playMode !== 'solo' && hud.matchResult ? (
            <div className="max-w-lg w-full bg-[#080d18] border border-emerald-400/40 rounded-2xl p-7 shadow-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <Trophy className="w-4 h-4" />
                <span>Level {hud.levelId} Cleared · {hud.levelName}</span>
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white">
                {hud.matchResult.winner === 'p1'
                  ? 'Player 1 Wins!'
                  : hud.matchResult.winner === 'rival'
                    ? hud.playMode === 'two_player'
                      ? 'Player 2 Wins!'
                      : 'AI Rival Wins!'
                    : 'Match Draw!'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">{hud.matchResult.reason}</p>

              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-7 h-7 ${
                      hud.earnedStars >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-slate-300 font-medium">
                  {hud.earnedStars === 3
                    ? 'Ace Rating'
                    : hud.earnedStars === 2
                      ? 'Veteran Rating'
                      : 'Mission Complete'}
                </span>
              </div>

              {hud.rewardNotice && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/15 border border-yellow-400/40 rounded-lg text-xs font-semibold text-yellow-300">
                  <Coins className="w-3.5 h-3.5 shrink-0" />
                  <span>{hud.rewardNotice}</span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div
                  className={`p-3.5 rounded-xl border ${
                    hud.matchResult.winner === 'p1'
                      ? 'bg-cyan-500/12 border-cyan-400/55'
                      : 'bg-white/4 border-white/10'
                  }`}
                >
                  <div className="text-xs font-display font-bold text-cyan-300">Player 1</div>
                  <div className="mt-1 text-2xl font-bold text-white font-mono-tabular">
                    {hud.matchResult.p1Score.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono-tabular">
                    {hud.matchResult.p1Kills} Kills · {hud.matchResult.p1Rings} Gates
                  </div>
                </div>
                <div
                  className={`p-3.5 rounded-xl border ${
                    hud.matchResult.winner === 'rival'
                      ? 'bg-orange-500/12 border-orange-400/55'
                      : 'bg-white/4 border-white/10'
                  }`}
                >
                  <div className="text-xs font-display font-bold text-orange-300">
                    {hud.playMode === 'two_player' ? 'Player 2' : `AI (${activeDiff.label})`}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white font-mono-tabular">
                    {hud.matchResult.rivalScore.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono-tabular">
                    {hud.matchResult.rivalKills} Kills · {hud.matchResult.rivalRings} Gates
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {hud.levelId > 0 && hud.levelId < 100 && (
                  <button
                    type="button"
                    onClick={onNextLevel}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Next Level ({hud.levelId + 1})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onStart(hud.levelId)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rematch</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnMenu}
                  className="px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  Menu
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md w-full bg-[#080d18] border border-emerald-400/35 rounded-2xl p-7 shadow-2xl">
              <div className="text-xs font-semibold text-emerald-400 mb-1">
                Level {hud.levelId} Cleared
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white">{hud.levelName}</h2>

              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-8 h-8 ${
                      hud.earnedStars >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-slate-300 font-medium">
                  {hud.earnedStars === 3
                    ? 'Ace Rating'
                    : hud.earnedStars === 2
                      ? 'Veteran Rating'
                      : 'Mission Complete'}
                </span>
              </div>

              {hud.rewardNotice && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/15 border border-yellow-400/40 rounded-lg text-xs font-semibold text-yellow-300">
                  <Coins className="w-3.5 h-3.5 shrink-0" />
                  <span>{hud.rewardNotice}</span>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                <div>
                  <div className="text-xs text-slate-400">Level Score</div>
                  <div className="mt-0.5 text-2xl font-bold text-amber-400 font-mono-tabular">
                    {hud.score.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Targets / Gates</div>
                  <div className="mt-0.5 text-2xl font-bold text-white font-mono-tabular">
                    {hud.kills} / {hud.ringsCleared}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-mono-tabular bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-slate-400">Wallet</span>
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-yellow-300">{hud.wallet.gold} Au</span>
                  <span className="text-slate-200">{hud.wallet.silver} Ag</span>
                  <span className="text-amber-500">{hud.wallet.copper} Cu</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {hud.levelId > 0 && hud.levelId < 100 && (
                  <button
                    type="button"
                    onClick={onNextLevel}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Next Level ({hud.levelId + 1})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onStart(hud.levelId)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="px-4 py-3 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Garage
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAUSE MODAL */}
      {hud.phase === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 pointer-events-auto p-4">
          <div className="max-w-sm w-full bg-[#080d18] border border-white/15 rounded-2xl p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white">Sortie Paused</h2>
            <p className="mt-1 text-sm text-slate-400">
              {hud.playMode !== 'solo'
                ? `${hud.playMode === 'two_player' ? '2P Duel' : `vs ${activeDiff.label} AI`} · Round ${hud.roundNumber} · P1 ${hud.score.toLocaleString()}`
                : `${hud.levelId === 0 ? `Wave ${hud.wave}` : `Level ${hud.levelId}: ${hud.levelName}`} · Score ${hud.score.toLocaleString()}`}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Flight</span>
              </button>
              <button
                type="button"
                onClick={() => onStart(hud.playMode === 'solo' ? hud.levelId : undefined)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/8 hover:bg-white/14 border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{hud.playMode !== 'solo' ? 'Restart Match' : 'Restart Level'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenGarage}
                className="w-full py-2.5 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              >
                Garage
              </button>
              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / COMPETITIVE ROUND & MATCH RESULT MODAL */}
      {hud.phase === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 pointer-events-auto p-4">
          {hud.playMode !== 'solo' && hud.matchResult ? (
            <div className="max-w-lg w-full bg-[#080d18] border border-white/18 rounded-2xl p-7 shadow-2xl">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div
                  className={`inline-flex items-center gap-2 text-xs font-semibold ${
                    hud.matchResult.winner === 'p1'
                      ? 'text-cyan-300'
                      : hud.matchResult.winner === 'rival'
                        ? 'text-orange-400'
                        : 'text-amber-300'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>
                    {hud.playMode === 'two_player'
                      ? `2-Player Arena · Round ${hud.matchResult.roundNumber}`
                      : `AI Arena (${activeDiff.label}) · Round ${hud.matchResult.roundNumber}`}
                  </span>
                </div>
                {hud.matchResult.targetWins > 1 && (
                  <span className="px-2.5 py-0.5 rounded-md bg-white/8 border border-white/15 text-[11px] font-display font-bold text-amber-300 font-mono-tabular">
                    Series {hud.matchResult.p1RoundWins} – {hud.matchResult.rivalRoundWins} (First to {hud.matchResult.targetWins})
                  </span>
                )}
              </div>

              <h2 className="font-display text-3xl font-extrabold text-white">
                {hud.matchResult.isSeriesFinal && hud.matchResult.targetWins > 1
                  ? hud.matchResult.winner === 'p1'
                    ? 'Series Champion: Player 1!'
                    : hud.matchResult.winner === 'rival'
                      ? hud.playMode === 'two_player'
                        ? 'Series Champion: Player 2!'
                        : 'Series Champion: AI Rival!'
                      : 'Match Draw!'
                  : hud.matchResult.winner === 'p1'
                    ? 'Player 1 Wins!'
                    : hud.matchResult.winner === 'rival'
                      ? hud.playMode === 'two_player'
                        ? 'Player 2 Wins!'
                        : 'AI Rival Wins!'
                      : 'Match Draw!'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">{hud.matchResult.reason}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div
                  className={`p-4 rounded-xl border ${
                    hud.matchResult.winner === 'p1'
                      ? 'bg-cyan-500/12 border-cyan-400/55'
                      : 'bg-white/4 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-cyan-300">Player 1</span>
                    {hud.matchResult.targetWins > 1 && (
                      <span className="text-[11px] font-mono-tabular text-cyan-200">
                        {hud.matchResult.p1RoundWins}W
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white font-mono-tabular">
                    {hud.matchResult.p1Score.toLocaleString()}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400 font-mono-tabular">
                    {hud.matchResult.p1Kills} Kills · {hud.matchResult.p1Rings} Gates
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    hud.matchResult.winner === 'rival'
                      ? 'bg-orange-500/12 border-orange-400/55'
                      : 'bg-white/4 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-orange-300">
                      {hud.playMode === 'two_player' ? 'Player 2' : `AI (${activeDiff.label})`}
                    </span>
                    {hud.matchResult.targetWins > 1 && (
                      <span className="text-[11px] font-mono-tabular text-orange-200">
                        {hud.matchResult.rivalRoundWins}W
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white font-mono-tabular">
                    {hud.matchResult.rivalScore.toLocaleString()}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400 font-mono-tabular">
                    {hud.matchResult.rivalKills} Kills · {hud.matchResult.rivalRings} Gates
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {!hud.matchResult.isSeriesFinal ? (
                  <button
                    type="button"
                    onClick={onNextRound}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Next Round (Round {hud.matchResult.roundNumber + 1})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStart()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Play Again</span>
                  </button>
                )}
                {!hud.matchResult.isSeriesFinal && (
                  <button
                    type="button"
                    onClick={() => onStart()}
                    className="px-4 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Restart
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="px-4 py-3 text-sm font-medium text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Garage
                </button>
                <button
                  type="button"
                  onClick={onReturnMenu}
                  className="px-4 py-3 text-sm font-medium text-slate-200 bg-white/8 hover:bg-white/14 border border-white/10 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Menu
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md w-full bg-[#080d18] border border-white/15 rounded-2xl p-7 shadow-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 mb-2">
                <Shield className="w-4 h-4" />
                <span>Hull Critical</span>
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white">Sortie Complete</h2>

              <div className="mt-5 grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                <div>
                  <div className="text-xs text-slate-400">Final Score</div>
                  <div className="mt-0.5 text-2xl font-bold text-amber-400 font-mono-tabular">
                    {hud.score.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Best Score</div>
                  <div className="mt-0.5 text-2xl font-bold text-white font-mono-tabular">
                    {hud.highScore.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Mission</div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-100 truncate">
                    {hud.levelId === 0 ? `Endless Wave ${hud.wave}` : `Lvl ${hud.levelId}: ${hud.levelName}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Targets / Gates</div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-100 font-mono-tabular">
                    {hud.kills} / {hud.ringsCleared}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStart(hud.levelId)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenGarage}
                  className="px-4 py-3 text-sm font-medium text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 rounded-xl transition-colors cursor-pointer"
                >
                  Garage
                </button>
                <button
                  type="button"
                  onClick={onReturnMenu}
                  className="px-4 py-3 text-sm font-medium text-slate-200 bg-white/8 hover:bg-white/14 border border-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {hud.webglError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-rose-950/90 border border-rose-500/40 rounded-lg text-xs text-rose-200">
          {hud.webglError}
        </div>
      )}
    </div>
  );
}
