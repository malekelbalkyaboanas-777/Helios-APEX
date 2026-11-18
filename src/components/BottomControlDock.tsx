import { Camera, ChevronDown, ChevronUp, Crosshair, Sun, Volume2, VolumeX } from 'lucide-react';
import { CameraMode, GlowMode, PlayMode, REALM_THEMES, RealmId, WeaponMode } from '../game/types';

interface BottomControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  playMode?: PlayMode;
  cameraMode: CameraMode;
  onSelectCamera: (mode: CameraMode) => void;
  glowMode: GlowMode;
  onSelectGlow: (mode: GlowMode) => void;
  weaponMode: WeaponMode;
  onSelectWeapon: (mode: WeaponMode) => void;
  realmId: RealmId;
  onSelectRealm: (id: RealmId) => void;
  autoFire: boolean;
  onToggleAutoFire: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isPlaying: boolean;
  hidden?: boolean;
}

const CAMERA_MODES: Array<{ id: CameraMode; label: string }> = [
  { id: 'chase', label: 'Chase' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'wide', label: 'Wide' },
];

const GLOW_MODES: Array<{ id: GlowMode; label: string }> = [
  { id: 'crisp', label: 'Crisp' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'vivid', label: 'Vivid' },
];

const WEAPON_MODES: Array<{ id: WeaponMode; label: string }> = [
  { id: 'plasma', label: '1 · Plasma' },
  { id: 'spread', label: '2 · Spread' },
  { id: 'beam', label: '3 · Beam' },
];

export function BottomControlDock({
  collapsed,
  onToggleCollapse,
  playMode = 'solo',
  cameraMode,
  onSelectCamera,
  glowMode,
  onSelectGlow,
  weaponMode,
  onSelectWeapon,
  realmId,
  onSelectRealm,
  autoFire,
  onToggleAutoFire,
  muted,
  onToggleMute,
  isPlaying,
  hidden = false,
}: BottomControlDockProps) {
  if (hidden) return null;

  const isDuo = playMode !== 'solo';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[min(1180px,96vw)] pointer-events-none">
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Show Controls' : 'Hide Controls'}
        className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-[#080d18]/90 border border-white/15 rounded-t-lg hover:text-white hover:border-white/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
      </button>

      <div
        className={`pointer-events-auto transition-all duration-200 ease-out origin-bottom ${
          collapsed
            ? 'opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 bg-[#070b14]/92 border border-white/15 rounded-xl shadow-2xl">
          {/* Weapon Mode */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Weapon</span>
            <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-lg">
              {WEAPON_MODES.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectWeapon(w.id)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    weaponMode === w.id
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />

          {/* Camera Mode (Auto-framed Duo Cam in 2P / AI competition) */}
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isDuo ? (
              <div className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/12 border border-amber-400/35 rounded-lg whitespace-nowrap shrink-0">
                Duo Cam
              </div>
            ) : (
              <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-lg">
                {CAMERA_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectCamera(m.id)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      cameraMode === m.id
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />

          {/* Glow & Reflections */}
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-lg">
              {GLOW_MODES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGlow(g.id)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    glowMode === g.id
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-5 bg-white/10" aria-hidden="true" />

          {/* 6 Distinct 3D Worlds */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">World</span>
            <div className="flex flex-wrap items-center p-0.5 bg-white/5 border border-white/10 rounded-lg">
              {REALM_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectRealm(theme.id)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    realmId === theme.id
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-slate-300 hover:text-white border border-transparent'
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

          <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />

          {/* Auto-fire & Audio */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAutoFire}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoFire
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{autoFire ? 'Auto-Fire' : 'Manual'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:text-white hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{muted ? 'Muted' : 'Audio'}</span>
            </button>
          </div>

          {isPlaying && (
            <div className="hidden 2xl:flex items-center gap-2 text-[11px] text-slate-400 whitespace-nowrap pl-1">
              {playMode === 'two_player' ? (
                <>
                  <span className="text-cyan-300">P1: WASD · F/Q/E</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-orange-300">P2: Arrows · Enter/M</span>
                </>
              ) : (
                <>
                  <span>Move: Mouse / WASD</span>
                  <span aria-hidden="true">·</span>
                  <span>Moves: 2x/3x Arrows · Q/E</span>
                  <span aria-hidden="true">·</span>
                  <span>Missiles: Right-Click / M</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

