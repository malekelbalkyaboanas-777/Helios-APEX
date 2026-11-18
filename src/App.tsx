import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomControlDock } from './components/BottomControlDock';
import { GameHUD } from './components/GameHUD';
import { GameEngine } from './game/engine';
import {
  AiDifficulty,
  CameraMode,
  FloatingPopup,
  GlowMode,
  HudSnapshot,
  PlayMode,
  RealmId,
  RoundFormat,
  ShipShapeId,
  ShipSkinId,
  SpecialMoveId,
  TargetReticle,
  WeaponMode,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'menu',
  playMode: 'solo',
  aiDifficulty: 'medium',
  p2ShipShape: 'trident',
  aiShipShape: 'trident',
  roundFormat: 'single',
  roundNumber: 1,
  p1RoundWins: 0,
  rivalRoundWins: 0,
  levelId: 1,
  levelName: 'Redrock Mesa 1-1',
  levelProgress: 0,
  score: 0,
  highScore: 0,
  combo: 0,
  comboTimer: 0,
  multiplier: 1,
  wave: 1,
  hull: 5,
  maxHull: 5,
  boostEnergy: 100,
  missileReady: 100,
  overdriveTimer: 0,
  magnetTimer: 0,
  chronosTimer: 0,
  speedKmh: 0,
  kills: 0,
  ringsCleared: 0,
  earnedStars: 0,
  levelRecords: {},
  wallet: { gold: 0, silver: 0, copper: 0 },
  milestones: {
    totalKills: 0,
    totalGates: 0,
    totalShards: 0,
    highestLevelCleared: 0,
    rewardedMilestones: [],
  },
  unlockedMoves: ['roll_left', 'roll_right'],
  unlockedShips: ['valkyrie'],
  moveCooldowns: {
    roll_left: 0,
    roll_right: 0,
    triple_slash: 0,
    sky_loop: 0,
    dive_emp: 0,
    apex_barrage: 0,
  },
  activeInputBuffer: '',
  cameraMode: 'chase',
  glowMode: 'crisp',
  realmId: 0,
  shipShape: 'valkyrie',
  previewShipShape: 'valkyrie',
  previewRivalShipShape: 'trident',
  shipSkin: 'titanium',
  weaponMode: 'plasma',
  autoFire: true,
  muted: false,
  boss: null,
  rival: null,
  matchResult: null,
  bannerText: null,
  rewardNotice: null,
  webglError: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [reticles, setReticles] = useState<TargetReticle[]>([]);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(mount, (snapshot, nextReticles, nextPopups) => {
      setHud(snapshot);
      setReticles(nextReticles);
      setPopups(nextPopups);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'Enter' && hud.phase === 'menu') {
        engineRef.current?.startGame();
      } else if (e.code === 'Enter' && hud.phase === 'gameover') {
        if (hud.playMode !== 'solo' && hud.matchResult && !hud.matchResult.isSeriesFinal) {
          engineRef.current?.startNextRound();
        } else {
          engineRef.current?.startGame();
        }
      } else if (e.code === 'Enter' && hud.phase === 'levelcomplete') {
        engineRef.current?.startNextLevel();
      } else if (e.code === 'Enter' && hud.phase === 'victory') {
        engineRef.current?.skipVictoryOutro();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.phase, hud.playMode, hud.matchResult]);

  const handleStart = useCallback((levelId?: number) => engineRef.current?.startGame(levelId), []);
  const handleNextLevel = useCallback(() => engineRef.current?.startNextLevel(), []);
  const handleNextRound = useCallback(() => engineRef.current?.startNextRound(), []);
  const handleSelectLevel = useCallback((id: number) => engineRef.current?.selectLevel(id), []);
  const handleSelectPlayMode = useCallback((mode: PlayMode) => engineRef.current?.setPlayMode(mode), []);
  const handleSelectAiDifficulty = useCallback((diff: AiDifficulty) => engineRef.current?.setAiDifficulty(diff), []);
  const handleSelectP1Ship = useCallback((shape: ShipShapeId) => engineRef.current?.setP1ShipShape(shape), []);
  const handleSelectP2Ship = useCallback((shape: ShipShapeId) => engineRef.current?.setP2ShipShape(shape), []);
  const handleSelectAiShip = useCallback((shape: ShipShapeId) => engineRef.current?.setAiShipShape(shape), []);
  const handleSelectRoundFormat = useCallback((format: RoundFormat) => engineRef.current?.setRoundFormat(format), []);
  const handleOpenLevels = useCallback(() => engineRef.current?.openLevelsPage(), []);
  const handleCloseLevels = useCallback(() => engineRef.current?.closeLevelsPage(), []);
  const handleOpenGarage = useCallback(() => engineRef.current?.openGarage(), []);
  const handleCloseGarage = useCallback(() => engineRef.current?.closeGarage(), []);
  const handlePreviewShip = useCallback(
    (s: ShipShapeId, pilot: 'p1' | 'rival' = 'p1') => engineRef.current?.previewShipInGarage(s, pilot),
    []
  );
  const handleUnlockShip = useCallback(
    (s: ShipShapeId, pilot: 'p1' | 'rival' = 'p1') => {
      engineRef.current?.unlockShipWithCoins(s, pilot);
    },
    []
  );
  const handleSelectShipSkin = useCallback((s: ShipSkinId) => engineRef.current?.setShipSkin(s), []);
  const handleSelectGlow = useCallback((g: GlowMode) => engineRef.current?.setGlowMode(g), []);
  const handleUnlockMove = useCallback((m: SpecialMoveId) => {
    engineRef.current?.unlockMoveWithCoins(m);
  }, []);
  const handleTriggerSpecialMove = useCallback((m: SpecialMoveId) => {
    engineRef.current?.triggerSpecialMove(m);
  }, []);
  const handleSelectWeapon = useCallback((w: WeaponMode) => engineRef.current?.setWeaponMode(w), []);
  const handlePause = useCallback(() => engineRef.current?.pauseGame(), []);
  const handleResume = useCallback(() => engineRef.current?.resumeGame(), []);
  const handleSkipVictory = useCallback(() => engineRef.current?.skipVictoryOutro(), []);
  const handleReturnMenu = useCallback(() => engineRef.current?.returnToMenu(), []);
  const handleSelectCamera = useCallback((m: CameraMode) => engineRef.current?.setCameraMode(m), []);
  const handleSelectRealm = useCallback((id: RealmId) => engineRef.current?.setRealm(id), []);
  const handleToggleAutoFire = useCallback(() => engineRef.current?.toggleAutoFire(), []);
  const handleToggleMute = useCallback(() => engineRef.current?.toggleMute(), []);
  const handleFireMissiles = useCallback(() => engineRef.current?.fireHomingMissiles(), []);
  const handleBarrelRoll = useCallback(() => engineRef.current?.triggerSpecialMove('roll_right'), []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#060911]">
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="3D Game Viewport"
      />

      <GameHUD
        hud={hud}
        reticles={reticles}
        popups={popups}
        onStart={handleStart}
        onNextLevel={handleNextLevel}
        onNextRound={handleNextRound}
        onSelectLevel={handleSelectLevel}
        onSelectPlayMode={handleSelectPlayMode}
        onSelectAiDifficulty={handleSelectAiDifficulty}
        onSelectP1Ship={handleSelectP1Ship}
        onSelectP2Ship={handleSelectP2Ship}
        onSelectAiShip={handleSelectAiShip}
        onSelectRoundFormat={handleSelectRoundFormat}
        onSelectRealm={handleSelectRealm}
        onOpenLevels={handleOpenLevels}
        onCloseLevels={handleCloseLevels}
        onOpenGarage={handleOpenGarage}
        onCloseGarage={handleCloseGarage}
        onPreviewShip={handlePreviewShip}
        onUnlockShip={handleUnlockShip}
        onSelectShipSkin={handleSelectShipSkin}
        onSelectGlow={handleSelectGlow}
        onUnlockMove={handleUnlockMove}
        onTriggerSpecialMove={handleTriggerSpecialMove}
        onPause={handlePause}
        onResume={handleResume}
        onSkipVictory={handleSkipVictory}
        onReturnMenu={handleReturnMenu}
        onFireMissiles={handleFireMissiles}
        onBarrelRoll={handleBarrelRoll}
      />

      <BottomControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        playMode={hud.playMode}
        cameraMode={hud.cameraMode}
        onSelectCamera={handleSelectCamera}
        glowMode={hud.glowMode}
        onSelectGlow={handleSelectGlow}
        weaponMode={hud.weaponMode}
        onSelectWeapon={handleSelectWeapon}
        realmId={hud.realmId}
        onSelectRealm={handleSelectRealm}
        autoFire={hud.autoFire}
        onToggleAutoFire={handleToggleAutoFire}
        muted={hud.muted}
        onToggleMute={handleToggleMute}
        isPlaying={hud.phase === 'playing'}
        hidden={hud.phase === 'garage' || hud.phase === 'menu' || hud.phase === 'levels' || hud.phase === 'victory'}
      />
    </main>
  );
}
