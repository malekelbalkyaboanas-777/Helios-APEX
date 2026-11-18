import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SoundEngine } from './audio';
import {
  applyRealmToPalette,
  applyShipSkinToPalette,
  createMaterialPalette,
  MaterialPalette,
} from './materials';
import { CollectibleRig, EnemyRig, GateRig, GeometryBank, ObstacleRig, PlayerRig } from './models';
import {
  AI_DIFFICULTIES,
  AiDifficulty,
  CameraMode,
  CoinCost,
  CoinTier,
  CoinWallet,
  CollectibleKind,
  EnemyKind,
  FloatingPopup,
  GamePhase,
  getArenaRoundConfig,
  getLevelConfig,
  GlowMode,
  HudSnapshot,
  LevelConfig,
  LevelRecord,
  MatchResult,
  MilestoneProgress,
  PlayMode,
  REALM_THEMES,
  RealmId,
  RealmTheme,
  RivalHudSnapshot,
  ROUND_FORMATS,
  RoundFormat,
  SHIP_SHAPES,
  SHIP_SKINS,
  ShipShapeId,
  ShipSkinId,
  SPECIAL_MOVES,
  SpecialMoveId,
  TargetReticle,
  WeaponMode,
} from './types';

// Pre-allocated math helpers for zero GC inside render loop
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

const STORAGE_KEY = 'helios_apex_save_v3';

interface SavedData {
  highScore: number;
  levelRecords: Record<number, LevelRecord>;
  wallet: CoinWallet;
  milestones: MilestoneProgress;
  unlockedMoves: SpecialMoveId[];
  unlockedShips: ShipShapeId[];
}

interface ActiveEnemy {
  id: number;
  kind: EnemyKind;
  rig: EnemyRig;
  hp: number;
  maxHp: number;
  vel: THREE.Vector3;
  baseX: number;
  baseY: number;
  phaseOffset: number;
  fireCooldown: number;
  scoreValue: number;
  bossName?: string;
}

interface ActiveProjectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  isEnemy: boolean;
  owner: 'enemy' | 'p1' | 'rival';
  isMissile: boolean;
  piercing: boolean;
  hitIds: Set<number>;
  targetId: number | null;
  damage: number;
  life: number;
}

interface ActiveGate {
  rig: GateRig;
  cleared: boolean;
  clearedByRival: boolean;
}

interface ActiveCollectible {
  kind: CollectibleKind;
  rig: CollectibleRig;
  collected: boolean;
}

interface ActiveObstacle {
  rig: ObstacleRig;
  spinSpeed: number;
}

interface DebrisParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

interface ExhaustDot {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function canyonHeightAt(x: number, z: number, realmId: RealmId = 0): number {
  const absX = Math.abs(x);
  if (realmId === 5) return -40; // Deep space void
  if (realmId === 3) {
    // Cyber Metropolis: flat urban corridor + raised sidewalk/curbs on sides
    const curb = Math.max(0, (absX - 20) / 8);
    return -12.0 + Math.min(2.2, curb * 2.2);
  }

  const wallFactor = Math.max(0, (absX - 18) / 28);
  let wallHeight = Math.pow(wallFactor, 1.85) * 34;

  if (realmId === 0) {
    // Redrock Mesa Canyon: stepped sandstone terraces
    wallHeight = Math.floor(wallHeight / 5.5) * 5.5 + (wallHeight % 5.5) * 0.25;
  } else if (realmId === 1) {
    // Arctic Glacier: sharp jagged alpine ridges
    wallHeight = Math.pow(wallFactor, 1.5) * 38;
  }

  const ridge =
    realmId === 1
      ? Math.abs(Math.sin(x * 0.19 + z * 0.09)) * 4.5 + Math.abs(Math.cos(x * 0.31 - z * 0.14)) * 2.2
      : Math.sin(x * 0.14 + z * 0.08) * 2.4 +
        Math.cos(x * 0.27 - z * 0.13) * 1.4 +
        Math.sin(z * 0.05) * 1.2;

  return -12.5 + wallHeight + ridge * (0.45 + wallFactor * 1.1);
}

function buildTerrainGeometry(realmId: RealmId = 0): THREE.PlaneGeometry {
  const size = 240;
  const segs = 72;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  updateTerrainGeometry(geo, realmId);
  return geo;
}

function updateTerrainGeometry(geo: THREE.PlaneGeometry, realmId: RealmId): void {
  const theme = REALM_THEMES[realmId];
  const pos = geo.attributes.position;
  let colorAttr = geo.attributes.color as THREE.BufferAttribute | undefined;
  const colors = colorAttr ? (colorAttr.array as Float32Array) : new Float32Array(pos.count * 3);

  const [lr, lg, lb] = theme.terrainLowColor;
  const [hr, hg, hb] = theme.terrainHighColor;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = canyonHeightAt(x, z, realmId);
    pos.setY(i, y);

    const hNorm = THREE.MathUtils.clamp((y + 13) / 36, 0, 1);
    colors[i * 3] = lr + hNorm * (hr - lr);
    colors[i * 3 + 1] = lg + hNorm * (hg - lg);
    colors[i * 3 + 2] = lb + hNorm * (hb - lb);
  }

  pos.needsUpdate = true;
  if (!colorAttr) {
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  } else {
    colorAttr.needsUpdate = true;
  }
  geo.computeVertexNormals();
}

function costToCopper(cost: CoinCost): number {
  if (cost.tier === 'gold') return cost.amount * 100;
  if (cost.tier === 'silver') return cost.amount * 10;
  return cost.amount;
}

function walletTotalCopper(w: CoinWallet): number {
  return w.gold * 100 + w.silver * 10 + w.copper;
}

function normalizeWalletFromCopper(total: number): CoinWallet {
  const clamped = Math.max(0, Math.floor(total));
  const gold = Math.floor(clamped / 100);
  const remAfterGold = clamped % 100;
  const silver = Math.floor(remAfterGold / 10);
  const copper = remAfterGold % 10;
  return { gold, silver, copper };
}

export class GameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private reducedMotion: boolean;

  private sound = new SoundEngine();
  private geos!: GeometryBank;
  private pal!: MaterialPalette;

  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private playerLight!: THREE.PointLight;
  private skyMat!: THREE.ShaderMaterial;
  private skyDome!: THREE.Mesh;

  private terrainA!: THREE.Mesh;
  private terrainB!: THREE.Mesh;
  private terrainGeo!: THREE.PlaneGeometry;
  private valleyFloorA!: THREE.Mesh;
  private valleyFloorB!: THREE.Mesh;
  private valleyFloorGeo!: THREE.PlaneGeometry;
  private spireInstanced!: THREE.InstancedMesh;
  private spireMat!: THREE.MeshStandardMaterial;
  private spireBasePos: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }> = [];
  private starInstanced!: THREE.InstancedMesh;
  private starData: Array<{ x: number; y: number; z: number; speed: number }> = [];

  private garageGroup!: THREE.Group;
  private garageTrimMat!: THREE.MeshStandardMaterial;
  private garageDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  private orbitControls: OrbitControls | null = null;
  private splitCamLeft!: THREE.PerspectiveCamera;
  private splitCamRight!: THREE.PerspectiveCamera;
  private splitDragSide: 'none' | 'left' | 'right' = 'none';
  private splitDragLastX = 0;
  private splitDragLastY = 0;
  private leftGarageYaw = 0.72;
  private leftGaragePitch = 0.36;
  private leftGarageDist = 8.2;
  private rightGarageYaw = -0.72;
  private rightGaragePitch = 0.36;
  private rightGarageDist = 8.2;

  private playerRig!: PlayerRig;
  private contactShadow!: THREE.Mesh;
  private playerPos = new THREE.Vector3(0, 2, 0);
  private targetPos = new THREE.Vector3(0, 2, 0);
  private playerVel = new THREE.Vector2(0, 0);
  private playerRoll = 0;
  private playerPitch = 0;
  private barrelRollTimer = 0;
  private barrelRollDir = 1;
  private barrelRollSpins = 1;
  private skyLoopTimer = 0;
  private invulnTimer = 0;
  private recoilTimer = 0;

  private enemies: ActiveEnemy[] = [];
  private projectiles: ActiveProjectile[] = [];
  private gates: ActiveGate[] = [];
  private collectibles: ActiveCollectible[] = [];
  private obstacles: ActiveObstacle[] = [];
  private debris: DebrisParticle[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private exhaustDots: ExhaustDot[] = [];
  private popups: FloatingPopup[] = [];
  private nextPopupId = 1;

  private nextEnemyId = 1;
  private phase: GamePhase = 'menu';
  private playMode: PlayMode = 'solo';
  private aiDifficulty: AiDifficulty = 'medium';
  private p2ShipShape: ShipShapeId = 'trident';
  private aiShipShape: ShipShapeId = 'trident';
  private roundFormat: RoundFormat = 'single';
  private roundNumber = 1;
  private p1RoundWins = 0;
  private rivalRoundWins = 0;
  private cameraMode: CameraMode = 'chase';
  private glowMode: GlowMode = 'crisp';
  private realmId: RealmId = 0;
  private shipShape: ShipShapeId = 'valkyrie';
  private previewShipShape: ShipShapeId = 'valkyrie';
  private previewRivalShipShape: ShipShapeId = 'trident';
  private shipSkin: ShipSkinId = 'titanium';
  private weaponMode: WeaponMode = 'plasma';
  private autoFire = true;

  // Rival / Player 2 Flight & Combat State
  private rivalRig: PlayerRig | null = null;
  private rivalShadow!: THREE.Mesh;
  private rivalLight!: THREE.PointLight;
  private rivalPos = new THREE.Vector3(5, 2, 0);
  private rivalTargetPos = new THREE.Vector3(5, 2, 0);
  private rivalVel = new THREE.Vector2(0, 0);
  private rivalRoll = 0;
  private rivalPitch = 0;
  private rivalBarrelRollTimer = 0;
  private rivalBarrelRollDir = 1;
  private rivalBarrelRollSpins = 1;
  private rivalSkyLoopTimer = 0;
  private rivalInvulnTimer = 0;
  private rivalRecoilTimer = 0;
  private rivalAlive = false;
  private rivalHull = 5;
  private rivalMaxHull = 5;
  private rivalScore = 0;
  private rivalCombo = 0;
  private rivalComboDecayTimer = 0;
  private rivalKills = 0;
  private rivalRingsCleared = 0;
  private rivalBoostEnergy = 100;
  private rivalMissileReady = 100;
  private rivalOverdriveTimer = 0;
  private rivalMagnetTimer = 0;
  private rivalFireCooldown = 0;
  private rivalExhaustSpawnTimer = 0;
  private rivalMoveCooldowns: Record<SpecialMoveId, number> = {
    roll_left: 0,
    roll_right: 0,
    triple_slash: 0,
    sky_loop: 0,
    dive_emp: 0,
    apex_barrage: 0,
  };
  private rivalComboSeq: string[] = [];
  private rivalComboSeqTimer = 0;
  private rivalActiveShipShape: ShipShapeId = 'trident';
  private matchResult: MatchResult | null = null;

  private selectedLevelId = 1;
  private levelConfig: LevelConfig = getLevelConfig(1);
  private levelElapsed = 0;
  private levelBossSpawned = false;
  private earnedStars = 0;
  private victoryTimer = 0;
  private victoryDuration = 2.4;
  private victoryKind: 'campaign' | 'competitive' = 'campaign';
  private victoryReason = '';
  private victoryBossCleared = false;

  private score = 0;
  private highScore = 0;
  private levelRecords: Record<number, LevelRecord> = {};
  private wallet: CoinWallet = { gold: 0, silver: 0, copper: 0 };
  private milestones: MilestoneProgress = {
    totalKills: 0,
    totalGates: 0,
    totalShards: 0,
    highestLevelCleared: 0,
    rewardedMilestones: [],
  };
  private unlockedMoves: Set<SpecialMoveId> = new Set(['roll_left', 'roll_right']);
  private unlockedShips: Set<ShipShapeId> = new Set(['valkyrie', 'trident', 'titan']);
  private moveCooldowns: Record<SpecialMoveId, number> = {
    roll_left: 0,
    roll_right: 0,
    triple_slash: 0,
    sky_loop: 0,
    dive_emp: 0,
    apex_barrage: 0,
  };

  private comboSeq: string[] = [];
  private comboSeqTimer = 0;

  private combo = 0;
  private comboDecayTimer = 0;
  private wave = 1;
  private waveElapsed = 0;
  private hull = 5;
  private maxHull = 5;
  private boostEnergy = 100;
  private missileReady = 100;
  private overdriveTimer = 0;
  private magnetTimer = 0;
  private chronosTimer = 0;
  private kills = 0;
  private ringsCleared = 0;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private rewardNotice: string | null = null;
  private rewardNoticeTimer = 0;
  private screenShake = 0;

  private fireCooldown = 0;
  private spawnEnemyTimer = 1.0;
  private spawnGateTimer = 2.4;
  private spawnObstacleTimer = 3.0;
  private spawnShardTimer = 1.2;
  private exhaustSpawnTimer = 0;
  private elapsedTotal = 0;

  // Input state
  private keys = new Set<string>();
  private pointerActive = false;
  private pointerNdcX = 0;
  private pointerNdcY = 0;
  private mouseDownLeft = false;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private hudEmitTimer = 0;
  private onHudUpdate: (
    hud: HudSnapshot,
    reticles: TargetReticle[],
    popups: FloatingPopup[]
  ) => void;

  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLElement,
    onHudUpdate: (hud: HudSnapshot, reticles: TargetReticle[], popups: FloatingPopup[]) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.loadSavedData();
    this.initScene();
    this.bindEvents();
    this.emitHud([], []);
    this.clock.start();
    this.tick();
  }

  private loadSavedData(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SavedData>;
      if (typeof parsed.highScore === 'number') this.highScore = parsed.highScore;
      if (parsed.levelRecords) this.levelRecords = parsed.levelRecords;
      if (parsed.wallet) this.wallet = parsed.wallet;
      if (parsed.milestones) this.milestones = { ...this.milestones, ...parsed.milestones };
      if (Array.isArray(parsed.unlockedMoves)) {
        parsed.unlockedMoves.forEach((m) => this.unlockedMoves.add(m));
      }
      if (Array.isArray(parsed.unlockedShips)) {
        parsed.unlockedShips.forEach((s) => this.unlockedShips.add(s));
      }
    } catch {
      // ignore storage errors
    }
    this.syncLevelUnlocks();
    this.selectedLevelId = Math.min(100, Math.max(1, this.milestones.highestLevelCleared + 1));
    this.levelConfig = getLevelConfig(this.selectedLevelId);
    this.realmId = this.levelConfig.realmId;
  }

  private saveData(): void {
    try {
      const data: SavedData = {
        highScore: this.highScore,
        levelRecords: this.levelRecords,
        wallet: this.wallet,
        milestones: this.milestones,
        unlockedMoves: Array.from(this.unlockedMoves),
        unlockedShips: Array.from(this.unlockedShips),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  }

  private syncLevelUnlocks(): void {
    const highest = this.milestones.highestLevelCleared;
    SPECIAL_MOVES.forEach((m) => {
      if (m.unlockLevel <= highest) this.unlockedMoves.add(m.id);
    });
    SHIP_SHAPES.forEach((s) => {
      if (s.unlockLevel !== null && s.unlockLevel <= highest) this.unlockedShips.add(s.id);
    });
  }

  private initScene(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const theme = REALM_THEMES[this.realmId];
    const skin = SHIP_SKINS.find((s) => s.id === this.shipSkin) || SHIP_SKINS[0];

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      this.emitHud([], [], 'WebGL is unavailable in this browser.');
      return;
    }

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.52;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.2, 340);
    this.camera.position.set(0, 6.2, 13.5);

    const halfAspect = Math.max(0.4, Math.floor(width / 2) / height);
    this.splitCamLeft = new THREE.PerspectiveCamera(46, halfAspect, 0.2, 340);
    this.splitCamRight = new THREE.PerspectiveCamera(46, halfAspect, 0.2, 340);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enabled = false;
    this.orbitControls.enablePan = false;
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.minDistance = 4.2;
    this.orbitControls.maxDistance = 15.5;
    this.orbitControls.maxPolarAngle = Math.PI * 0.52;
    this.orbitControls.target.set(0, 1.4, 0);

    const skyGeo = new THREE.SphereGeometry(260, 32, 20);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(theme.skyTop) },
        bottomColor: { value: new THREE.Color(theme.skyHorizon) },
        sunDir: { value: new THREE.Vector3(0.38, 0.24, -0.89).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = dir.y;
          float t = smoothstep(-0.14, 0.58, h);
          vec3 sky = mix(bottomColor, topColor, t);
          float sunAmt = max(dot(dir, sunDir), 0.0);
          sky += bottomColor * pow(sunAmt, 14.0) * 0.35;
          sky += vec3(1.0, 0.94, 0.85) * pow(sunAmt, 140.0) * 0.55;
          float cloudBand = smoothstep(0.02, 0.28, h) * (1.0 - smoothstep(0.28, 0.58, h));
          float wisp = sin(dir.x * 11.0 + dir.z * 7.0) * cos(dir.z * 13.0 - dir.x * 5.0);
          sky += bottomColor * max(0.0, wisp) * cloudBand * 0.12;
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyDome);

    this.hemiLight = new THREE.HemisphereLight(theme.hemiSkyColor, theme.hemiGroundColor, 0.88);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(theme.keyLightColor, theme.keyLightIntensity);
    this.keyLight.position.set(22, 38, 18);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 110;
    this.keyLight.shadow.camera.left = -28;
    this.keyLight.shadow.camera.right = 28;
    this.keyLight.shadow.camera.top = 28;
    this.keyLight.shadow.camera.bottom = -28;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(theme.rimLightColor, 0.95);
    this.rimLight.position.set(-18, 14, -30);
    this.scene.add(this.rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.geos = new GeometryBank();
    this.pal = createMaterialPalette(theme, skin, maxAniso, this.isSoftwareGl);

    this.terrainGeo = buildTerrainGeometry(this.realmId);
    this.terrainA = new THREE.Mesh(this.terrainGeo, this.pal.terrainMat);
    this.terrainA.receiveShadow = true;
    this.terrainA.position.z = -100;
    const wireA = new THREE.Mesh(this.terrainGeo, this.pal.terrainWireMat);
    wireA.position.y = 0.05;
    this.terrainA.add(wireA);

    this.terrainB = new THREE.Mesh(this.terrainGeo, this.pal.terrainMat);
    this.terrainB.receiveShadow = true;
    this.terrainB.position.z = -340;
    const wireB = new THREE.Mesh(this.terrainGeo, this.pal.terrainWireMat);
    wireB.position.y = 0.05;
    this.terrainB.add(wireB);

    this.scene.add(this.terrainA, this.terrainB);

    this.valleyFloorGeo = new THREE.PlaneGeometry(38, 240);
    this.valleyFloorGeo.rotateX(-Math.PI / 2);
    this.valleyFloorA = new THREE.Mesh(this.valleyFloorGeo, this.pal.valleyHighwayMat);
    this.valleyFloorA.position.set(0, -11.6, -100);
    this.valleyFloorA.receiveShadow = true;
    this.valleyFloorB = new THREE.Mesh(this.valleyFloorGeo, this.pal.valleyHighwayMat);
    this.valleyFloorB.position.set(0, -11.6, -340);
    this.valleyFloorB.receiveShadow = true;
    this.scene.add(this.valleyFloorA, this.valleyFloorB);

    this.spireMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.28,
      roughness: 0.58,
    });
    const spireGeo = this.createWorldPropGeo(theme.propKind);
    const spireCount = 140;
    this.spireInstanced = new THREE.InstancedMesh(spireGeo, this.spireMat, spireCount);
    this.spireInstanced.frustumCulled = false;

    for (let i = 0; i < spireCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (22 + Math.random() * 44);
      const z = -Math.random() * 240;
      const y = canyonHeightAt(x, z, this.realmId) + 2.5;
      const sx = 0.8 + Math.random() * 1.9;
      const sy = 2.4 + Math.random() * 6.5;
      const sz = 0.8 + Math.random() * 1.9;
      const ry = Math.random() * Math.PI * 2;
      this.spireBasePos.push({ x, y, z, sx, sy, sz, ry });
    }
    this.scene.add(this.spireInstanced);

    const starGeo = new THREE.BoxGeometry(0.08, 0.08, 1.4);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.5,
    });
    const starCount = 420;
    this.starInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);
    this.starInstanced.frustumCulled = false;
    for (let i = 0; i < starCount; i++) {
      this.starData.push({
        x: (Math.random() - 0.5) * 95,
        y: -4 + Math.random() * 38,
        z: -Math.random() * 220,
        speed: 0.8 + Math.random() * 0.8,
      });
    }
    this.scene.add(this.starInstanced);

    this.buildGarageStage();

    this.playerLight = new THREE.PointLight(0x38bdf8, 1.0, 12, 1.8);
    this.rivalLight = new THREE.PointLight(0xf97316, 1.0, 12, 1.8);
    this.rebuildPlayerShip();
    this.rebuildRivalShip();

    const shadowGeo = new THREE.PlaneGeometry(5.5, 5.5);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.pal.contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(this.contactShadow);

    this.rivalShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.rivalShadow.visible = false;
    this.scene.add(this.rivalShadow);

    this.applyWorldVisuals(this.realmId);

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.16, 0.25, 0.94);
      this.composer.addPass(this.bloomPass);
      this.applyGlowSettings();
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildGarageStage(): void {
    this.garageGroup = new THREE.Group();
    this.garageGroup.visible = false;

    const floorGeo = new THREE.CylinderGeometry(18, 18, 0.4, 48);
    const floorMesh = new THREE.Mesh(floorGeo, this.pal.garageFloorMat);
    floorMesh.position.y = -0.25;
    floorMesh.receiveShadow = true;
    this.garageGroup.add(floorMesh);

    const plinthGeo = new THREE.CylinderGeometry(4.2, 4.7, 0.28, 48);
    const plinthMesh = new THREE.Mesh(plinthGeo, this.pal.garageRingMat);
    plinthMesh.position.y = 0.08;
    plinthMesh.receiveShadow = true;
    this.garageGroup.add(plinthMesh);

    const trimRingGeo = new THREE.TorusGeometry(4.35, 0.07, 10, 64);
    trimRingGeo.rotateX(Math.PI / 2);
    const trimRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.garageTrimMat = trimRingMat;
    const trimRingMesh = new THREE.Mesh(trimRingGeo, trimRingMat);
    trimRingMesh.position.y = 0.21;
    this.garageGroup.add(trimRingMesh);

    const outerRingGeo = new THREE.TorusGeometry(7.2, 0.05, 8, 64);
    outerRingGeo.rotateX(Math.PI / 2);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, this.pal.garageRingMat);
    outerRingMesh.position.y = -0.02;
    this.garageGroup.add(outerRingMesh);

    // Architectural garage pillars around turntable perimeter
    const pillarGeo = new THREE.BoxGeometry(0.45, 7.5, 0.85);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const p = new THREE.Mesh(pillarGeo, this.pal.hullDark);
      p.position.set(Math.cos(ang) * 14.5, 3.6, Math.sin(ang) * 14.5);
      p.rotation.y = -ang;
      this.garageGroup.add(p);
    }

    this.garageDisposables.push(floorGeo, plinthGeo, trimRingGeo, trimRingMat, outerRingGeo, pillarGeo);
    this.scene.add(this.garageGroup);
  }

  private mergeWorldPropParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const normalized = parts.map((p) => (p.index ? p.toNonIndexed() : p.clone()));
    const merged = mergeGeometries(normalized, false);
    normalized.forEach((p) => p.dispose());
    parts.forEach((p) => p.dispose());
    return merged || new THREE.BoxGeometry(2, 2, 2);
  }

  private createWorldPropGeo(kind: RealmTheme['propKind']): THREE.BufferGeometry {
    if (kind === 'mesa') {
      // Multi-tiered eroded sandstone butte
      const base = new THREE.CylinderGeometry(1.65, 2.35, 0.85, 9);
      const mid = new THREE.CylinderGeometry(1.25, 1.68, 0.85, 8);
      mid.translate(0.1, 0.82, -0.06);
      const cap = new THREE.CylinderGeometry(0.92, 1.15, 0.48, 8);
      cap.translate(0.05, 1.46, 0.04);
      return this.mergeWorldPropParts([base, mid, cap]);
    }
    if (kind === 'glacier') {
      // Clustered crystalline alpine spires
      const p1 = new THREE.ConeGeometry(1.35, 2.7, 7);
      p1.translate(0, 0.4, 0);
      const p2 = new THREE.ConeGeometry(0.95, 1.85, 6);
      p2.translate(0.85, -0.1, 0.45);
      const p3 = new THREE.ConeGeometry(0.85, 1.65, 6);
      p3.translate(-0.78, -0.15, -0.4);
      return this.mergeWorldPropParts([p1, p2, p3]);
    }
    if (kind === 'skyscraper') {
      // Stepped architectural tower with setback penthouse & twin radio antennas
      const main = new THREE.BoxGeometry(2.8, 3.0, 2.8);
      const setback = new THREE.BoxGeometry(2.05, 0.75, 2.05);
      setback.translate(0, 1.85, 0);
      const crown = new THREE.BoxGeometry(1.15, 0.42, 1.15);
      crown.translate(0, 2.42, 0);
      const ant1 = new THREE.CylinderGeometry(0.04, 0.06, 0.72, 6);
      ant1.translate(-0.28, 2.95, 0);
      const ant2 = new THREE.CylinderGeometry(0.04, 0.06, 0.55, 6);
      ant2.translate(0.28, 2.86, 0);
      return this.mergeWorldPropParts([main, setback, crown, ant1, ant2]);
    }
    if (kind === 'temple') {
      // Stepped jungle ziggurat pyramid + canopy terrace
      const s1 = new THREE.BoxGeometry(3.2, 0.75, 3.2);
      const s2 = new THREE.BoxGeometry(2.35, 0.72, 2.35);
      s2.translate(0, 0.72, 0);
      const s3 = new THREE.BoxGeometry(1.5, 0.68, 1.5);
      s3.translate(0, 1.4, 0);
      const shrine = new THREE.CylinderGeometry(0.45, 0.65, 0.6, 6);
      shrine.translate(0, 2.02, 0);
      return this.mergeWorldPropParts([s1, s2, s3, shrine]);
    }
    if (kind === 'asteroid') {
      // Cratered displaced organic space asteroid boulder
      const rock = new THREE.IcosahedronGeometry(1.85, 2);
      const pos = rock.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const n = 0.8 + 0.28 * Math.sin(vx * 2.2 + vy * 1.5) * Math.cos(vz * 2.4 - vx);
        pos.setXYZ(i, vx * n, vy * n, vz * n);
      }
      rock.computeVertexNormals();
      return rock;
    }
    // Clustered hexagonal volcanic basalt columns
    const c1 = new THREE.CylinderGeometry(0.85, 1.1, 2.4, 6);
    c1.translate(0, 0.25, 0);
    const c2 = new THREE.CylinderGeometry(0.65, 0.85, 1.75, 6);
    c2.translate(0.9, -0.1, 0.45);
    const c3 = new THREE.CylinderGeometry(0.58, 0.78, 1.55, 6);
    c3.translate(-0.82, -0.2, -0.35);
    return this.mergeWorldPropParts([c1, c2, c3]);
  }

  private getRivalShipShape(): ShipShapeId {
    if (this.playMode === 'ai_compete') {
      return this.aiShipShape;
    }
    return this.p2ShipShape;
  }

  private rebuildPlayerShip(shapeOverride?: ShipShapeId): void {
    const activeShape = shapeOverride ?? (this.phase === 'garage' ? this.previewShipShape : this.shipShape);
    if (this.playerRig) {
      this.playerRig.group.remove(this.playerLight);
      this.scene.remove(this.playerRig.group);
    }
    const isLockedVault = this.phase === 'garage' && !this.unlockedShips.has(activeShape);
    this.playerRig = isLockedVault
      ? this.geos.createLockedVaultShip(this.pal)
      : this.geos.createPlayerShip(activeShape, this.pal, 'p1');
    this.playerRig.group.position.copy(this.playerPos);
    this.playerLight.position.set(0, 0, 2.6);
    this.playerRig.group.add(this.playerLight);
    this.scene.add(this.playerRig.group);
  }

  private rebuildRivalShip(shapeOverride?: ShipShapeId): void {
    if (this.rivalRig) {
      this.rivalRig.group.remove(this.rivalLight);
      this.scene.remove(this.rivalRig.group);
    }
    const activeShape =
      shapeOverride ?? (this.phase === 'garage' ? this.previewRivalShipShape : this.getRivalShipShape());
    this.rivalActiveShipShape = activeShape;
    const isLockedVault = this.phase === 'garage' && !this.unlockedShips.has(activeShape);
    this.rivalRig = isLockedVault
      ? this.geos.createLockedVaultShip(this.pal)
      : this.geos.createPlayerShip(activeShape, this.pal, 'rival');
    this.rivalRig.group.position.copy(this.rivalPos);
    this.rivalLight.position.set(0, 0, 2.6);
    this.rivalRig.group.add(this.rivalLight);
    this.rivalRig.group.visible = this.phase === 'garage' && this.playMode !== 'solo';
    this.scene.add(this.rivalRig.group);
  }

  private bindEvents(): void {
    const onResize = () => this.handleResize();
    window.addEventListener('resize', onResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      this.sound.unlock();
      const code = e.code;

      if (
        this.phase === 'playing' &&
        (code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space')
      ) {
        e.preventDefault();
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (this.phase === 'playing') this.pauseGame();
        else if (this.phase === 'paused') this.resumeGame();
        else if (this.phase === 'garage') this.closeGarage();
        else if (this.phase === 'levels') this.closeLevelsPage();
        return;
      }

      if (code === 'KeyC' && (this.phase === 'playing' || this.phase === 'paused')) {
        this.cycleCameraMode();
        return;
      }

      if (code === 'Digit1') this.setWeaponMode('plasma');
      if (code === 'Digit2') this.setWeaponMode('spread');
      if (code === 'Digit3') this.setWeaponMode('beam');

      if (this.phase === 'playing' && !e.repeat) {
        if (this.playMode === 'two_player') {
          // Player 1 Special Moves & Missiles (Q/E/B/F + 2x/3x WASD)
          if (code === 'KeyQ') this.triggerSpecialMove('roll_left');
          else if (code === 'KeyE') this.triggerSpecialMove('roll_right');
          else if (code === 'KeyB') this.triggerSpecialMove('apex_barrage');
          else if (code === 'KeyF') this.fireHomingMissiles();

          let p1Token = '';
          if (code === 'KeyA') p1Token = '←';
          else if (code === 'KeyD') p1Token = '→';
          else if (code === 'KeyW') p1Token = '↑';
          else if (code === 'KeyS') p1Token = '↓';
          if (p1Token) this.pushDirectionalCombo(p1Token);

          // Player 2 Special Moves & Missiles (Enter/Numpad0/M + 2x/3x Arrows)
          if (code === 'Enter' || code === 'Numpad0' || code === 'KeyM') {
            this.fireRivalHomingMissiles();
          }
          let p2Token = '';
          if (code === 'ArrowLeft') p2Token = '←';
          else if (code === 'ArrowRight') p2Token = '→';
          else if (code === 'ArrowUp') p2Token = '↑';
          else if (code === 'ArrowDown') p2Token = '↓';
          if (p2Token) this.pushRivalDirectionalCombo(p2Token);
        } else {
          if (code === 'KeyQ') this.triggerSpecialMove('roll_left');
          else if (code === 'KeyE') this.triggerSpecialMove('roll_right');
          else if (code === 'KeyB') this.triggerSpecialMove('apex_barrage');
          else if (code === 'KeyM' || code === 'KeyF') this.fireHomingMissiles();

          // Directional Combo Detector (Arrows or WASD)
          let dirToken = '';
          if (code === 'ArrowLeft' || code === 'KeyA') dirToken = '←';
          else if (code === 'ArrowRight' || code === 'KeyD') dirToken = '→';
          else if (code === 'ArrowUp' || code === 'KeyW') dirToken = '↑';
          else if (code === 'ArrowDown' || code === 'KeyS') dirToken = '↓';

          if (dirToken) {
            this.pushDirectionalCombo(dirToken);
          }
        }
      }

      this.keys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      if (this.phase === 'garage' && this.playMode !== 'solo' && this.splitDragSide !== 'none') {
        const dx = e.clientX - this.splitDragLastX;
        const dy = e.clientY - this.splitDragLastY;
        this.splitDragLastX = e.clientX;
        this.splitDragLastY = e.clientY;
        if (this.splitDragSide === 'left') {
          this.leftGarageYaw -= dx * 0.008;
          this.leftGaragePitch = THREE.MathUtils.clamp(this.leftGaragePitch + dy * 0.006, 0.12, 1.15);
        } else {
          this.rightGarageYaw -= dx * 0.008;
          this.rightGaragePitch = THREE.MathUtils.clamp(this.rightGaragePitch + dy * 0.006, 0.12, 1.15);
        }
        return;
      }

      this.pointerActive = true;
      this.pointerNdcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const onPointerDown = (e: PointerEvent) => {
      this.sound.unlock();
      if (this.phase === 'garage' && this.playMode !== 'solo') {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.splitDragSide = e.clientX - rect.left < rect.width * 0.5 ? 'left' : 'right';
        this.splitDragLastX = e.clientX;
        this.splitDragLastY = e.clientY;
        return;
      }
      if (this.phase !== 'playing') return;
      if (e.button === 0) this.mouseDownLeft = true;
      else if (e.button === 2) this.fireHomingMissiles();
    };

    const onPointerUp = (e: PointerEvent) => {
      this.splitDragSide = 'none';
      if (e.button === 0) this.mouseDownLeft = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (this.phase === 'garage' && this.playMode !== 'solo') {
        e.preventDefault();
        const rect = this.renderer.domElement.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width * 0.5;
        if (isLeft) {
          this.leftGarageDist = THREE.MathUtils.clamp(this.leftGarageDist + e.deltaY * 0.006, 4.6, 14.5);
        } else {
          this.rightGarageDist = THREE.MathUtils.clamp(this.rightGarageDist + e.deltaY * 0.006, 4.6, 14.5);
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (this.phase === 'playing') e.preventDefault();
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      this.emitHud([], [], 'WebGL context interrupted. Restoring...');
    };

    const onContextRestored = () => {
      this.emitHud([], [], null);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.renderer.domElement.addEventListener('pointermove', onPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    this.renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    this.renderer.domElement.addEventListener('contextmenu', onContextMenu);
    this.renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    this.cleanupListeners = () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onPointerUp);
      if (this.renderer?.domElement) {
        this.renderer.domElement.removeEventListener('pointermove', onPointerMove);
        this.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        this.renderer.domElement.removeEventListener('wheel', onWheel);
        this.renderer.domElement.removeEventListener('contextmenu', onContextMenu);
        this.renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        this.renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      }
      this.resizeObserver?.disconnect();
    };
  }

  private pushDirectionalCombo(token: string): void {
    this.comboSeq.push(token);
    if (this.comboSeq.length > 4) this.comboSeq.shift();
    this.comboSeqTimer = 0.45;

    const seq = this.comboSeq.join('');

    // 3-arrow special moves take priority when unlocked!
    if (seq.endsWith('←←←') || seq.endsWith('→→→')) {
      if (this.unlockedMoves.has('triple_slash') && this.moveCooldowns.triple_slash <= 0) {
        this.triggerSpecialMove('triple_slash', seq.endsWith('←←←') ? 1 : -1);
        this.comboSeq = [];
        return;
      }
    }

    // 3-tap Up-Down-Up / Left-Right-Left -> Apex Nova Barrage
    if (seq.endsWith('↑↓↑') || seq.endsWith('←→←')) {
      if (this.unlockedMoves.has('apex_barrage') && this.moveCooldowns.apex_barrage <= 0) {
        this.triggerSpecialMove('apex_barrage');
        this.comboSeq = [];
        return;
      }
    }

    // 2-tap Left / Right -> Barrel Roll (keeps buffer alive briefly in case user presses 3rd arrow!)
    if (seq.endsWith('←←')) {
      this.triggerSpecialMove('roll_left');
      return;
    }
    if (seq.endsWith('→→')) {
      this.triggerSpecialMove('roll_right');
      return;
    }

    // 2-tap Up -> Sky-Loop Solar Nova
    if (seq.endsWith('↑↑')) {
      if (this.unlockedMoves.has('sky_loop') && this.moveCooldowns.sky_loop <= 0) {
        this.triggerSpecialMove('sky_loop');
        this.comboSeq = [];
      } else if (!this.unlockedMoves.has('sky_loop')) {
        this.showBanner('Sky-Loop Locked (Pass Lvl 4 or Buy in Armory)', 1.6);
      }
      return;
    }

    // 2-tap Down -> Hyper Dive-Slam EMP
    if (seq.endsWith('↓↓')) {
      if (this.unlockedMoves.has('dive_emp') && this.moveCooldowns.dive_emp <= 0) {
        this.triggerSpecialMove('dive_emp');
        this.comboSeq = [];
      } else if (!this.unlockedMoves.has('dive_emp')) {
        this.showBanner('Dive-Slam EMP Locked (Pass Lvl 5 or Buy 6 Cu)', 1.6);
      }
    }
  }

  public triggerSpecialMove(moveId: SpecialMoveId, dirOverride?: number): void {
    if (this.phase !== 'playing') return;
    if (!this.unlockedMoves.has(moveId)) {
      const info = SPECIAL_MOVES.find((m) => m.id === moveId);
      if (info) this.showBanner(`${info.name} Locked (Lvl ${info.unlockLevel} or ${info.cost.amount} ${info.cost.tier})`, 1.8);
      return;
    }
    if (this.moveCooldowns[moveId] > 0) return;

    const info = SPECIAL_MOVES.find((m) => m.id === moveId);
    if (info) this.moveCooldowns[moveId] = info.cooldownSec;

    if (moveId === 'roll_left' || moveId === 'roll_right') {
      const dur = this.shipShape === 'trident' ? 0.36 : 0.44;
      this.barrelRollTimer = dur;
      this.barrelRollDir = moveId === 'roll_left' ? 1 : -1;
      this.barrelRollSpins = 1;
      this.invulnTimer = Math.max(this.invulnTimer, dur + 0.05);
      this.sound.playBarrelRoll();
    } else if (moveId === 'triple_slash') {
      const dir = dirOverride ?? 1;
      this.barrelRollTimer = 0.65;
      this.barrelRollDir = dir;
      this.barrelRollSpins = 3;
      this.invulnTimer = Math.max(this.invulnTimer, 0.85);
      this.targetPos.x = THREE.MathUtils.clamp(this.targetPos.x - dir * 8.5, -15.5, 15.5);
      this.sound.playBarrelRoll();
      this.sound.playLaser(true, 'spread');
      // Fire 7-bolt fan plasma arc
      for (let k = -3; k <= 3; k++) {
        const bolt = new THREE.Mesh(this.geos.laserGeo, this.pal.laserOverdrive);
        bolt.position.set(this.playerPos.x + k * 0.45, this.playerPos.y, this.playerPos.z - 2.2);
        this.scene.add(bolt);
        this.projectiles.push({
          mesh: bolt,
          vel: new THREE.Vector3(k * 12, 0, -155),
          isEnemy: false,
          owner: 'p1',
          isMissile: false,
          piercing: false,
          hitIds: new Set<number>(),
          targetId: null,
          damage: 2.2,
          life: 1.4,
        });
      }
      this.showBanner('Sonic Side-Flip Fan!', 1.4);
    } else if (moveId === 'sky_loop') {
      this.skyLoopTimer = 0.62;
      this.invulnTimer = Math.max(this.invulnTimer, 0.9);
      this.sound.playOverdrive();
      this.spawnShockwave(this.playerPos, 18, true);
      // Clear nearby enemy projectiles & damage enemies in range
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        if (this.projectiles[i].isEnemy && this.projectiles[i].mesh.position.distanceTo(this.playerPos) < 35) {
          this.scene.remove(this.projectiles[i].mesh);
          this.projectiles.splice(i, 1);
        }
      }
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.enemies[i].rig.group.position.distanceTo(this.playerPos) < 55) {
          this.enemies[i].hp -= 6;
          if (this.enemies[i].hp <= 0) {
            this.destroyEnemy(i, 'p1');
            if ((this.phase as GamePhase) !== 'playing') return;
          }
        }
      }
      this.showBanner('Sky-Loop Solar Nova!', 1.5);
    } else if (moveId === 'dive_emp') {
      this.targetPos.y = THREE.MathUtils.clamp(this.targetPos.y - 4.5, -5.5, 11.0);
      this.chronosTimer = Math.max(this.chronosTimer, 4.0);
      this.invulnTimer = Math.max(this.invulnTimer, 0.75);
      this.sound.playRingBoost();
      this.spawnShockwave(this.playerPos, 14, true);
      this.showBanner('Hyper Dive-Slam EMP!', 1.5);
    } else if (moveId === 'apex_barrage') {
      this.overdriveTimer = Math.max(this.overdriveTimer, 3.5);
      this.invulnTimer = Math.max(this.invulnTimer, 3.5);
      this.sound.playOverdrive();
      this.sound.playMissile();
      const sorted = [...this.enemies].sort(
        (a, b) => a.rig.group.position.distanceTo(this.playerPos) - b.rig.group.position.distanceTo(this.playerPos)
      );
      for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(this.geos.missileGeo, this.pal.laserOverdrive);
        const angle = (i / 8) * Math.PI * 2;
        mesh.position.set(
          this.playerPos.x + Math.cos(angle) * 2.0,
          this.playerPos.y + Math.sin(angle) * 1.4,
          this.playerPos.z - 2.0
        );
        const target = sorted.length > 0 ? sorted[i % sorted.length] : null;
        this.scene.add(mesh);
        this.projectiles.push({
          mesh,
          vel: new THREE.Vector3(Math.cos(angle) * 24, Math.sin(angle) * 16, -78),
          isEnemy: false,
          owner: 'p1',
          isMissile: true,
          piercing: false,
          hitIds: new Set<number>(),
          targetId: target ? target.id : null,
          damage: 5,
          life: 3.8,
        });
      }
      this.showBanner('Apex Nova Barrage!', 1.8);
    }
  }

  private pushRivalDirectionalCombo(token: string): void {
    this.rivalComboSeq.push(token);
    if (this.rivalComboSeq.length > 4) this.rivalComboSeq.shift();
    this.rivalComboSeqTimer = 0.45;

    const seq = this.rivalComboSeq.join('');
    if (seq.endsWith('←←←') || seq.endsWith('→→→')) {
      if (this.rivalMoveCooldowns.triple_slash <= 0) {
        this.triggerRivalSpecialMove('triple_slash', seq.endsWith('←←←') ? 1 : -1);
        this.rivalComboSeq = [];
        return;
      }
    }
    if (seq.endsWith('↑↓↑') || seq.endsWith('←→←')) {
      if (this.rivalMoveCooldowns.apex_barrage <= 0) {
        this.triggerRivalSpecialMove('apex_barrage');
        this.rivalComboSeq = [];
        return;
      }
    }
    if (seq.endsWith('←←')) {
      this.triggerRivalSpecialMove('roll_left');
      return;
    }
    if (seq.endsWith('→→')) {
      this.triggerRivalSpecialMove('roll_right');
      return;
    }
    if (seq.endsWith('↑↑')) {
      if (this.rivalMoveCooldowns.sky_loop <= 0) {
        this.triggerRivalSpecialMove('sky_loop');
        this.rivalComboSeq = [];
      }
      return;
    }
    if (seq.endsWith('↓↓')) {
      if (this.rivalMoveCooldowns.dive_emp <= 0) {
        this.triggerRivalSpecialMove('dive_emp');
        this.rivalComboSeq = [];
      }
    }
  }

  private triggerRivalSpecialMove(moveId: SpecialMoveId, dirOverride?: number): void {
    if (this.phase !== 'playing' || !this.rivalAlive) return;
    if (this.rivalMoveCooldowns[moveId] > 0) return;

    const info = SPECIAL_MOVES.find((m) => m.id === moveId);
    if (info) this.rivalMoveCooldowns[moveId] = info.cooldownSec;

    if (moveId === 'roll_left' || moveId === 'roll_right') {
      const dur = this.rivalActiveShipShape === 'trident' ? 0.36 : 0.44;
      this.rivalBarrelRollTimer = dur;
      this.rivalBarrelRollDir = moveId === 'roll_left' ? 1 : -1;
      this.rivalBarrelRollSpins = 1;
      this.rivalInvulnTimer = Math.max(this.rivalInvulnTimer, dur + 0.05);
      this.sound.playBarrelRoll();
    } else if (moveId === 'triple_slash') {
      const dir = dirOverride ?? 1;
      this.rivalBarrelRollTimer = 0.65;
      this.rivalBarrelRollDir = dir;
      this.rivalBarrelRollSpins = 3;
      this.rivalInvulnTimer = Math.max(this.rivalInvulnTimer, 0.85);
      this.rivalTargetPos.x = THREE.MathUtils.clamp(this.rivalTargetPos.x - dir * 8.5, -15.5, 15.5);
      this.sound.playBarrelRoll();
      for (let k = -3; k <= 3; k++) {
        const bolt = new THREE.Mesh(this.geos.laserGeo, this.pal.rivalLaser);
        bolt.position.set(this.rivalPos.x + k * 0.45, this.rivalPos.y, this.rivalPos.z - 2.2);
        this.scene.add(bolt);
        this.projectiles.push({
          mesh: bolt,
          vel: new THREE.Vector3(k * 12, 0, -155),
          isEnemy: false,
          owner: 'rival',
          isMissile: false,
          piercing: false,
          hitIds: new Set<number>(),
          targetId: null,
          damage: 2.2,
          life: 1.4,
        });
      }
    } else if (moveId === 'sky_loop') {
      this.rivalSkyLoopTimer = 0.62;
      this.rivalInvulnTimer = Math.max(this.rivalInvulnTimer, 0.9);
      this.spawnShockwave(this.rivalPos, 16, false);
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.enemies[i].rig.group.position.distanceTo(this.rivalPos) < 50) {
          this.enemies[i].hp -= 6;
          if (this.enemies[i].hp <= 0) {
            this.destroyEnemy(i, 'rival');
            if ((this.phase as GamePhase) !== 'playing') return;
          }
        }
      }
    } else if (moveId === 'dive_emp') {
      this.rivalTargetPos.y = THREE.MathUtils.clamp(this.rivalTargetPos.y - 4.5, -5.5, 11.0);
      this.rivalInvulnTimer = Math.max(this.rivalInvulnTimer, 0.75);
      this.spawnShockwave(this.rivalPos, 13, false);
    } else if (moveId === 'apex_barrage') {
      this.rivalOverdriveTimer = Math.max(this.rivalOverdriveTimer, 3.5);
      this.rivalInvulnTimer = Math.max(this.rivalInvulnTimer, 3.5);
      this.sound.playMissile();
      const sorted = [...this.enemies].sort(
        (a, b) => a.rig.group.position.distanceTo(this.rivalPos) - b.rig.group.position.distanceTo(this.rivalPos)
      );
      for (let i = 0; i < 6; i++) {
        const mesh = new THREE.Mesh(this.geos.missileGeo, this.pal.rivalLaser);
        const angle = (i / 6) * Math.PI * 2;
        mesh.position.set(
          this.rivalPos.x + Math.cos(angle) * 2.0,
          this.rivalPos.y + Math.sin(angle) * 1.4,
          this.rivalPos.z - 2.0
        );
        const target = sorted.length > 0 ? sorted[i % sorted.length] : null;
        this.scene.add(mesh);
        this.projectiles.push({
          mesh,
          vel: new THREE.Vector3(Math.cos(angle) * 24, Math.sin(angle) * 16, -78),
          isEnemy: false,
          owner: 'rival',
          isMissile: true,
          piercing: false,
          hitIds: new Set<number>(),
          targetId: target ? target.id : null,
          damage: 4.5,
          life: 3.8,
        });
      }
    }
  }

  private cleanupListeners: () => void = () => {};

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.splitCamLeft && this.splitCamRight) {
      const halfW = Math.max(1, Math.floor(width / 2));
      const rightW = Math.max(1, width - halfW);
      this.splitCamLeft.aspect = halfW / height;
      this.splitCamLeft.updateProjectionMatrix();
      this.splitCamRight.aspect = rightW / height;
      this.splitCamRight.updateProjectionMatrix();
    }
    this.renderer.setSize(width, height);
    if (this.composer) this.composer.setSize(width, height);
    if (this.bloomPass) this.bloomPass.resolution.set(width, height);
  }

  // Coin & Armory Methods
  private awardCoins(tier: CoinTier, amount: number, reason: string): void {
    this.wallet[tier] += amount;
    const label = tier === 'gold' ? 'Gold' : tier === 'silver' ? 'Silver' : 'Copper';
    this.showRewardNotice(`${reason} · +${amount} ${label} Coins`);
    this.saveData();
  }

  public canAfford(cost: CoinCost): boolean {
    if (cost.amount === 0) return true;
    return walletTotalCopper(this.wallet) >= costToCopper(cost);
  }

  private spendCost(cost: CoinCost): boolean {
    const needed = costToCopper(cost);
    const total = walletTotalCopper(this.wallet);
    if (total < needed) return false;
    this.wallet = normalizeWalletFromCopper(total - needed);
    this.saveData();
    return true;
  }

  public unlockMoveWithCoins(moveId: SpecialMoveId): boolean {
    if (this.unlockedMoves.has(moveId)) return true;
    const info = SPECIAL_MOVES.find((m) => m.id === moveId);
    if (!info) return false;
    if (!this.spendCost(info.cost)) return false;
    this.unlockedMoves.add(moveId);
    this.sound.playOverdrive();
    this.showRewardNotice(`Unlocked ${info.name}!`);
    this.saveData();
    this.emitHud([], []);
    return true;
  }

  public unlockShipWithCoins(shapeId: ShipShapeId, pilot: 'p1' | 'rival' = 'p1'): boolean {
    if (this.unlockedShips.has(shapeId)) return true;
    const info = SHIP_SHAPES.find((s) => s.id === shapeId);
    if (!info) return false;
    if (!this.spendCost(info.cost)) return false;
    this.unlockedShips.add(shapeId);
    if (pilot === 'rival') {
      if (this.playMode === 'ai_compete') {
        this.aiShipShape = shapeId;
      } else {
        this.p2ShipShape = shapeId;
      }
      this.previewRivalShipShape = shapeId;
      this.rebuildRivalShip(shapeId);
      if (this.previewShipShape === shapeId) {
        this.rebuildPlayerShip(shapeId);
      }
    } else {
      this.shipShape = shapeId;
      this.previewShipShape = shapeId;
      this.rebuildPlayerShip(shapeId);
      if (this.previewRivalShipShape === shapeId) {
        this.rebuildRivalShip(shapeId);
      }
    }
    this.sound.playOverdrive();
    this.showRewardNotice(`Purchased & Equipped ${info.name}!`);
    this.saveData();
    this.emitHud([], []);
    return true;
  }

  private showRewardNotice(text: string): void {
    this.rewardNotice = text;
    this.rewardNoticeTimer = 3.2;
  }

  // Navigation & Dedicated Full-Screen Garage Controls
  public openLevelsPage(): void {
    this.clearWorldActors();
    this.phase = 'levels';
    this.rivalAlive = false;
    if (this.rivalRig) this.rivalRig.group.visible = false;
    if (this.rivalShadow) this.rivalShadow.visible = false;
    this.setSceneMode('world');
    this.sound.updateEngineHum(false, 0, false);
    this.emitHud([], []);
  }

  public closeLevelsPage(): void {
    this.phase = 'menu';
    this.setSceneMode('world');
    this.emitHud([], []);
  }

  public openGarage(): void {
    this.clearWorldActors();
    this.phase = 'garage';
    this.rivalAlive = false;
    this.splitDragSide = 'none';
    this.leftGarageYaw = 0.72;
    this.leftGaragePitch = 0.36;
    this.leftGarageDist = 8.2;
    this.rightGarageYaw = -0.72;
    this.rightGaragePitch = 0.36;
    this.rightGarageDist = 8.2;

    this.previewShipShape = this.shipShape;
    this.previewRivalShipShape = this.getRivalShipShape();
    this.playerPos.set(0, 1.45, 0);
    this.rivalPos.set(0, 1.45, 0);
    this.playerRig.group.position.set(0, 1.45, 0);
    this.playerRig.group.rotation.set(0, 0, 0);
    this.rebuildPlayerShip(this.previewShipShape);
    this.rebuildRivalShip(this.previewRivalShipShape);
    if (this.rivalRig) {
      this.rivalRig.group.position.set(0, 1.45, 0);
      this.rivalRig.group.rotation.set(0, 0, 0);
      this.rivalRig.group.visible = this.playMode !== 'solo';
    }
    if (this.rivalShadow) this.rivalShadow.visible = false;
    this.sound.updateEngineHum(false, 0, false);

    this.setSceneMode('garage');
    this.resetGarageCamera();
    this.emitHud([], []);
  }

  public closeGarage(): void {
    this.phase = 'menu';
    this.splitDragSide = 'none';
    this.previewShipShape = this.shipShape;
    this.previewRivalShipShape = this.getRivalShipShape();
    this.rebuildPlayerShip(this.shipShape);
    this.rebuildRivalShip();
    if (this.rivalRig) this.rivalRig.group.visible = false;
    this.setSceneMode('world');
    this.emitHud([], []);
  }

  public previewShipInGarage(shapeId: ShipShapeId, pilot: 'p1' | 'rival' = 'p1'): void {
    if (pilot === 'rival') {
      this.previewRivalShipShape = shapeId;
      if (this.unlockedShips.has(shapeId)) {
        if (this.playMode === 'ai_compete') {
          this.aiShipShape = shapeId;
        } else {
          this.p2ShipShape = shapeId;
        }
      }
      this.rebuildRivalShip(shapeId);
    } else {
      this.previewShipShape = shapeId;
      if (this.unlockedShips.has(shapeId)) {
        this.shipShape = shapeId;
      }
      this.rebuildPlayerShip(shapeId);
    }
    this.emitHud([], []);
  }

  private resetGarageCamera(): void {
    if (!this.camera || !this.orbitControls) return;
    this.camera.position.set(5.8, 3.3, 6.4);
    this.orbitControls.target.set(0, 1.35, 0);
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
    this.orbitControls.update();
  }

  private setSceneMode(mode: 'garage' | 'world'): void {
    const inGarage = mode === 'garage';
    const isSplitGarage = inGarage && this.playMode !== 'solo';
    if (this.garageGroup) this.garageGroup.visible = inGarage;
    if (this.garageTrimMat) {
      this.garageTrimMat.color.setHex(0x38bdf8);
      this.garageTrimMat.emissive.setHex(0x0284c7);
    }
    this.playerRig.group.visible = true;
    if (this.rivalRig) {
      this.rivalRig.group.visible = isSplitGarage || (this.phase === 'playing' && this.rivalAlive);
    }
    if (this.orbitControls) {
      this.orbitControls.enabled = inGarage && !isSplitGarage;
      this.orbitControls.autoRotate = inGarage && !isSplitGarage;
      this.orbitControls.autoRotateSpeed = 1.65;
    }

    if (inGarage) {
      this.terrainA.visible = false;
      this.terrainB.visible = false;
      this.valleyFloorA.visible = false;
      this.valleyFloorB.visible = false;
      this.spireInstanced.visible = false;
      this.starInstanced.visible = false;
      this.contactShadow.visible = true;
      this.contactShadow.position.set(0, 0.23, 0);
      this.contactShadow.scale.setScalar(1.35);

      if (this.scene?.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x0c111d);
        this.scene.fog.density = 0.008;
      }
      if (this.skyMat) {
        this.skyMat.uniforms.topColor.value.set('#0b101b');
        this.skyMat.uniforms.bottomColor.value.set('#1a2438');
      }
      if (this.keyLight) {
        this.keyLight.color.setHex(0xfff1dc);
        this.keyLight.intensity = 2.0;
      }
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0x94a3b8);
        this.hemiLight.groundColor.setHex(0x1e293b);
      }
      if (this.rimLight) {
        this.rimLight.color.setHex(0x7dd3fc);
        this.rimLight.intensity = 0.9;
      }
      this.playerLight.intensity = 0.35;
    } else {
      this.applyWorldVisuals(this.realmId);
    }
  }

  public isLevelUnlocked(levelId: number): boolean {
    if (levelId <= 1) return true; // 0 = Endless, 1 = First stage
    return Boolean(this.levelRecords[levelId - 1]) || levelId - 1 <= this.milestones.highestLevelCleared;
  }

  // Public Game Controls
  public setPlayMode(mode: PlayMode): void {
    this.playMode = mode;
    this.previewRivalShipShape = this.getRivalShipShape();
    this.rebuildRivalShip();
    if (this.phase === 'garage') {
      this.setSceneMode('garage');
    }
    this.emitHud([], []);
  }

  public setAiDifficulty(diff: AiDifficulty): void {
    this.aiDifficulty = diff;
    this.previewRivalShipShape = this.getRivalShipShape();
    this.rebuildRivalShip();
    this.emitHud([], []);
  }

  public setP1ShipShape(shape: ShipShapeId): void {
    if (!this.unlockedShips.has(shape)) return;
    this.shipShape = shape;
    this.previewShipShape = shape;
    this.rebuildPlayerShip(shape);
    this.emitHud([], []);
  }

  public setP2ShipShape(shape: ShipShapeId): void {
    if (!this.unlockedShips.has(shape)) return;
    this.p2ShipShape = shape;
    this.rebuildRivalShip();
    this.emitHud([], []);
  }

  public setAiShipShape(shape: ShipShapeId): void {
    if (!this.unlockedShips.has(shape)) return;
    this.aiShipShape = shape;
    this.rebuildRivalShip();
    this.emitHud([], []);
  }

  public setRoundFormat(format: RoundFormat): void {
    this.roundFormat = format;
    this.emitHud([], []);
  }

  public selectLevel(levelId: number): void {
    if (levelId > 1 && !this.isLevelUnlocked(levelId)) {
      return;
    }
    this.selectedLevelId = levelId;
    this.levelConfig = getLevelConfig(levelId);
    this.setRealm(this.levelConfig.realmId);
    this.emitHud([], []);
  }

  public startGame(levelId?: number, preserveSeries = false): void {
    this.sound.unlock();
    if (!preserveSeries) {
      this.roundNumber = 1;
      this.p1RoundWins = 0;
      this.rivalRoundWins = 0;
    }

    if (this.playMode === 'solo') {
      if (typeof levelId === 'number') {
        if (levelId > 1 && !this.isLevelUnlocked(levelId)) {
          const frontier = Math.min(100, this.milestones.highestLevelCleared + 1);
          this.selectLevel(frontier);
        } else {
          this.selectLevel(levelId);
        }
      } else {
        this.levelConfig = getLevelConfig(this.selectedLevelId);
        this.setRealm(this.levelConfig.realmId);
      }
    } else {
      // 2-Player and AI Competition modes use Arena Rounds (no campaign levels)
      this.levelConfig = getArenaRoundConfig(
        this.roundNumber,
        this.realmId,
        this.roundFormat === 'endless'
      );
      this.applyWorldVisuals(this.realmId);
    }

    this.clearWorldActors();

    const shipMeta = SHIP_SHAPES.find((s) => s.id === this.shipShape) || SHIP_SHAPES[0];
    this.maxHull = 5 + shipMeta.bonusHull;
    this.hull = this.maxHull;

    this.phase = 'playing';
    this.matchResult = null;
    this.previewShipShape = this.shipShape;
    this.rebuildPlayerShip(this.shipShape);
    this.setSceneMode('world');

    this.score = 0;
    this.combo = 0;
    this.comboDecayTimer = 0;
    this.wave = 1;
    this.waveElapsed = 0;
    this.levelElapsed = 0;
    this.levelBossSpawned = false;
    this.earnedStars = 0;

    this.boostEnergy = 100;
    this.missileReady = 100;
    this.overdriveTimer = 0;
    this.magnetTimer = 0;
    this.chronosTimer = 0;
    this.kills = 0;
    this.ringsCleared = 0;
    this.invulnTimer = 1.2;
    this.barrelRollTimer = 0;
    this.skyLoopTimer = 0;
    this.comboSeq = [];
    (Object.keys(this.moveCooldowns) as SpecialMoveId[]).forEach((k) => {
      this.moveCooldowns[k] = 0;
    });

    const isDuo = this.playMode !== 'solo';
    this.victoryTimer = 0;
    this.playerPitch = 0;
    this.playerRoll = 0;
    this.playerPos.set(isDuo ? -4.8 : 0, 2, 0);
    this.targetPos.set(isDuo ? -4.8 : 0, 2, 0);
    this.playerVel.set(0, 0);

    // Initialize Rival / Player 2
    if (isDuo) {
      this.rebuildRivalShip();
      const rivalMeta = SHIP_SHAPES.find((s) => s.id === this.rivalActiveShipShape) || SHIP_SHAPES[0];
      this.rivalMaxHull = 5 + rivalMeta.bonusHull;
      this.rivalHull = this.rivalMaxHull;
      this.rivalAlive = true;
      this.rivalScore = 0;
      this.rivalCombo = 0;
      this.rivalComboDecayTimer = 0;
      this.rivalKills = 0;
      this.rivalRingsCleared = 0;
      this.rivalBoostEnergy = 100;
      this.rivalMissileReady = 100;
      this.rivalOverdriveTimer = 0;
      this.rivalMagnetTimer = 0;
      this.rivalInvulnTimer = 1.2;
      this.rivalBarrelRollTimer = 0;
      this.rivalSkyLoopTimer = 0;
      this.rivalRecoilTimer = 0;
      this.rivalFireCooldown = 0.2;
      this.rivalComboSeq = [];
      (Object.keys(this.rivalMoveCooldowns) as SpecialMoveId[]).forEach((k) => {
        this.rivalMoveCooldowns[k] = 0;
      });
      this.rivalRoll = 0;
      this.rivalPitch = 0;
      this.rivalPos.set(4.8, 2, 0);
      this.rivalTargetPos.set(4.8, 2, 0);
      this.rivalVel.set(0, 0);
      if (this.rivalRig) {
        this.rivalRig.group.position.copy(this.rivalPos);
        this.rivalRig.group.rotation.set(0, 0, 0);
        this.rivalRig.group.visible = true;
      }
      if (this.rivalShadow) this.rivalShadow.visible = this.realmId !== 5;
    } else {
      this.rivalAlive = false;
      if (this.rivalRig) this.rivalRig.group.visible = false;
      if (this.rivalShadow) this.rivalShadow.visible = false;
    }

    this.spawnEnemyTimer = 0.8;
    this.spawnGateTimer = 1.8;
    this.spawnObstacleTimer = 2.6;
    this.spawnShardTimer = 0.9;

    const realmName = REALM_THEMES[this.realmId].name;
    let label = '';
    if (this.playMode === 'solo') {
      label =
        this.levelConfig.id === 0
          ? 'Endless Overdrive'
          : `Level ${this.levelConfig.id} — ${this.levelConfig.name}`;
    } else {
      const modePrefix = this.playMode === 'two_player' ? '2P Duel' : `vs ${this.aiDifficulty.toUpperCase()} AI`;
      label =
        this.roundFormat === 'endless'
          ? `${modePrefix} · Endless Arena — ${realmName}`
          : `${modePrefix} · Round ${this.roundNumber} — ${realmName}`;
    }
    this.showBanner(label, 2.6);
    this.emitHud([], []);
  }

  public startNextLevel(): void {
    const nextId = this.selectedLevelId > 0 && this.selectedLevelId < 100 ? this.selectedLevelId + 1 : 0;
    this.startGame(nextId);
  }

  public startNextRound(): void {
    this.roundNumber += 1;
    this.startGame(undefined, true);
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.sound.updateEngineHum(false, 0, false);
    this.emitHud([], []);
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.sound.unlock();
    this.phase = 'playing';
    this.clock.getDelta();
    this.emitHud([], []);
  }

  public returnToMenu(): void {
    this.clearWorldActors();
    this.phase = 'menu';
    this.victoryTimer = 0;
    this.matchResult = null;
    this.rivalAlive = false;
    if (this.rivalRig) this.rivalRig.group.visible = false;
    if (this.rivalShadow) this.rivalShadow.visible = false;
    this.previewShipShape = this.shipShape;
    this.rebuildPlayerShip(this.shipShape);
    this.setSceneMode('world');
    this.playerPitch = 0;
    this.playerRoll = 0;
    this.playerPos.set(0, 2.5, 0);
    this.sound.updateEngineHum(false, 0, false);
    this.emitHud([], []);
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.emitHud([], []);
  }

  public cycleCameraMode(): void {
    const order: CameraMode[] = ['chase', 'cockpit', 'wide'];
    const idx = order.indexOf(this.cameraMode);
    this.setCameraMode(order[(idx + 1) % order.length]);
  }

  public setGlowMode(mode: GlowMode): void {
    this.glowMode = mode;
    this.applyGlowSettings();
    this.emitHud([], []);
  }

  private applyGlowSettings(): void {
    if (!this.bloomPass) return;
    if (this.glowMode === 'crisp') {
      this.bloomPass.strength = 0.14;
      this.bloomPass.radius = 0.22;
      this.bloomPass.threshold = 0.95;
      if (this.scene) this.scene.environmentIntensity = 0.46;
      if (this.renderer) this.renderer.toneMappingExposure = 0.94;
    } else if (this.glowMode === 'balanced') {
      this.bloomPass.strength = 0.26;
      this.bloomPass.radius = 0.32;
      this.bloomPass.threshold = 0.88;
      if (this.scene) this.scene.environmentIntensity = 0.58;
      if (this.renderer) this.renderer.toneMappingExposure = 0.98;
    } else {
      this.bloomPass.strength = 0.42;
      this.bloomPass.radius = 0.42;
      this.bloomPass.threshold = 0.80;
      if (this.scene) this.scene.environmentIntensity = 0.72;
      if (this.renderer) this.renderer.toneMappingExposure = 1.04;
    }
  }

  public setRealm(id: RealmId): void {
    this.realmId = id;
    if (this.phase !== 'garage') {
      this.applyWorldVisuals(id);
    }
    this.emitHud([], []);
  }

  private applyWorldVisuals(id: RealmId): void {
    const theme = REALM_THEMES[id];
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(theme.fogColor);
      this.scene.fog.density = theme.fogDensity;
    }
    if (this.skyMat) {
      this.skyMat.uniforms.topColor.value.set(theme.skyTop);
      this.skyMat.uniforms.bottomColor.value.set(theme.skyHorizon);
    }
    if (this.keyLight) {
      this.keyLight.color.setHex(theme.keyLightColor);
      this.keyLight.intensity = theme.keyLightIntensity;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(theme.hemiSkyColor);
      this.hemiLight.groundColor.setHex(theme.hemiGroundColor);
    }
    if (this.rimLight) {
      this.rimLight.color.setHex(theme.rimLightColor);
    }
    if (this.pal) {
      applyRealmToPalette(this.pal, theme);
    }

    if (this.terrainGeo) {
      updateTerrainGeometry(this.terrainGeo, id);
    }
    if (this.terrainA && this.terrainB) {
      this.terrainA.visible = theme.hasTerrain;
      this.terrainB.visible = theme.hasTerrain;
    }

    if (this.valleyFloorA && this.valleyFloorB && this.pal) {
      const showFloor = theme.valleyFloorType !== 'none';
      this.valleyFloorA.visible = showFloor;
      this.valleyFloorB.visible = showFloor;
      if (showFloor) {
        const mat =
          theme.valleyFloorType === 'ice'
            ? this.pal.valleyIceMat
            : theme.valleyFloorType === 'lava'
              ? this.pal.valleyLavaMat
              : theme.valleyFloorType === 'highway'
                ? this.pal.valleyHighwayMat
                : this.pal.valleyOceanMat;
        this.valleyFloorA.material = mat;
        this.valleyFloorB.material = mat;
      }
    }

    if (this.spireInstanced) {
      this.spireInstanced.visible = true;
      const oldGeo = this.spireInstanced.geometry;
      this.spireInstanced.geometry = this.createWorldPropGeo(theme.propKind);
      oldGeo.dispose();

      if (theme.propKind === 'skyscraper' && this.pal) {
        this.spireInstanced.material = this.pal.skyscraperMat;
      } else if (this.spireMat) {
        this.spireInstanced.material = this.spireMat;
      }

      for (let i = 0; i < this.spireBasePos.length; i++) {
        const s = this.spireBasePos[i];
        const side = i % 2 === 0 ? -1 : 1;
        if (theme.propKind === 'skyscraper') {
          s.x = side * (22 + (i % 5) * 8);
          s.y = -4 + (i % 4) * 2.5;
          s.sx = 1.4 + (i % 3) * 0.45;
          s.sy = 4.5 + (i % 6) * 2.1;
          s.sz = 1.4 + ((i + 1) % 3) * 0.45;
          s.ry = 0;
        } else if (theme.propKind === 'asteroid') {
          s.x = side * (20 + Math.random() * 44);
          s.y = -12 + Math.random() * 34;
          const sc = 0.85 + Math.random() * 2.2;
          s.sx = sc;
          s.sy = sc * (0.7 + Math.random() * 0.6);
          s.sz = sc;
          s.ry = Math.random() * Math.PI * 2;
        } else {
          s.x = side * (23 + Math.random() * 42);
          s.y = canyonHeightAt(s.x, s.z, id) + 2.2;
          s.sx = 0.9 + Math.random() * 1.9;
          s.sy = 2.4 + Math.random() * 6.5;
          s.sz = 0.9 + Math.random() * 1.9;
          s.ry = Math.random() * Math.PI * 2;
        }

        _color.setHex(i % 4 === 0 ? theme.accentColor : theme.terrainSecondary);
        _color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.14);
        this.spireInstanced.setColorAt(i, _color);
      }
      if (this.spireInstanced.instanceColor) this.spireInstanced.instanceColor.needsUpdate = true;
    }

    if (this.starInstanced) {
      this.starInstanced.visible = true;
    }
  }

  public setShipShape(shape: ShipShapeId): void {
    if (!this.unlockedShips.has(shape)) return;
    this.shipShape = shape;
    this.previewShipShape = shape;
    this.rebuildPlayerShip(shape);
    this.emitHud([], []);
  }

  public setShipSkin(skinId: ShipSkinId): void {
    this.shipSkin = skinId;
    const skin = SHIP_SKINS.find((s) => s.id === skinId) || SHIP_SKINS[0];
    if (this.pal) {
      applyShipSkinToPalette(this.pal, skin);
    }
    this.emitHud([], []);
  }

  public setWeaponMode(mode: WeaponMode): void {
    this.weaponMode = mode;
    this.emitHud([], []);
  }

  public toggleAutoFire(): void {
    this.autoFire = !this.autoFire;
    this.emitHud([], []);
  }

  public toggleMute(): void {
    this.sound.unlock();
    this.sound.setMuted(!this.sound.isMuted());
    this.emitHud([], []);
  }

  public fireHomingMissiles(): void {
    if (this.phase !== 'playing' || this.missileReady < 100) return;
    const targets = this.enemies
      .filter((e) => e.rig.group.position.z < this.playerPos.z - 6)
      .sort((a, b) => a.rig.group.position.distanceTo(this.playerPos) - b.rig.group.position.distanceTo(this.playerPos))
      .slice(0, 4);

    if (targets.length === 0) return;
    this.missileReady = 0;
    this.sound.playMissile();

    targets.forEach((enemy, i) => {
      const mesh = new THREE.Mesh(this.geos.missileGeo, this.pal.missileBody);
      const side = i % 2 === 0 ? -1.4 : 1.4;
      mesh.position.set(this.playerPos.x + side, this.playerPos.y - 0.2, this.playerPos.z - 1.8);
      const vel = new THREE.Vector3(side * 12, 4 + i * 2, -68);
      this.scene.add(mesh);
      this.projectiles.push({
        mesh,
        vel,
        isEnemy: false,
        owner: 'p1',
        isMissile: true,
        piercing: false,
        hitIds: new Set<number>(),
        targetId: enemy.id,
        damage: 4,
        life: 3.4,
      });
    });
  }

  public fireRivalHomingMissiles(): void {
    if (this.phase !== 'playing' || !this.rivalAlive || this.rivalMissileReady < 100) return;
    const targets = this.enemies
      .filter((e) => e.rig.group.position.z < this.rivalPos.z - 6)
      .sort((a, b) => a.rig.group.position.distanceTo(this.rivalPos) - b.rig.group.position.distanceTo(this.rivalPos))
      .slice(0, 4);

    if (targets.length === 0) return;
    this.rivalMissileReady = 0;
    this.sound.playMissile();

    targets.forEach((enemy, i) => {
      const mesh = new THREE.Mesh(this.geos.missileGeo, this.pal.rivalLaser);
      const side = i % 2 === 0 ? -1.4 : 1.4;
      mesh.position.set(this.rivalPos.x + side, this.rivalPos.y - 0.2, this.rivalPos.z - 1.8);
      const vel = new THREE.Vector3(side * 12, 4 + i * 2, -68);
      this.scene.add(mesh);
      this.projectiles.push({
        mesh,
        vel,
        isEnemy: false,
        owner: 'rival',
        isMissile: true,
        piercing: false,
        hitIds: new Set<number>(),
        targetId: enemy.id,
        damage: 4,
        life: 3.4,
      });
    });
  }

  private spawnPopup(worldPos: THREE.Vector3, text: string, tone: FloatingPopup['tone']): void {
    if (!this.camera) return;
    _v1.copy(worldPos).project(this.camera);
    if (_v1.z >= 1) return;
    const x = THREE.MathUtils.clamp((_v1.x + 1) * 0.5, 0.08, 0.92);
    const y = THREE.MathUtils.clamp((1 - _v1.y) * 0.5, 0.12, 0.85);
    this.popups.push({
      id: this.nextPopupId++,
      text,
      x,
      y,
      tone,
      age: 0,
    });
    if (this.popups.length > 14) this.popups.shift();
  }

  private showBanner(text: string, duration = 2.2): void {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  private clearWorldActors(): void {
    this.enemies.forEach((e) => this.scene.remove(e.rig.group));
    this.enemies = [];
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.gates.forEach((g) => this.scene.remove(g.rig.group));
    this.gates = [];
    this.collectibles.forEach((c) => this.scene.remove(c.rig.group));
    this.collectibles = [];
    this.obstacles.forEach((o) => this.scene.remove(o.rig.group));
    this.obstacles = [];
    this.debris.forEach((d) => this.scene.remove(d.mesh));
    this.debris = [];
    this.shockwaves.forEach((s) => this.scene.remove(s.mesh));
    this.shockwaves = [];
    this.exhaustDots.forEach((e) => this.scene.remove(e.mesh));
    this.exhaustDots = [];
    this.popups = [];
  }

  private getMultiplier(): number {
    if (this.combo >= 20) return 5;
    if (this.combo >= 12) return 4;
    if (this.combo >= 6) return 3;
    if (this.combo >= 3) return 2;
    return 1;
  }

  private addScore(points: number): number {
    const shipScoreBonus = this.shipShape === 'seraph' ? 1.15 : 1.0;
    const total = Math.round(points * this.getMultiplier() * 1.15 * shipScoreBonus);
    this.score += total;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveData();
    }
    return total;
  }

  private registerCombo(): void {
    this.combo += 1;
    this.comboDecayTimer = 4.5;
  }

  private getRivalMultiplier(): number {
    if (this.rivalCombo >= 20) return 5;
    if (this.rivalCombo >= 12) return 4;
    if (this.rivalCombo >= 6) return 3;
    if (this.rivalCombo >= 3) return 2;
    return 1;
  }

  private addRivalScore(points: number): number {
    const shipScoreBonus = this.rivalActiveShipShape === 'seraph' ? 1.15 : 1.0;
    const total = Math.round(points * this.getRivalMultiplier() * 1.15 * shipScoreBonus);
    this.rivalScore += total;
    return total;
  }

  private registerRivalCombo(): void {
    this.rivalCombo += 1;
    this.rivalComboDecayTimer = 4.5;
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDelta = this.clock.getDelta();
    const dt = Math.min(rawDelta, 0.05);
    this.elapsedTotal += dt;

    if (this.rewardNoticeTimer > 0) {
      this.rewardNoticeTimer -= dt;
      if (this.rewardNoticeTimer <= 0) this.rewardNotice = null;
    }

    if (this.phase === 'menu' || this.phase === 'levels') {
      this.updateMenuShowcase(dt);
    } else if (this.phase === 'garage') {
      this.updateGarageShowcase(dt);
    } else if (this.phase === 'playing') {
      this.updateGameplay(dt);
    } else if (this.phase === 'victory') {
      this.updateVictoryAscent(dt);
    }

    if (this.phase === 'garage' && this.playMode !== 'solo') {
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      const halfW = Math.max(1, Math.floor(width / 2));
      const rightW = Math.max(1, width - halfW);

      this.splitCamLeft.aspect = halfW / height;
      this.splitCamLeft.updateProjectionMatrix();
      this.splitCamRight.aspect = rightW / height;
      this.splitCamRight.updateProjectionMatrix();

      this.renderer.setScissorTest(true);

      // Left Half: Player 1 (Cyan Pedestal)
      if (this.garageTrimMat) {
        this.garageTrimMat.color.setHex(0x38bdf8);
        this.garageTrimMat.emissive.setHex(0x0284c7);
      }
      this.playerRig.group.visible = true;
      if (this.rivalRig) this.rivalRig.group.visible = false;
      this.renderer.setViewport(0, 0, halfW, height);
      this.renderer.setScissor(0, 0, halfW, height);
      this.renderer.render(this.scene, this.splitCamLeft);

      // Right Half: Player 2 / AI Opponent (Orange Pedestal)
      if (this.garageTrimMat) {
        this.garageTrimMat.color.setHex(0xfb923c);
        this.garageTrimMat.emissive.setHex(0xea580c);
      }
      this.playerRig.group.visible = false;
      if (this.rivalRig) this.rivalRig.group.visible = true;
      this.renderer.setViewport(halfW, 0, rightW, height);
      this.renderer.setScissor(halfW, 0, rightW, height);
      this.renderer.render(this.scene, this.splitCamRight);

      this.renderer.setScissorTest(false);
      this.playerRig.group.visible = true;
    } else {
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      this.playerRig.group.visible = true;
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, width, height);
      if (this.composer && !this.isSoftwareGl) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private scrollWorld(speed: number, dt: number): void {
    const dz = speed * dt;

    this.terrainA.position.z += dz;
    this.terrainB.position.z += dz;
    if (this.terrainA.position.z > 140) this.terrainA.position.z -= 480;
    if (this.terrainB.position.z > 140) this.terrainB.position.z -= 480;

    if (this.valleyFloorA && this.valleyFloorB) {
      this.valleyFloorA.position.z += dz;
      this.valleyFloorB.position.z += dz;
      if (this.valleyFloorA.position.z > 140) this.valleyFloorA.position.z -= 480;
      if (this.valleyFloorB.position.z > 140) this.valleyFloorB.position.z -= 480;
    }

    const isSpace = this.realmId === 5;
    const isCity = this.realmId === 3;
    for (let i = 0; i < this.spireBasePos.length; i++) {
      const s = this.spireBasePos[i];
      s.z += dz;
      if (s.z > 30) s.z -= 240;
      _v1.set(s.x, s.y, s.z);
      _euler.set(
        isSpace ? this.elapsedTotal * 0.35 + i : 0,
        isCity ? 0 : s.ry + this.elapsedTotal * (isSpace ? 0.45 : 0.08),
        0
      );
      _quat.setFromEuler(_euler);
      _scale.set(s.sx, s.sy, s.sz);
      _mat4.compose(_v1, _quat, _scale);
      this.spireInstanced.setMatrixAt(i, _mat4);
    }
    this.spireInstanced.instanceMatrix.needsUpdate = true;

    const stretch = 1 + (speed - 45) * 0.09;
    for (let i = 0; i < this.starData.length; i++) {
      const st = this.starData[i];
      st.z += dz * st.speed * 1.45;
      if (st.z > 24) {
        st.z -= 220;
        st.x = (Math.random() - 0.5) * 95;
        st.y = -3 + Math.random() * 38;
      }
      _v1.set(st.x, st.y, st.z);
      _quat.identity();
      _scale.set(1, 1, stretch);
      _mat4.compose(_v1, _quat, _scale);
      this.starInstanced.setMatrixAt(i, _mat4);
    }
    this.starInstanced.instanceMatrix.needsUpdate = true;
  }

  private updateGarageShowcase(dt: number): void {
    const bob = 1.42 + Math.sin(this.elapsedTotal * 1.6) * 0.08;
    const rollSway = Math.sin(this.elapsedTotal * 0.9) * 0.03;

    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(0, bob, 0);
    this.playerRig.group.rotation.set(0, 0, rollSway);
    if (this.playerRig.haloRing) {
      this.playerRig.haloRing.rotation.z += dt * 1.6;
    }
    this.playerRig.thrusterLeft.scale.set(0.65, 0.65, 0.55);
    this.playerRig.thrusterRight.scale.set(0.65, 0.65, 0.55);

    this.contactShadow.visible = true;
    this.contactShadow.position.set(0, 0.23, 0);
    this.contactShadow.scale.setScalar(1.35);

    if (this.playMode !== 'solo') {
      if (this.rivalRig) {
        const rivalBob = 1.42 + Math.sin(this.elapsedTotal * 1.6 + 0.8) * 0.08;
        this.rivalRig.group.visible = true;
        this.rivalRig.group.position.set(0, rivalBob, 0);
        this.rivalRig.group.rotation.set(0, 0, Math.sin(this.elapsedTotal * 0.9 + 0.8) * 0.03);
        if (this.rivalRig.haloRing) {
          this.rivalRig.haloRing.rotation.z += dt * 1.6;
        }
        this.rivalRig.thrusterLeft.scale.set(0.65, 0.65, 0.55);
        this.rivalRig.thrusterRight.scale.set(0.65, 0.65, 0.55);
      }

      if (this.splitDragSide !== 'left') this.leftGarageYaw += dt * 0.45;
      if (this.splitDragSide !== 'right') this.rightGarageYaw += dt * 0.45;

      const lCosP = Math.cos(this.leftGaragePitch);
      this.splitCamLeft.position.set(
        Math.sin(this.leftGarageYaw) * lCosP * this.leftGarageDist,
        0.95 + Math.sin(this.leftGaragePitch) * this.leftGarageDist,
        Math.cos(this.leftGarageYaw) * lCosP * this.leftGarageDist
      );
      this.splitCamLeft.lookAt(0, 0.95, 0);

      const rCosP = Math.cos(this.rightGaragePitch);
      this.splitCamRight.position.set(
        Math.sin(this.rightGarageYaw) * rCosP * this.rightGarageDist,
        0.95 + Math.sin(this.rightGaragePitch) * this.rightGarageDist,
        Math.cos(this.rightGarageYaw) * rCosP * this.rightGarageDist
      );
      this.splitCamRight.lookAt(0, 0.95, 0);
    } else if (this.orbitControls) {
      this.orbitControls.autoRotate = true;
      this.orbitControls.update();
    }
  }

  private updateMenuShowcase(dt: number): void {
    this.scrollWorld(44, dt);

    const hoverX = Math.sin(this.elapsedTotal * 0.9) * 2.2;
    const hoverY = 2.6 + Math.sin(this.elapsedTotal * 1.4) * 0.55;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(hoverX, hoverY, 0);
    this.playerRig.group.rotation.set(
      Math.cos(this.elapsedTotal * 1.4) * 0.06,
      0,
      -Math.cos(this.elapsedTotal * 0.9) * 0.24
    );
    if (this.playerRig.haloRing) {
      this.playerRig.haloRing.rotation.z += dt * 1.8;
    }

    const flicker = 0.85 + Math.sin(this.elapsedTotal * 28) * 0.15;
    this.playerRig.thrusterLeft.scale.set(1, 1, flicker);
    this.playerRig.thrusterRight.scale.set(1, 1, flicker);

    if (this.realmId === 5) {
      this.contactShadow.visible = false;
    } else {
      this.contactShadow.visible = true;
      const groundY = canyonHeightAt(hoverX, 0, this.realmId) + 0.16;
      this.contactShadow.position.set(hoverX, groundY, 0);
      const heightGap = Math.max(1, hoverY - groundY);
      this.contactShadow.scale.setScalar(THREE.MathUtils.clamp(1.6 - heightGap * 0.05, 0.45, 1.5));
    }

    const angle = Math.sin(this.elapsedTotal * 0.35) * 0.85;
    const camX = hoverX + Math.sin(angle) * 9.5;
    const camZ = Math.cos(angle) * 9.5;
    const camY = hoverY + 2.4 + Math.sin(this.elapsedTotal * 0.5) * 0.7;
    this.camera.position.lerp(_v1.set(camX, camY, camZ), 1 - Math.exp(-3 * dt));
    this.camera.lookAt(hoverX, hoverY + 0.2, -1.5);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 60, 4, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateGameplay(dt: number): void {
    const isTwoPlayer = this.playMode === 'two_player';
    const boostRechargeMult = this.shipShape === 'phantom' ? 1.25 : 1.0;
    const boosting =
      (isTwoPlayer
        ? this.keys.has('ShiftLeft')
        : this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.boostEnergy > 4;

    if (boosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 32);
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + dt * 16 * boostRechargeMult);
    }

    if (this.overdriveTimer > 0) this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    if (this.chronosTimer > 0) this.chronosTimer = Math.max(0, this.chronosTimer - dt);

    (Object.keys(this.moveCooldowns) as SpecialMoveId[]).forEach((k) => {
      if (this.moveCooldowns[k] > 0) this.moveCooldowns[k] = Math.max(0, this.moveCooldowns[k] - dt);
    });

    if (this.comboSeqTimer > 0) {
      this.comboSeqTimer -= dt;
      if (this.comboSeqTimer <= 0) this.comboSeq = [];
    }

    const missileRate = this.shipShape === 'seraph' ? 30 : 24;
    this.missileReady = Math.min(100, this.missileReady + dt * missileRate);

    if (this.comboDecayTimer > 0) {
      this.comboDecayTimer -= dt;
      if (this.comboDecayTimer <= 0) this.combo = 0;
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.recoilTimer > 0) this.recoilTimer = Math.max(0, this.recoilTimer - dt);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 3.5);

    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].age += dt * 1.15;
      this.popups[i].y -= dt * 0.065;
      if (this.popups[i].age >= 1) this.popups.splice(i, 1);
    }

    const baseSpeed = (this.levelConfig.baseSpeed + (this.levelConfig.id === 0 ? this.wave * 3.4 : 0)) * 1.16;
    const chronosFactor = this.chronosTimer > 0 ? 0.62 : 1.0;
    const activeSpeed =
      baseSpeed *
      chronosFactor *
      (boosting ? 1.65 : 1.0) *
      (this.overdriveTimer > 0 ? 1.25 : 1.0);

    this.scrollWorld(activeSpeed, dt);
    this.sound.updateEngineHum(true, (activeSpeed - 48) / 60, boosting);

    const shipMeta = SHIP_SHAPES.find((s) => s.id === this.shipShape) || SHIP_SHAPES[0];
    const agility = 9.5 * shipMeta.speedScale;

    let kbX = 0;
    let kbY = 0;
    if (this.keys.has('KeyA') || (!isTwoPlayer && this.keys.has('ArrowLeft'))) kbX -= 1;
    if (this.keys.has('KeyD') || (!isTwoPlayer && this.keys.has('ArrowRight'))) kbX += 1;
    if (this.keys.has('KeyW') || (!isTwoPlayer && this.keys.has('ArrowUp'))) kbY += 1;
    if (this.keys.has('KeyS') || (!isTwoPlayer && this.keys.has('ArrowDown'))) kbY -= 1;

    if (kbX !== 0 || kbY !== 0) {
      this.pointerActive = false;
      this.targetPos.x = THREE.MathUtils.clamp(this.targetPos.x + kbX * 26 * shipMeta.speedScale * dt, -15.5, 15.5);
      this.targetPos.y = THREE.MathUtils.clamp(this.targetPos.y + kbY * 18 * shipMeta.speedScale * dt, -5.8, 11.2);
    } else if (!isTwoPlayer && this.pointerActive) {
      this.targetPos.x = THREE.MathUtils.clamp(this.pointerNdcX * 16.5, -15.5, 15.5);
      this.targetPos.y = THREE.MathUtils.clamp(2.5 + this.pointerNdcY * 8.8, -5.8, 11.2);
    }

    const prevX = this.playerPos.x;
    const prevY = this.playerPos.y;
    this.playerPos.x = THREE.MathUtils.damp(this.playerPos.x, this.targetPos.x, agility, dt);
    this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, this.targetPos.y, agility, dt);
    this.playerVel.set(
      (this.playerPos.x - prevX) / Math.max(dt, 0.001),
      (this.playerPos.y - prevY) / Math.max(dt, 0.001)
    );

    let targetRoll = THREE.MathUtils.clamp(-this.playerVel.x * 0.042, -0.78, 0.78);
    if (this.barrelRollTimer > 0) {
      const totalDur = this.barrelRollSpins > 1 ? 0.65 : this.shipShape === 'trident' ? 0.36 : 0.44;
      this.barrelRollTimer = Math.max(0, this.barrelRollTimer - dt);
      const progress = 1 - this.barrelRollTimer / totalDur;
      this.playerRoll = progress * Math.PI * 2 * this.barrelRollSpins * this.barrelRollDir;
    } else {
      this.playerRoll = THREE.MathUtils.damp(this.playerRoll, targetRoll, 11, dt);
    }

    let targetPitch = THREE.MathUtils.clamp(this.playerVel.y * 0.028, -0.42, 0.42);
    if (this.skyLoopTimer > 0) {
      this.skyLoopTimer = Math.max(0, this.skyLoopTimer - dt);
      const loopProgress = 1 - this.skyLoopTimer / 0.62;
      this.playerPitch = loopProgress * Math.PI * 2;
    } else {
      this.playerPitch = THREE.MathUtils.damp(this.playerPitch, targetPitch, 10, dt);
    }

    this.playerRig.group.position.copy(this.playerPos);
    this.playerRig.group.rotation.set(this.playerPitch, 0, this.playerRoll);
    this.playerRig.group.visible =
      (this.playMode !== 'solo' || this.cameraMode !== 'cockpit') &&
      (this.invulnTimer <= 0 || this.barrelRollTimer > 0 || this.skyLoopTimer > 0 || Math.floor(this.elapsedTotal * 22) % 2 === 0);

    if (this.playerRig.haloRing) {
      this.playerRig.haloRing.rotation.z += dt * 2.4;
    }

    const showShield = this.barrelRollTimer > 0 || this.skyLoopTimer > 0 || this.overdriveTimer > 0;
    this.playerRig.shieldDome.visible = showShield;
    if (showShield) {
      this.playerRig.shieldDome.rotation.y += dt * 3.5;
      this.playerRig.shieldDome.rotation.x += dt * 1.8;
    }

    const thrustLen = boosting || this.overdriveTimer > 0 ? 1.9 + Math.random() * 0.45 : 0.9 + Math.random() * 0.2;
    this.playerRig.thrusterLeft.scale.set(1, 1, thrustLen);
    this.playerRig.thrusterRight.scale.set(1, 1, thrustLen);
    this.playerLight.intensity = boosting ? 2.2 : 1.05;

    const cannonZ = 0.45 - (this.recoilTimer > 0 ? 0.22 : 0);
    this.playerRig.cannonLeft.position.z = cannonZ;
    this.playerRig.cannonRight.position.z = cannonZ;

    // Thrusters are at +Z (behind ship!)
    this.exhaustSpawnTimer -= dt;
    if (this.exhaustSpawnTimer <= 0) {
      this.exhaustSpawnTimer = boosting ? 0.025 : 0.045;
      this.spawnExhaustDot(this.playerPos.x - 0.68, this.playerPos.y - 0.05, this.playerPos.z + 2.2);
      this.spawnExhaustDot(this.playerPos.x + 0.68, this.playerPos.y - 0.05, this.playerPos.z + 2.2);
    }

    if (this.realmId === 5) {
      this.contactShadow.visible = false;
    } else {
      this.contactShadow.visible = true;
      const groundY = canyonHeightAt(this.playerPos.x, this.playerPos.z, this.realmId) + 0.16;
      this.contactShadow.position.set(this.playerPos.x, groundY, this.playerPos.z);
      const heightGap = Math.max(1, this.playerPos.y - groundY);
      this.contactShadow.scale.setScalar(THREE.MathUtils.clamp(1.65 - heightGap * 0.055, 0.4, 1.55));
    }

    // Weapons firing
    this.fireCooldown -= dt;
    const wantsFire = isTwoPlayer
      ? this.autoFire || this.keys.has('Space')
      : this.autoFire || this.mouseDownLeft || this.keys.has('Space');
    if (wantsFire && this.fireCooldown <= 0) {
      const overdrive = this.overdriveTimer > 0;
      const baseCd = this.weaponMode === 'beam' ? 0.23 : this.weaponMode === 'spread' ? 0.17 : 0.13;
      const phantomFireBonus = this.shipShape === 'phantom' ? 0.85 : 1.0;
      this.fireCooldown = (overdrive ? baseCd * 0.6 : baseCd) * phantomFireBonus;
      this.firePlayerLasers(overdrive);
    }

    // Update Rival Craft (Player 2 or AI Pilot)
    if (this.playMode !== 'solo' && this.rivalAlive && this.rivalRig) {
      this.updateRivalFlight(dt);
    }

    const hasBoss = this.enemies.some((e) => e.kind === 'boss');
    if (this.levelConfig.durationSec <= 0) {
      if (!hasBoss) {
        this.waveElapsed += dt;
        if (this.waveElapsed >= 22) {
          this.wave += 1;
          this.waveElapsed = 0;
          if (this.wave % 3 === 0) {
            this.spawnBoss(`Apex Dreadnought Mk.${Math.floor(this.wave / 3)}`, 85 + this.wave * 22);
          } else {
            this.showBanner(`Wave ${this.wave} — Escalation`, 2.0);
          }
        }
      }
    } else {
      if (!this.levelBossSpawned) {
        this.levelElapsed += dt;
        if (this.levelElapsed >= this.levelConfig.durationSec) {
          this.levelBossSpawned = true;
          this.spawnBoss(this.levelConfig.bossName, this.levelConfig.bossHp);
        }
      }
    }

    const enemyDt = dt * (this.chronosTimer > 0 ? 0.55 : 1.0);
    this.updateSpawners(dt, hasBoss);
    this.updateEnemies(enemyDt, activeSpeed);
    if ((this.phase as GamePhase) !== 'playing') return;
    this.updateProjectiles(dt, enemyDt);
    if ((this.phase as GamePhase) !== 'playing') return;
    this.updateGates(dt, activeSpeed);
    this.updateCollectibles(dt, activeSpeed);
    this.updateObstacles(dt, activeSpeed);
    if ((this.phase as GamePhase) !== 'playing') return;
    this.updateEffects(dt, activeSpeed);
    this.updateCamera(dt, boosting);

    this.hudEmitTimer -= dt;
    if (this.hudEmitTimer <= 0) {
      this.hudEmitTimer = 0.032;
      const reticles: TargetReticle[] = [];
      for (const e of this.enemies) {
        if (e.rig.group.position.z < this.playerPos.z - 4 && e.rig.group.position.z > -165) {
          _v1.copy(e.rig.group.position).project(this.camera);
          if (_v1.z < 1) {
            reticles.push({
              id: e.id,
              x: (_v1.x + 1) * 0.5,
              y: (1 - _v1.y) * 0.5,
              locked: this.missileReady >= 100,
              kind: e.kind,
            });
          }
        }
      }
      this.emitHud(reticles, [...this.popups]);
    }
  }

  private updateRivalFlight(dt: number): void {
    if (!this.rivalRig) return;
    const isAi = this.playMode === 'ai_compete';
    const aiCfg = AI_DIFFICULTIES.find((d) => d.id === this.aiDifficulty) || AI_DIFFICULTIES[1];
    const rivalMeta = SHIP_SHAPES.find((s) => s.id === this.rivalActiveShipShape) || SHIP_SHAPES[0];

    if (this.rivalOverdriveTimer > 0) this.rivalOverdriveTimer = Math.max(0, this.rivalOverdriveTimer - dt);
    if (this.rivalMagnetTimer > 0) this.rivalMagnetTimer = Math.max(0, this.rivalMagnetTimer - dt);
    if (this.rivalInvulnTimer > 0) this.rivalInvulnTimer = Math.max(0, this.rivalInvulnTimer - dt);
    if (this.rivalRecoilTimer > 0) this.rivalRecoilTimer = Math.max(0, this.rivalRecoilTimer - dt);

    if (this.rivalComboDecayTimer > 0) {
      this.rivalComboDecayTimer -= dt;
      if (this.rivalComboDecayTimer <= 0) this.rivalCombo = 0;
    }

    (Object.keys(this.rivalMoveCooldowns) as SpecialMoveId[]).forEach((k) => {
      if (this.rivalMoveCooldowns[k] > 0) {
        this.rivalMoveCooldowns[k] = Math.max(0, this.rivalMoveCooldowns[k] - dt);
      }
    });

    if (this.rivalComboSeqTimer > 0) {
      this.rivalComboSeqTimer -= dt;
      if (this.rivalComboSeqTimer <= 0) this.rivalComboSeq = [];
    }

    const missileRate = this.rivalActiveShipShape === 'seraph' ? 30 : 22;
    this.rivalMissileReady = Math.min(100, this.rivalMissileReady + dt * missileRate);

    let rivalBoosting = false;

    if (!isAi) {
      // Player 2 Keyboard Controls (Arrow Keys, RightShift/Slash Boost, RightControl/NumpadEnter manual fire)
      rivalBoosting = (this.keys.has('ShiftRight') || this.keys.has('Slash')) && this.rivalBoostEnergy > 4;
      let p2X = 0;
      let p2Y = 0;
      if (this.keys.has('ArrowLeft')) p2X -= 1;
      if (this.keys.has('ArrowRight')) p2X += 1;
      if (this.keys.has('ArrowUp')) p2Y += 1;
      if (this.keys.has('ArrowDown')) p2Y -= 1;

      if (p2X !== 0 || p2Y !== 0) {
        this.rivalTargetPos.x = THREE.MathUtils.clamp(
          this.rivalTargetPos.x + p2X * 26 * rivalMeta.speedScale * dt,
          -15.5,
          15.5
        );
        this.rivalTargetPos.y = THREE.MathUtils.clamp(
          this.rivalTargetPos.y + p2Y * 18 * rivalMeta.speedScale * dt,
          -5.8,
          11.2
        );
      }
    } else {
      // Smart Adjustable AI Pilot Brain
      let steerX = Math.sin(this.elapsedTotal * 1.15) * 4.2;
      let steerY = 2.6 + Math.cos(this.elapsedTotal * 0.9) * 1.4;
      let hazardUrgency = 0;

      // 1. Obstacle Avoidance
      for (const o of this.obstacles) {
        const pos = o.rig.group.position;
        if (pos.z < 3 && pos.z > -88) {
          const zWeight = 1 - Math.abs(pos.z) / 88;
          for (const col of o.rig.colliders) {
            const cx = pos.x + col.offsetX;
            const cy = pos.y + col.offsetY;
            const dx = this.rivalPos.x - cx;
            const dy = this.rivalPos.y - cy;
            const safeW = col.halfW + 3.0;
            const safeH = col.halfH + 2.5;
            if (Math.abs(dx) < safeW && Math.abs(dy) < safeH) {
              const pushDirX = dx >= 0 ? 1 : -1;
              const pushDirY = dy >= 0 ? 1 : -1;
              steerX += pushDirX * (safeW - Math.abs(dx) + 2.4) * zWeight * 2.4 * aiCfg.avoidanceStrength;
              steerY += pushDirY * (safeH - Math.abs(dy) + 1.4) * zWeight * 1.8 * aiCfg.avoidanceStrength;
              if (pos.z > -30) hazardUrgency = Math.max(hazardUrgency, zWeight);
            }
          }
        }
      }

      // 2. Incoming Enemy Shot Avoidance / Tactical Barrel Roll
      for (const p of this.projectiles) {
        if (!p.isEnemy) continue;
        const pos = p.mesh.position;
        if (pos.z < 2 && pos.z > -45) {
          const dx = this.rivalPos.x - pos.x;
          const dy = this.rivalPos.y - pos.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 3.6) {
            steerX += (dx >= 0 ? 1 : -1) * 6.0 * aiCfg.avoidanceStrength;
            steerY += (dy >= 0 ? 1 : -1) * 4.0 * aiCfg.avoidanceStrength;
            if (pos.z > -20) hazardUrgency = Math.max(hazardUrgency, 0.9);
          }
        }
      }

      // Trigger AI barrel roll when threatened (scaled by difficulty)
      if (
        hazardUrgency > 0.58 &&
        this.rivalBarrelRollTimer <= 0 &&
        this.rivalMoveCooldowns.roll_left <= 0 &&
        Math.random() < aiCfg.dodgeChance * dt * 8
      ) {
        this.triggerRivalSpecialMove(this.rivalPos.x > 0 ? 'roll_left' : 'roll_right');
      }

      // 3. Collectibles & Boost Gates Seeking
      let bestTargetScore = -1;
      let bestTargetX = steerX;
      let bestTargetY = steerY;

      for (const g of this.gates) {
        if (g.clearedByRival) continue;
        const gz = g.rig.group.position.z;
        if (gz < 0 && gz > -125) {
          const val = (1 - Math.abs(gz) / 125) * 1.8 * aiCfg.gateSeekWeight;
          if (val > bestTargetScore) {
            bestTargetScore = val;
            bestTargetX = g.rig.group.position.x;
            bestTargetY = g.rig.group.position.y;
          }
        }
      }

      for (const c of this.collectibles) {
        const cz = c.rig.group.position.z;
        if (cz < 0 && cz > -120) {
          const priority =
            c.kind === 'overdrive' || c.kind === 'coin_gold'
              ? 2.2
              : c.kind === 'repair' && this.rivalHull < this.rivalMaxHull
                ? 2.1
                : c.kind === 'coin_silver' || c.kind === 'shard'
                  ? 1.35
                  : 0.9;
          const val = (1 - Math.abs(cz) / 120) * priority * aiCfg.gateSeekWeight;
          if (val > bestTargetScore) {
            bestTargetScore = val;
            bestTargetX = c.rig.group.position.x;
            bestTargetY = c.rig.group.position.y;
          }
        }
      }

      // 4. Enemy / Boss Lane Alignment when no urgent pickup
      if (bestTargetScore < 0.7 && this.enemies.length > 0) {
        let nearestEnemy: ActiveEnemy | null = null;
        let nearestDist = 999;
        for (const e of this.enemies) {
          if (e.rig.group.position.z < -8) {
            const d = Math.abs(e.rig.group.position.z - this.rivalPos.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearestEnemy = e;
            }
          }
        }
        if (nearestEnemy) {
          bestTargetX = nearestEnemy.rig.group.position.x;
          bestTargetY = nearestEnemy.rig.group.position.y;
          bestTargetScore = 0.85;
        }
      }

      if (bestTargetScore > 0) {
        const blend = THREE.MathUtils.clamp(bestTargetScore * 0.42, 0.2, 0.72);
        steerX = THREE.MathUtils.lerp(steerX, bestTargetX, blend);
        steerY = THREE.MathUtils.lerp(steerY, bestTargetY, blend);
      }

      // Keep slight visual wingman separation from Player 1
      const gapX = steerX - this.playerPos.x;
      if (Math.abs(gapX) < 2.6) {
        steerX += (gapX >= 0 ? 1 : -1) * (2.6 - Math.abs(gapX));
      }

      const targetX = THREE.MathUtils.clamp(steerX, -15.2, 15.2);
      const targetY = THREE.MathUtils.clamp(steerY, -5.2, 10.6);
      const stepRate = 18 * aiCfg.agilityScale * dt;
      this.rivalTargetPos.x = THREE.MathUtils.lerp(this.rivalTargetPos.x, targetX, Math.min(1, stepRate * 0.35));
      this.rivalTargetPos.y = THREE.MathUtils.lerp(this.rivalTargetPos.y, targetY, Math.min(1, stepRate * 0.35));

      // AI Boost & Missile Salvo
      rivalBoosting = this.rivalBoostEnergy > 55 && bestTargetScore > 1.25 && aiCfg.agilityScale >= 0.95;
      if (
        this.rivalMissileReady >= 100 &&
        this.enemies.some((e) => e.rig.group.position.z < -18) &&
        Math.random() < aiCfg.missileAggression * dt * 2.5
      ) {
        this.fireRivalHomingMissiles();
      }
    }

    if (rivalBoosting) {
      this.rivalBoostEnergy = Math.max(0, this.rivalBoostEnergy - dt * 30);
    } else {
      this.rivalBoostEnergy = Math.min(100, this.rivalBoostEnergy + dt * 16);
    }

    const rAgility = (isAi ? 7.5 * aiCfg.agilityScale : 9.5) * rivalMeta.speedScale;
    const prevRX = this.rivalPos.x;
    const prevRY = this.rivalPos.y;
    this.rivalPos.x = THREE.MathUtils.damp(this.rivalPos.x, this.rivalTargetPos.x, rAgility, dt);
    this.rivalPos.y = THREE.MathUtils.damp(this.rivalPos.y, this.rivalTargetPos.y, rAgility, dt);
    this.rivalVel.set(
      (this.rivalPos.x - prevRX) / Math.max(dt, 0.001),
      (this.rivalPos.y - prevRY) / Math.max(dt, 0.001)
    );

    const targetRoll = THREE.MathUtils.clamp(-this.rivalVel.x * 0.042, -0.78, 0.78);
    if (this.rivalBarrelRollTimer > 0) {
      const totalDur = this.rivalBarrelRollSpins > 1 ? 0.65 : this.rivalActiveShipShape === 'trident' ? 0.36 : 0.44;
      this.rivalBarrelRollTimer = Math.max(0, this.rivalBarrelRollTimer - dt);
      const progress = 1 - this.rivalBarrelRollTimer / totalDur;
      this.rivalRoll = progress * Math.PI * 2 * this.rivalBarrelRollSpins * this.rivalBarrelRollDir;
    } else {
      this.rivalRoll = THREE.MathUtils.damp(this.rivalRoll, targetRoll, 11, dt);
    }

    const targetPitch = THREE.MathUtils.clamp(this.rivalVel.y * 0.028, -0.42, 0.42);
    if (this.rivalSkyLoopTimer > 0) {
      this.rivalSkyLoopTimer = Math.max(0, this.rivalSkyLoopTimer - dt);
      const loopProgress = 1 - this.rivalSkyLoopTimer / 0.62;
      this.rivalPitch = loopProgress * Math.PI * 2;
    } else {
      this.rivalPitch = THREE.MathUtils.damp(this.rivalPitch, targetPitch, 10, dt);
    }

    this.rivalRig.group.position.copy(this.rivalPos);
    this.rivalRig.group.rotation.set(this.rivalPitch, 0, this.rivalRoll);
    this.rivalRig.group.visible =
      this.rivalInvulnTimer <= 0 ||
      this.rivalBarrelRollTimer > 0 ||
      this.rivalSkyLoopTimer > 0 ||
      Math.floor(this.elapsedTotal * 22) % 2 === 0;

    if (this.rivalRig.haloRing) {
      this.rivalRig.haloRing.rotation.z += dt * 2.4;
    }

    const showRivalShield = this.rivalBarrelRollTimer > 0 || this.rivalSkyLoopTimer > 0 || this.rivalOverdriveTimer > 0;
    this.rivalRig.shieldDome.visible = showRivalShield;
    if (showRivalShield) {
      this.rivalRig.shieldDome.rotation.y += dt * 3.5;
      this.rivalRig.shieldDome.rotation.x += dt * 1.8;
    }

    const rThrustLen = rivalBoosting || this.rivalOverdriveTimer > 0 ? 1.85 + Math.random() * 0.4 : 0.9 + Math.random() * 0.2;
    this.rivalRig.thrusterLeft.scale.set(1, 1, rThrustLen);
    this.rivalRig.thrusterRight.scale.set(1, 1, rThrustLen);
    this.rivalLight.intensity = rivalBoosting ? 2.0 : 1.0;

    const rCannonZ = 0.45 - (this.rivalRecoilTimer > 0 ? 0.22 : 0);
    this.rivalRig.cannonLeft.position.z = rCannonZ;
    this.rivalRig.cannonRight.position.z = rCannonZ;

    this.rivalExhaustSpawnTimer -= dt;
    if (this.rivalExhaustSpawnTimer <= 0) {
      this.rivalExhaustSpawnTimer = rivalBoosting ? 0.03 : 0.055;
      this.spawnExhaustDot(this.rivalPos.x - 0.68, this.rivalPos.y - 0.05, this.rivalPos.z + 2.2, true);
      this.spawnExhaustDot(this.rivalPos.x + 0.68, this.rivalPos.y - 0.05, this.rivalPos.z + 2.2, true);
    }

    if (this.realmId === 5) {
      this.rivalShadow.visible = false;
    } else {
      this.rivalShadow.visible = true;
      const rGroundY = canyonHeightAt(this.rivalPos.x, this.rivalPos.z, this.realmId) + 0.16;
      this.rivalShadow.position.set(this.rivalPos.x, rGroundY, this.rivalPos.z);
      const rGap = Math.max(1, this.rivalPos.y - rGroundY);
      this.rivalShadow.scale.setScalar(THREE.MathUtils.clamp(1.65 - rGap * 0.055, 0.4, 1.55));
    }

    // Rival Weapons Firing
    this.rivalFireCooldown -= dt;
    const p2WantsFire = isAi
      ? this.enemies.some((e) => e.rig.group.position.z < -8 && Math.abs(e.rig.group.position.x - this.rivalPos.x) < 11)
      : this.autoFire || this.keys.has('ControlRight') || this.keys.has('NumpadEnter');

    if (p2WantsFire && this.rivalFireCooldown <= 0) {
      const overdrive = this.rivalOverdriveTimer > 0;
      const baseCd = (this.weaponMode === 'beam' ? 0.23 : this.weaponMode === 'spread' ? 0.17 : 0.14) * (isAi ? aiCfg.fireIntervalMult : 1.0);
      this.rivalFireCooldown = overdrive ? baseCd * 0.65 : baseCd;
      this.fireRivalLasers(overdrive);
    }
  }

  private firePlayerLasers(overdrive: boolean): void {
    this.sound.playLaser(overdrive, this.weaponMode);
    this.recoilTimer = 0.06;

    if (this.weaponMode === 'beam' && !overdrive) {
      const bolt = new THREE.Mesh(this.geos.beamGeo, this.pal.laserBeam);
      bolt.position.set(this.playerPos.x, this.playerPos.y - 0.1, this.playerPos.z - 2.4);
      this.scene.add(bolt);
      this.projectiles.push({
        mesh: bolt,
        vel: new THREE.Vector3(0, 0, -165),
        isEnemy: false,
        owner: 'p1',
        isMissile: false,
        piercing: true,
        hitIds: new Set<number>(),
        targetId: null,
        damage: 2.6,
        life: 1.25,
      });
      return;
    }

    const isSpread = this.weaponMode === 'spread' || overdrive;
    const mat = overdrive
      ? this.pal.laserOverdrive
      : isSpread
        ? this.pal.laserSpread
        : this.pal.laserPlayer;

    const offsets = isSpread ? [-1.25, 0, 1.25] : [-1.25, 1.25];
    offsets.forEach((ox, idx) => {
      const bolt = new THREE.Mesh(this.geos.laserGeo, mat);
      bolt.position.set(this.playerPos.x + ox, this.playerPos.y - 0.1, this.playerPos.z - 2.1);
      const spreadX = isSpread ? (idx - 1) * (overdrive ? 7 : 12) : 0;
      this.scene.add(bolt);
      this.projectiles.push({
        mesh: bolt,
        vel: new THREE.Vector3(spreadX, 0, -148),
        isEnemy: false,
        owner: 'p1',
        isMissile: false,
        piercing: false,
        hitIds: new Set<number>(),
        targetId: null,
        damage: overdrive ? 1.6 : isSpread ? 0.9 : 1.1,
        life: 1.4,
      });
    });
  }

  private fireRivalLasers(overdrive: boolean): void {
    this.rivalRecoilTimer = 0.06;
    const isSpread = this.weaponMode === 'spread' || overdrive;
    const mat = overdrive ? this.pal.laserOverdrive : this.pal.rivalLaser;
    const offsets = isSpread ? [-1.25, 0, 1.25] : [-1.25, 1.25];
    offsets.forEach((ox, idx) => {
      const bolt = new THREE.Mesh(this.geos.laserGeo, mat);
      bolt.position.set(this.rivalPos.x + ox, this.rivalPos.y - 0.1, this.rivalPos.z - 2.1);
      const spreadX = isSpread ? (idx - 1) * (overdrive ? 7 : 11) : 0;
      this.scene.add(bolt);
      this.projectiles.push({
        mesh: bolt,
        vel: new THREE.Vector3(spreadX, 0, -148),
        isEnemy: false,
        owner: 'rival',
        isMissile: false,
        piercing: false,
        hitIds: new Set<number>(),
        targetId: null,
        damage: overdrive ? 1.5 : isSpread ? 0.85 : 1.05,
        life: 1.4,
      });
    });
  }

  private spawnExhaustDot(x: number, y: number, z: number, isRival = false): void {
    const mesh = new THREE.Mesh(
      this.geos.exhaustParticleGeo,
      isRival
        ? this.rivalOverdriveTimer > 0
          ? this.pal.laserOverdrive
          : this.pal.rivalThrusterFlame
        : this.overdriveTimer > 0
          ? this.pal.laserOverdrive
          : this.pal.thrusterFlame
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.exhaustDots.push({ mesh, life: 0.28, maxLife: 0.28 });
  }

  private updateSpawners(dt: number, hasBoss: boolean): void {
    if (!hasBoss) {
      this.spawnEnemyTimer -= dt;
      if (this.spawnEnemyTimer <= 0) {
        const baseInt =
          this.levelConfig.id === 0
            ? Math.max(0.72, 1.65 - this.wave * 0.1)
            : this.levelConfig.enemyInterval;
        this.spawnEnemyTimer = baseInt * 0.92;
        this.spawnEnemyWaveUnit();
      }
    }

    this.spawnGateTimer -= dt;
    if (this.spawnGateTimer <= 0) {
      this.spawnGateTimer = 4.0 + Math.random() * 2.0;
      const rig = this.geos.createBoostGate(this.pal);
      rig.group.position.set((Math.random() - 0.5) * 18, 0.5 + Math.random() * 6.5, -195);
      this.scene.add(rig.group);
      this.gates.push({ rig, cleared: false, clearedByRival: false });
    }

    this.spawnObstacleTimer -= dt;
    if (this.spawnObstacleTimer <= 0 && !hasBoss) {
      this.spawnObstacleTimer = this.levelConfig.obstacleInterval * 0.92;
      const maxVariant = this.levelConfig.id === 1 ? 3 : this.levelConfig.id <= 3 ? 4 : 6;
      const variant = Math.floor(Math.random() * maxVariant);
      const rig = this.geos.createObstacle(variant, this.pal);
      const xPos = variant === 1 ? (Math.random() < 0.5 ? -8 : 8) : (Math.random() - 0.5) * 10;
      const yPos = variant === 5 ? 1 + Math.random() * 5.5 : variant >= 2 ? 1.5 + Math.random() * 6 : 0;
      rig.group.position.set(xPos, yPos, -195);
      this.scene.add(rig.group);
      this.obstacles.push({
        rig,
        spinSpeed:
          variant === 3 || variant === 4
            ? (Math.random() < 0.5 ? 1.2 : -1.2)
            : variant === 2
              ? 0.85
              : 0,
      });
    }

    this.spawnShardTimer -= dt;
    if (this.spawnShardTimer <= 0) {
      this.spawnShardTimer = 1.5 + Math.random() * 1.0;
      const roll = Math.random();
      let kind: CollectibleKind = 'shard';
      if (roll < 0.08) kind = 'overdrive';
      else if (roll < 0.15) kind = 'repair';
      else if (roll < 0.21) kind = 'magnet';
      else if (roll < 0.27) kind = 'chronos';
      else if (roll < 0.42) kind = 'coin_copper';
      else if (roll < 0.49) kind = 'coin_silver';
      else if (roll < 0.52) kind = 'coin_gold';

      const rig = this.geos.createCollectible(kind, this.pal);
      rig.group.position.set((Math.random() - 0.5) * 20, -1 + Math.random() * 8.5, -190);
      this.scene.add(rig.group);
      this.collectibles.push({ kind, rig, collected: false });
    }
  }

  private spawnEnemyWaveUnit(): void {
    const pool = this.levelConfig.allowedEnemies;
    const kind = pool[Math.floor(Math.random() * pool.length)];

    const rig = this.geos.createEnemy(kind, this.pal);
    const bx = (Math.random() - 0.5) * 24;
    const by = 0 + Math.random() * 8.5;
    rig.group.position.set(bx, by, -185);
    this.scene.add(rig.group);

    const hpMap: Record<EnemyKind, number> = {
      dart: 2,
      prism: 3,
      gyro: 4,
      monolith: 6,
      cruiser: 9,
      boss: 95,
    };
    const scoreMap: Record<EnemyKind, number> = {
      dart: 160,
      prism: 220,
      gyro: 280,
      monolith: 400,
      cruiser: 640,
      boss: 4500,
    };

    const hp = hpMap[kind] + Math.floor((this.levelConfig.id === 0 ? this.wave : this.levelConfig.id) * 0.2);
    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      rig,
      hp,
      maxHp: hp,
      vel: new THREE.Vector3(0, 0, kind === 'dart' || kind === 'prism' ? 28 : kind === 'cruiser' ? 14 : 20),
      baseX: bx,
      baseY: by,
      phaseOffset: Math.random() * Math.PI * 2,
      fireCooldown: 1.0 + Math.random() * 1.4,
      scoreValue: scoreMap[kind],
    });
  }

  private spawnBoss(bossName: string, rawHp: number): void {
    const rig = this.geos.createEnemy('boss', this.pal);
    rig.group.position.set(0, 4.5, -180);
    this.scene.add(rig.group);

    const maxHp = Math.round(rawHp);
    this.enemies.push({
      id: this.nextEnemyId++,
      kind: 'boss',
      rig,
      hp: maxHp,
      maxHp,
      vel: new THREE.Vector3(0, 0, 0),
      baseX: 0,
      baseY: 4.5,
      phaseOffset: 0,
      fireCooldown: 2.0,
      scoreValue: 5000,
      bossName,
    });
    this.sound.playBossWarning();
    this.showBanner(`Boss Warning — ${bossName}`, 3.0);
  }

  private updateEnemies(dt: number, worldSpeed: number): void {
    const fireRateScale = 0.92;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const pos = e.rig.group.position;

      for (const p of e.rig.spinParts) p.rotation.z += dt * 2.2;
      for (const p of e.rig.counterSpinParts) p.rotation.y -= dt * 1.9;

      if (e.kind === 'boss') {
        pos.z = THREE.MathUtils.damp(pos.z, -44, 2.2, dt);
        pos.x = Math.sin(this.elapsedTotal * 0.7) * 10.5;
        pos.y = 4.2 + Math.cos(this.elapsedTotal * 1.1) * 2.6;
        e.rig.group.rotation.z = -Math.cos(this.elapsedTotal * 0.7) * 0.16;

        e.fireCooldown -= dt;
        if (e.fireCooldown <= 0 && pos.z > -65) {
          e.fireCooldown = 1.25 * fireRateScale;
          for (let s = -2; s <= 2; s++) {
            this.spawnEnemyShot(pos.x + s * 1.8, pos.y, pos.z + 3, s * 6, (this.playerPos.y - pos.y) * 0.7, 52);
          }
        }
      } else {
        pos.z += (worldSpeed * 0.52 + e.vel.z) * dt;
        if (e.kind === 'dart' || e.kind === 'prism') {
          pos.x = e.baseX + Math.sin(this.elapsedTotal * 2.8 + e.phaseOffset) * 4.5;
          pos.y = e.baseY + Math.cos(this.elapsedTotal * 2.2 + e.phaseOffset) * 1.8;
          e.rig.group.rotation.z = -Math.cos(this.elapsedTotal * 2.8 + e.phaseOffset) * 0.55;
        } else if (e.kind === 'gyro') {
          pos.x = e.baseX + Math.cos(this.elapsedTotal * 1.6 + e.phaseOffset) * 3.2;
        }

        e.fireCooldown -= dt;
        if (e.fireCooldown <= 0 && pos.z < -22 && pos.z > -125) {
          e.fireCooldown = (e.kind === 'cruiser' ? 1.4 : 2.2) * fireRateScale;
          const aimTarget =
            this.rivalAlive && pos.distanceTo(this.rivalPos) < pos.distanceTo(this.playerPos)
              ? this.rivalPos
              : this.playerPos;
          _v1.copy(aimTarget).sub(pos).normalize().multiplyScalar(56);
          this.spawnEnemyShot(pos.x, pos.y, pos.z + 1.5, _v1.x, _v1.y, Math.max(36, _v1.z));
        }

        if (pos.distanceTo(this.playerPos) < e.rig.hitRadius + 1.35) {
          this.damagePlayer();
          if ((this.phase as GamePhase) !== 'playing') return;
          this.destroyEnemy(i, 'none');
          if ((this.phase as GamePhase) !== 'playing') return;
          continue;
        }

        if (this.rivalAlive && pos.distanceTo(this.rivalPos) < e.rig.hitRadius + 1.35) {
          this.damageRival();
          if ((this.phase as GamePhase) !== 'playing') return;
          this.destroyEnemy(i, 'none');
          if ((this.phase as GamePhase) !== 'playing') return;
          continue;
        }

        if (pos.z > 18) {
          this.scene.remove(e.rig.group);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private spawnEnemyShot(x: number, y: number, z: number, vx: number, vy: number, vz: number): void {
    const mesh = new THREE.Mesh(this.geos.enemyShotGeo, this.pal.enemyCore);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      vel: new THREE.Vector3(vx, vy, vz),
      isEnemy: true,
      owner: 'enemy',
      isMissile: false,
      piercing: false,
      hitIds: new Set<number>(),
      targetId: null,
      damage: 1,
      life: 4.0,
    });
  }

  private updateProjectiles(dt: number, enemyDt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.isMissile && p.targetId !== null) {
        const target = this.enemies.find((e) => e.id === p.targetId);
        if (target) {
          _v1.copy(target.rig.group.position).sub(p.mesh.position).normalize().multiplyScalar(118);
          p.vel.lerp(_v1, 1 - Math.exp(-7 * dt));
        }
        p.mesh.lookAt(_v2.copy(p.mesh.position).add(p.vel));
      }

      p.mesh.position.addScaledVector(p.vel, p.isEnemy ? enemyDt : dt);

      if (p.isEnemy) {
        p.mesh.rotation.x += dt * 6;
        p.mesh.rotation.y += dt * 5;
        if (p.mesh.position.distanceTo(this.playerPos) < 1.85) {
          if (this.barrelRollTimer > 0 || this.skyLoopTimer > 0) {
            p.isEnemy = false;
            p.owner = 'p1';
            p.vel.z = -120;
            const pts = this.addScore(80);
            this.spawnPopup(this.playerPos, `+${pts} DEFLECT`, 'good');
          } else {
            this.damagePlayer();
            if ((this.phase as GamePhase) !== 'playing') return;
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
          }
          continue;
        }
        if (this.rivalAlive && p.mesh.position.distanceTo(this.rivalPos) < 1.85) {
          if (this.rivalBarrelRollTimer > 0 || this.rivalSkyLoopTimer > 0) {
            p.isEnemy = false;
            p.owner = 'rival';
            p.vel.z = -120;
            const pts = this.addRivalScore(80);
            this.spawnPopup(this.rivalPos, `+${pts} DEFLECT`, 'power');
          } else {
            this.damageRival();
            if ((this.phase as GamePhase) !== 'playing') return;
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
          }
          continue;
        }
      } else {
        let hit = false;
        const shotOwner = p.owner === 'rival' ? 'rival' : 'p1';
        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
          const e = this.enemies[ei];
          if (p.hitIds.has(e.id)) continue;
          if (p.mesh.position.distanceTo(e.rig.group.position) < e.rig.hitRadius + (p.isMissile ? 1.4 : 0.9)) {
            e.hp -= p.damage;
            p.hitIds.add(e.id);
            this.spawnShockwave(p.mesh.position, 2.2, false);
            if (e.hp <= 0) {
              this.destroyEnemy(ei, shotOwner);
              if ((this.phase as GamePhase) !== 'playing') return;
            } else if (shotOwner === 'rival') {
              this.addRivalScore(25);
            } else {
              this.addScore(25);
            }
            if (!p.piercing) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private destroyEnemy(index: number, killer: 'none' | 'p1' | 'rival'): void {
    const e = this.enemies[index];
    const pos = e.rig.group.position.clone();
    const isBoss = e.kind === 'boss';
    this.scene.remove(e.rig.group);
    this.enemies.splice(index, 1);

    this.spawnExplosion(pos, isBoss ? 34 : 14, isBoss ? 14 : 6.5);
    this.sound.playExplosion(isBoss ? 2.4 : 1.0);
    if (!this.reducedMotion) {
      this.screenShake = Math.max(this.screenShake, isBoss ? 0.9 : 0.25);
    }

    if (killer === 'p1') {
      this.kills += 1;
      this.milestones.totalKills += 1;
      this.registerCombo();
      const gained = this.addScore(e.scoreValue + (isBoss && this.playMode !== 'solo' ? 2500 : 0));
      this.spawnPopup(pos, `+${gained}`, 'good');

      // Specific Milestone: Shoot 20 enemies -> +50 Copper Coins!
      if (this.milestones.totalKills % 20 === 0) {
        this.awardCoins('copper', 50, `20 Enemies Defeated (${this.milestones.totalKills} total)`);
      } else {
        this.saveData();
      }
    } else if (killer === 'rival') {
      this.rivalKills += 1;
      this.registerRivalCombo();
      const gained = this.addRivalScore(e.scoreValue + (isBoss && this.playMode !== 'solo' ? 2500 : 0));
      this.spawnPopup(pos, `RIVAL +${gained}`, 'power');
    }

    if (isBoss && killer !== 'none') {
      if (this.levelConfig.durationSec <= 0) {
        this.wave += 1;
        this.waveElapsed = 0;
        this.hull = Math.min(this.maxHull, this.hull + 1);
        if (this.rivalAlive) this.rivalHull = Math.min(this.rivalMaxHull, this.rivalHull + 1);
        this.awardCoins('silver', 5, `Endless Wave ${this.wave - 1} Boss`);
        this.showBanner(`Dreadnought Shattered — Wave ${this.wave}`, 2.8);
      } else if (this.playMode === 'solo') {
        this.beginVictoryAscent('campaign');
      } else {
        this.beginVictoryAscent('competitive', 'Arena Boss Defeated · Score Lead', true);
      }
    }
  }

  public skipVictoryOutro(): void {
    if (this.phase !== 'victory') return;
    this.finalizeVictory();
  }

  private beginVictoryAscent(
    kind: 'campaign' | 'competitive',
    reason = '',
    bossCleared = true
  ): void {
    if (this.phase === 'victory') return;
    this.phase = 'victory';
    this.victoryTimer = 0;
    this.victoryDuration = 2.4;
    this.victoryKind = kind;
    this.victoryReason = reason;
    this.victoryBossCleared = bossCleared;

    // Disperse any remaining enemies & hostile fire so the sky clears cleanly
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.rig.group);
      this.spawnExplosion(enemy.rig.group.position, 8, 4.5);
    }
    this.enemies = [];

    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];

    for (const o of this.obstacles) {
      this.scene.remove(o.rig.group);
    }
    this.obstacles = [];

    this.barrelRollTimer = 0;
    this.skyLoopTimer = 0;
    this.rivalBarrelRollTimer = 0;
    this.rivalSkyLoopTimer = 0;
    this.invulnTimer = 0;
    this.rivalInvulnTimer = 0;
    this.playerRig.shieldDome.visible = false;
    if (this.rivalRig) this.rivalRig.shieldDome.visible = false;

    const msg =
      kind === 'campaign'
        ? `Level ${this.levelConfig.id} Clear — Returning From Battle`
        : `Round ${this.roundNumber} Clear — Returning From Battle`;
    this.showBanner(msg, 2.5);
    this.sound.playRingBoost();
    this.emitHud([], [...this.popups]);
  }

  private updateVictoryAscent(dt: number): void {
    this.victoryTimer += dt;
    const t = THREE.MathUtils.clamp(this.victoryTimer / this.victoryDuration, 0, 1);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 3.5);

    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].age += dt * 1.15;
      this.popups[i].y -= dt * 0.065;
      if (this.popups[i].age >= 1) this.popups.splice(i, 1);
    }

    const activeSpeed = 58 * (1 + t * 0.55);
    this.scrollWorld(activeSpeed, dt);
    this.sound.updateEngineHum(true, 0.7 + t * 0.5, true);

    const hasRivalAlive = this.playMode !== 'solo' && this.rivalAlive && this.rivalRig;
    const targetP1X = hasRivalAlive ? -2.8 : 0;
    const climbEase = Math.pow(t, 1.35);
    const targetP1Y = 2.4 + climbEase * 27;
    const targetP1Z = -Math.pow(t, 1.45) * 24;

    this.playerPos.x = THREE.MathUtils.damp(this.playerPos.x, targetP1X, 4.2, dt);
    this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, targetP1Y, 4.5, dt);
    this.playerPos.z = THREE.MathUtils.damp(this.playerPos.z, targetP1Z, 4.2, dt);

    const targetClimbPitch = t < 0.12 ? 0.18 : 0.54;
    this.playerPitch = THREE.MathUtils.damp(this.playerPitch, targetClimbPitch, 5.5, dt);
    this.playerRoll = THREE.MathUtils.damp(this.playerRoll, 0, 7, dt);

    this.playerRig.group.visible = true;
    this.playerRig.group.position.copy(this.playerPos);
    this.playerRig.group.rotation.set(this.playerPitch, 0, this.playerRoll);
    if (this.playerRig.haloRing) {
      this.playerRig.haloRing.rotation.z += dt * 3.2;
    }

    const thrustLen = 2.25 + Math.random() * 0.45;
    this.playerRig.thrusterLeft.scale.set(1, 1, thrustLen);
    this.playerRig.thrusterRight.scale.set(1, 1, thrustLen);
    this.playerLight.intensity = 2.2;

    this.exhaustSpawnTimer -= dt;
    if (this.exhaustSpawnTimer <= 0) {
      this.exhaustSpawnTimer = 0.025;
      this.spawnExhaustDot(this.playerPos.x - 0.68, this.playerPos.y - 0.15, this.playerPos.z + 2.1);
      this.spawnExhaustDot(this.playerPos.x + 0.68, this.playerPos.y - 0.15, this.playerPos.z + 2.1);
    }

    if (this.realmId === 5 || this.playerPos.y > 14) {
      this.contactShadow.visible = false;
    } else {
      this.contactShadow.visible = true;
      const groundY = canyonHeightAt(this.playerPos.x, this.playerPos.z, this.realmId) + 0.16;
      this.contactShadow.position.set(this.playerPos.x, groundY, this.playerPos.z);
      const heightGap = Math.max(1, this.playerPos.y - groundY);
      this.contactShadow.scale.setScalar(THREE.MathUtils.clamp(1.65 - heightGap * 0.09, 0.25, 1.55));
    }

    if (hasRivalAlive && this.rivalRig) {
      const targetRivalX = 2.8;
      this.rivalPos.x = THREE.MathUtils.damp(this.rivalPos.x, targetRivalX, 4.2, dt);
      this.rivalPos.y = THREE.MathUtils.damp(this.rivalPos.y, targetP1Y - 0.6, 4.5, dt);
      this.rivalPos.z = THREE.MathUtils.damp(this.rivalPos.z, targetP1Z, 4.2, dt);
      this.rivalPitch = THREE.MathUtils.damp(this.rivalPitch, targetClimbPitch, 5.5, dt);
      this.rivalRoll = THREE.MathUtils.damp(this.rivalRoll, 0, 7, dt);

      this.rivalRig.group.visible = true;
      this.rivalRig.group.position.copy(this.rivalPos);
      this.rivalRig.group.rotation.set(this.rivalPitch, 0, this.rivalRoll);
      this.rivalRig.thrusterLeft.scale.set(1, 1, thrustLen);
      this.rivalRig.thrusterRight.scale.set(1, 1, thrustLen);
      if (this.rivalShadow && (this.realmId === 5 || this.rivalPos.y > 14)) {
        this.rivalShadow.visible = false;
      }
    }

    this.updateGates(dt, activeSpeed);
    this.updateCollectibles(dt, activeSpeed);
    this.updateEffects(dt, activeSpeed);

    // Camera stays low & behind, looking upward so the plane unmistakably climbs out of battle into the sky
    const camTargetX = this.playerPos.x * 0.35;
    const camTargetY = 3.0;
    const camTargetZ = 13.8;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camTargetX, 6, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camTargetY, 6, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camTargetZ, 6, dt);
    _v1.set(this.playerPos.x * 0.6, this.playerPos.y + 0.8, this.playerPos.z - 6);
    this.camera.lookAt(_v1);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 72, 4, dt);
    this.camera.updateProjectionMatrix();

    this.hudEmitTimer -= dt;
    if (this.hudEmitTimer <= 0) {
      this.hudEmitTimer = 0.04;
      this.emitHud([], [...this.popups]);
    }

    if (this.victoryTimer >= this.victoryDuration) {
      this.finalizeVictory();
    }
  }

  private finalizeVictory(): void {
    if (this.victoryKind === 'campaign') {
      this.completeCampaignLevel(false);
    } else {
      this.finishCompetitiveMatch(this.victoryReason, this.victoryBossCleared);
    }
  }

  private completeCampaignLevel(staySilentPhase = false): void {
    const stars =
      this.score >= this.levelConfig.star3Score && this.hull >= 3
        ? 3
        : this.score >= this.levelConfig.star2Score
          ? 2
          : 1;
    this.earnedStars = stars;

    const lvl = this.levelConfig.id;
    const prev = this.levelRecords[lvl];
    const isFirstClear = !prev;
    this.levelRecords[lvl] = {
      bestScore: Math.max(prev?.bestScore || 0, this.score),
      stars: Math.max(prev?.stars || 0, stars),
    };

    if (lvl > this.milestones.highestLevelCleared) {
      this.milestones.highestLevelCleared = lvl;
      this.syncLevelUnlocks();
    }

    // Specific Level Coin Rewards!
    if (lvl === 100 && !this.milestones.rewardedMilestones.includes('lvl100')) {
      this.milestones.rewardedMilestones.push('lvl100');
      this.awardCoins('gold', 30, 'Level 100 Champion');
    } else if (lvl === 50 && !this.milestones.rewardedMilestones.includes('lvl50')) {
      this.milestones.rewardedMilestones.push('lvl50');
      this.awardCoins('gold', 15, 'Level 50 Milestone');
    } else if (lvl === 25 && !this.milestones.rewardedMilestones.includes('lvl25')) {
      this.milestones.rewardedMilestones.push('lvl25');
      this.awardCoins('gold', 10, 'Level 25 Milestone');
    } else if (lvl === 10 && !this.milestones.rewardedMilestones.includes('lvl10')) {
      this.milestones.rewardedMilestones.push('lvl10');
      this.awardCoins('gold', 5, 'Level 10 Milestone');
    } else if (lvl === 5 && !this.milestones.rewardedMilestones.includes('lvl5')) {
      this.milestones.rewardedMilestones.push('lvl5');
      this.awardCoins('silver', 10, 'Level 5 Milestone');
    } else if (isFirstClear) {
      this.awardCoins('silver', 2 + stars, `Level ${lvl} First Clear`);
    } else {
      this.awardCoins('copper', 12 + stars * 4, `Level ${lvl} Cleared`);
    }

    this.saveData();
    if (!staySilentPhase) {
      this.phase = 'levelcomplete';
      this.sound.updateEngineHum(false, 0, false);
      this.sound.playLevelComplete();
      this.emitHud([], [...this.popups]);
    }
  }

  private finishCompetitiveMatch(reason: string, _bossCleared: boolean): void {
    let winner: MatchResult['winner'] = 'draw';
    if (this.hull <= 0 && this.rivalAlive) {
      winner = 'rival';
    } else if (this.hull > 0 && !this.rivalAlive) {
      winner = 'p1';
    } else if (this.score > this.rivalScore) {
      winner = 'p1';
    } else if (this.rivalScore > this.score) {
      winner = 'rival';
    }

    if (winner === 'p1') this.p1RoundWins += 1;
    else if (winner === 'rival') this.rivalRoundWins += 1;

    const fmtInfo = ROUND_FORMATS.find((f) => f.id === this.roundFormat) || ROUND_FORMATS[0];
    const targetWins = fmtInfo.targetWins;
    const isSeriesFinal =
      this.roundFormat === 'single' ||
      this.roundFormat === 'endless' ||
      this.p1RoundWins >= targetWins ||
      this.rivalRoundWins >= targetWins;

    this.matchResult = {
      winner,
      reason,
      p1Score: this.score,
      rivalScore: this.rivalScore,
      p1Kills: this.kills,
      rivalKills: this.rivalKills,
      p1Rings: this.ringsCleared,
      rivalRings: this.rivalRingsCleared,
      isSeriesFinal,
      roundNumber: this.roundNumber,
      p1RoundWins: this.p1RoundWins,
      rivalRoundWins: this.rivalRoundWins,
      targetWins,
    };

    if (winner === 'p1') {
      this.awardCoins('silver', isSeriesFinal ? 3 : 1, isSeriesFinal ? 'Match Victory' : `Round ${this.roundNumber} Win`);
    }

    this.phase = 'gameover';
    if (winner === 'p1') this.sound.playLevelComplete();
    this.sound.updateEngineHum(false, 0, false);
    this.emitHud([], [...this.popups]);
  }

  private updateGates(dt: number, worldSpeed: number): void {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.rig.group.position.z += worldSpeed * dt;
      g.rig.chevrons.rotation.z += dt * 1.4;
      g.rig.innerRing.rotation.z -= dt * 2.0;

      if (!g.cleared && Math.abs(g.rig.group.position.z - this.playerPos.z) < 2.6) {
        const dx = this.playerPos.x - g.rig.group.position.x;
        const dy = this.playerPos.y - g.rig.group.position.y;
        if (Math.hypot(dx, dy) < g.rig.radius) {
          g.cleared = true;
          this.ringsCleared += 1;
          this.milestones.totalGates += 1;
          this.boostEnergy = Math.min(100, this.boostEnergy + 45);
          this.missileReady = Math.min(100, this.missileReady + 35);
          this.registerCombo();
          const gained = this.addScore(350);
          this.sound.playRingBoost();
          this.spawnShockwave(g.rig.group.position, 9.0, true);
          this.spawnPopup(g.rig.group.position, `+${gained} GATE`, 'good');

          if (this.milestones.totalGates % 10 === 0) {
            this.awardCoins('silver', 3, `10 Boost Gates Cleared`);
          }
        }
      }

      if (this.rivalAlive && !g.clearedByRival && Math.abs(g.rig.group.position.z - this.rivalPos.z) < 2.6) {
        const dx = this.rivalPos.x - g.rig.group.position.x;
        const dy = this.rivalPos.y - g.rig.group.position.y;
        if (Math.hypot(dx, dy) < g.rig.radius) {
          g.clearedByRival = true;
          this.rivalRingsCleared += 1;
          this.rivalBoostEnergy = Math.min(100, this.rivalBoostEnergy + 45);
          this.rivalMissileReady = Math.min(100, this.rivalMissileReady + 35);
          this.registerRivalCombo();
          const gained = this.addRivalScore(350);
          this.spawnShockwave(g.rig.group.position, 8.5, false);
          this.spawnPopup(g.rig.group.position, `RIVAL +${gained}`, 'power');
        }
      }

      if (g.rig.group.position.z > 20) {
        this.scene.remove(g.rig.group);
        this.gates.splice(i, 1);
      }
    }
  }

  private updateCollectibles(dt: number, worldSpeed: number): void {
    const baseMagnet = this.shipShape === 'titan' ? 14 : 10;
    const pullRadius = this.magnetTimer > 0 ? 34 : baseMagnet;
    const rivalPullRadius = this.rivalMagnetTimer > 0 ? 30 : 9;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const pos = c.rig.group.position;
      pos.z += worldSpeed * dt;
      c.rig.inner.rotation.y += dt * 2.8;
      c.rig.inner.rotation.x += dt * 0.9;
      c.rig.halo.rotation.z -= dt * 2.2;

      const distP1 = pos.distanceTo(this.playerPos);
      const distRival = this.rivalAlive ? pos.distanceTo(this.rivalPos) : 9999;

      if (distP1 <= distRival && distP1 < pullRadius) {
        pos.lerp(this.playerPos, 1 - Math.exp(-(this.magnetTimer > 0 ? 11 : 7) * dt));
      } else if (this.rivalAlive && distRival < rivalPullRadius) {
        pos.lerp(this.rivalPos, 1 - Math.exp(-(this.rivalMagnetTimer > 0 ? 10 : 6.5) * dt));
      }

      if (!c.collected && (distP1 < 2.9 || distRival < 2.9)) {
        c.collected = true;
        const p1Won = distP1 <= distRival;
        if (p1Won) {
          if (c.kind === 'shard') {
            this.registerCombo();
            this.milestones.totalShards += 1;
            const gained = this.addScore(220);
            this.boostEnergy = Math.min(100, this.boostEnergy + 18);
            this.sound.playCrystalPickup(this.combo);
            this.spawnPopup(pos, `+${gained} SHARD`, 'good');
            if (this.milestones.totalShards % 25 === 0) {
              this.awardCoins('copper', 25, '25 Shards Collected');
            }
          } else if (c.kind === 'coin_copper') {
            this.wallet.copper += 2;
            this.saveData();
            this.sound.playCrystalPickup(3);
            this.spawnPopup(pos, '+2 COPPER', 'coin');
          } else if (c.kind === 'coin_silver') {
            this.wallet.silver += 1;
            this.saveData();
            this.sound.playCrystalPickup(5);
            this.spawnPopup(pos, '+1 SILVER', 'coin');
          } else if (c.kind === 'coin_gold') {
            this.wallet.gold += 1;
            this.saveData();
            this.sound.playOverdrive();
            this.spawnPopup(pos, '+1 GOLD', 'coin');
          } else if (c.kind === 'overdrive') {
            this.overdriveTimer = 8.0;
            this.invulnTimer = Math.max(this.invulnTimer, 8.0);
            const gained = this.addScore(500);
            this.sound.playOverdrive();
            this.showBanner('Overdrive Core Engaged', 2.0);
            this.spawnPopup(pos, `+${gained} OVERDRIVE`, 'power');
          } else if (c.kind === 'magnet') {
            this.magnetTimer = 8.0;
            const gained = this.addScore(300);
            this.sound.playCrystalPickup(4);
            this.showBanner('Crystal Magnet Active', 1.8);
            this.spawnPopup(pos, `+${gained} MAGNET`, 'power');
          } else if (c.kind === 'chronos') {
            this.chronosTimer = 6.0;
            const gained = this.addScore(300);
            this.sound.playRingBoost();
            this.showBanner('Chronos Time-Slow Active', 1.8);
            this.spawnPopup(pos, `+${gained} TIME SLOW`, 'power');
          } else {
            this.hull = Math.min(this.maxHull, this.hull + 1);
            const gained = this.addScore(300);
            this.sound.playRingBoost();
            this.showBanner('Hull Matrix Repaired', 1.6);
            this.spawnPopup(pos, `+1 HULL · +${gained}`, 'power');
          }
          this.spawnShockwave(pos, 4.0, true);
        } else {
          // Rival claimed the contested pickup
          if (c.kind === 'shard') {
            this.registerRivalCombo();
            const gained = this.addRivalScore(220);
            this.rivalBoostEnergy = Math.min(100, this.rivalBoostEnergy + 18);
            this.spawnPopup(pos, `RIVAL +${gained}`, 'power');
          } else if (c.kind === 'coin_copper' || c.kind === 'coin_silver' || c.kind === 'coin_gold') {
            const bonus = c.kind === 'coin_gold' ? 600 : c.kind === 'coin_silver' ? 320 : 160;
            const gained = this.addRivalScore(bonus);
            this.spawnPopup(pos, `RIVAL +${gained}`, 'coin');
          } else if (c.kind === 'overdrive') {
            this.rivalOverdriveTimer = 7.0;
            this.rivalInvulnTimer = Math.max(this.rivalInvulnTimer, 7.0);
            const gained = this.addRivalScore(500);
            this.spawnPopup(pos, `RIVAL +${gained}`, 'power');
          } else if (c.kind === 'magnet') {
            this.rivalMagnetTimer = 8.0;
            this.addRivalScore(300);
          } else if (c.kind === 'repair') {
            this.rivalHull = Math.min(this.rivalMaxHull, this.rivalHull + 1);
            const gained = this.addRivalScore(300);
            this.spawnPopup(pos, `RIVAL +1 HULL · +${gained}`, 'power');
          } else {
            this.addRivalScore(300);
          }
          this.spawnShockwave(pos, 4.0, false);
        }
        this.scene.remove(c.rig.group);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (pos.z > 20) {
        this.scene.remove(c.rig.group);
        this.collectibles.splice(i, 1);
      }
    }
  }

  private updateObstacles(dt: number, worldSpeed: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      const pos = o.rig.group.position;
      pos.z += worldSpeed * dt;
      if (o.rig.spinPart && o.spinSpeed !== 0) {
        o.rig.spinPart.rotation.z += o.spinSpeed * dt;
      }

      const angle = o.rig.spinPart ? o.rig.spinPart.rotation.z : 0;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);

      if (Math.abs(pos.z - this.playerPos.z) < 2.0) {
        const relX = this.playerPos.x - pos.x;
        const relY = this.playerPos.y - pos.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;

        for (const col of o.rig.colliders) {
          if (
            Math.abs(localX - col.offsetX) < col.halfW + 0.9 &&
            Math.abs(localY - col.offsetY) < col.halfH + 0.65
          ) {
            this.damagePlayer();
            if ((this.phase as GamePhase) !== 'playing') return;
            break;
          }
        }
      }

      if (this.rivalAlive && Math.abs(pos.z - this.rivalPos.z) < 2.0) {
        const relX = this.rivalPos.x - pos.x;
        const relY = this.rivalPos.y - pos.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;

        for (const col of o.rig.colliders) {
          if (
            Math.abs(localX - col.offsetX) < col.halfW + 0.9 &&
            Math.abs(localY - col.offsetY) < col.halfH + 0.65
          ) {
            this.damageRival();
            if ((this.phase as GamePhase) !== 'playing') return;
            break;
          }
        }
      }

      if (pos.z > 22) {
        this.scene.remove(o.rig.group);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private damagePlayer(): void {
    if (this.invulnTimer > 0 || this.overdriveTimer > 0) return;
    this.hull = Math.max(0, this.hull - 1);
    const lostCombo = this.combo > 1;
    this.combo = 0;
    this.score = Math.max(0, this.score - 250);
    this.invulnTimer = 1.65;
    this.sound.playDamage();
    if (!this.reducedMotion) this.screenShake = 0.65;
    this.spawnShockwave(this.playerPos, 5.5, false);
    this.spawnPopup(
      this.playerPos,
      lostCombo ? '-1 HULL · -250 · COMBO LOST' : '-1 HULL · -250',
      'bad'
    );

    if (this.hull <= 0) {
      this.sound.playExplosion(2.0);
      this.spawnExplosion(this.playerPos, 28, 10);
      if (this.playMode === 'solo') {
        this.phase = 'gameover';
        this.sound.updateEngineHum(false, 0, false);
        this.emitHud([], [...this.popups]);
      } else {
        this.finishCompetitiveMatch('Last Pilot Standing', false);
      }
    }
  }

  private damageRival(): void {
    if (!this.rivalAlive || this.rivalInvulnTimer > 0 || this.rivalOverdriveTimer > 0) return;
    this.rivalHull = Math.max(0, this.rivalHull - 1);
    this.rivalCombo = 0;
    this.rivalScore = Math.max(0, this.rivalScore - 250);
    this.rivalInvulnTimer = 1.65;
    this.sound.playDamage();
    this.spawnShockwave(this.rivalPos, 5.2, false);
    this.spawnPopup(this.rivalPos, 'RIVAL -1 HULL', 'bad');

    if (this.rivalHull <= 0) {
      this.rivalAlive = false;
      if (this.rivalRig) this.rivalRig.group.visible = false;
      if (this.rivalShadow) this.rivalShadow.visible = false;
      this.sound.playExplosion(2.0);
      this.spawnExplosion(this.rivalPos, 26, 9.5);
      this.addScore(1500);
      this.beginVictoryAscent('competitive', 'Rival Eliminated · Survivor Victory', this.levelConfig.id > 0);
    }
  }

  private spawnExplosion(pos: THREE.Vector3, count: number, ringScale: number): void {
    this.spawnShockwave(pos, ringScale, false);
    for (let i = 0; i < count; i++) {
      const mat = i % 2 === 0 ? this.pal.enemyCore : this.pal.enemyArmor;
      const mesh = new THREE.Mesh(this.geos.debrisGeo, mat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(0.55 + Math.random() * 1.1);
      const speed = 14 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      const rotVel = new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9);
      this.scene.add(mesh);
      this.debris.push({ mesh, vel, rotVel, life: 0.75 + Math.random() * 0.45, maxLife: 1.1 });
    }
  }

  private spawnShockwave(pos: THREE.Vector3, maxScale: number, friendly: boolean): void {
    const mat = (friendly ? this.pal.boostRingGlow : this.pal.enemyCore).clone();
    mat.transparent = true;
    mat.opacity = 0.9;
    const mesh = new THREE.Mesh(this.geos.shockwaveGeo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, life: 0.36, maxLife: 0.36, maxScale });
  }

  private updateEffects(dt: number, worldSpeed: number): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.debris.splice(i, 1);
        continue;
      }
      d.vel.y -= 18 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.position.z += worldSpeed * 0.3 * dt;
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.scale.setScalar(Math.max(0.01, (d.life / d.maxLife) * 1.2));
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const p = 1 - s.life / s.maxLife;
      s.mesh.scale.setScalar(0.5 + p * s.maxScale);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
    }

    for (let i = this.exhaustDots.length - 1; i >= 0; i--) {
      const dot = this.exhaustDots[i];
      dot.life -= dt;
      if (dot.life <= 0) {
        this.scene.remove(dot.mesh);
        this.exhaustDots.splice(i, 1);
        continue;
      }
      dot.mesh.position.z += worldSpeed * 0.65 * dt;
      dot.mesh.scale.setScalar(Math.max(0.05, (dot.life / dot.maxLife) * 1.1));
    }
  }

  private updateCamera(dt: number, boosting: boolean): void {
    let targetCamX = this.playerPos.x * 0.62;
    let targetCamY = this.playerPos.y + 3.2;
    let targetCamZ = 10.6;
    let lookX = this.playerPos.x * 0.78;
    let lookY = this.playerPos.y + 0.5;
    let lookZ = -24;
    let targetFov = boosting ? 78 : 65;

    if (this.playMode !== 'solo' && this.rivalAlive) {
      const midX = (this.playerPos.x + this.rivalPos.x) * 0.5;
      const midY = (this.playerPos.y + this.rivalPos.y) * 0.5;
      const sepX = Math.abs(this.playerPos.x - this.rivalPos.x);
      targetCamX = midX * 0.5;
      targetCamY = midY + 4.4;
      targetCamZ = 13.6 + Math.min(4.8, sepX * 0.22);
      lookX = midX * 0.65;
      lookY = midY + 0.4;
      lookZ = -22;
      targetFov = boosting ? 76 : 68;
    } else if (this.cameraMode === 'cockpit') {
      targetCamX = this.playerPos.x;
      targetCamY = this.playerPos.y + 0.55;
      targetCamZ = this.playerPos.z - 0.6;
      lookZ = -60;
      targetFov = boosting ? 86 : 74;
    } else if (this.cameraMode === 'wide') {
      targetCamX = this.playerPos.x * 0.42;
      targetCamY = this.playerPos.y + 5.6;
      targetCamZ = 15.8;
      lookZ = -20;
      targetFov = boosting ? 74 : 62;
    }

    if (this.screenShake > 0 && !this.reducedMotion) {
      targetCamX += (Math.random() - 0.5) * this.screenShake * 1.1;
      targetCamY += (Math.random() - 0.5) * this.screenShake * 1.1;
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 8, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 8, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 8, dt);

    _v1.set(lookX, lookY, lookZ);
    this.camera.lookAt(_v1);

    if (this.playMode === 'solo' && this.cameraMode !== 'wide' && !this.reducedMotion) {
      this.camera.rotation.z += THREE.MathUtils.clamp(-this.playerVel.x * 0.008, -0.14, 0.14);
    }

    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();
  }

  private emitHud(
    reticles: TargetReticle[],
    popups: FloatingPopup[],
    webglError: string | null = null
  ): void {
    const bossEnemy = this.enemies.find((e) => e.kind === 'boss');
    const boosting =
      this.phase === 'playing' &&
      (this.playMode === 'two_player'
        ? this.keys.has('ShiftLeft')
        : this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.boostEnergy > 4;

    const baseSpeed = 420 + (this.levelConfig.id === 0 ? this.wave * 30 : this.levelConfig.id * 16);
    const speedKmh =
      this.phase === 'playing'
        ? Math.round(baseSpeed * (boosting ? 1.65 : 1) * (this.overdriveTimer > 0 ? 1.25 : 1))
        : 0;

    const levelProgress =
      this.levelConfig.durationSec > 0
        ? THREE.MathUtils.clamp(this.levelElapsed / this.levelConfig.durationSec, 0, 1)
        : 0;

    let rivalHud: RivalHudSnapshot | null = null;
    if (this.playMode !== 'solo' && (this.phase === 'playing' || this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'levelcomplete')) {
      let screenX: number | null = null;
      let screenY: number | null = null;
      if (this.rivalAlive && this.camera) {
        _v1.copy(this.rivalPos);
        _v1.y += 1.65;
        _v1.project(this.camera);
        if (_v1.z < 1) {
          screenX = THREE.MathUtils.clamp((_v1.x + 1) * 0.5, 0.06, 0.94);
          screenY = THREE.MathUtils.clamp((1 - _v1.y) * 0.5, 0.1, 0.85);
        }
      }
      const aiDiffLabel = AI_DIFFICULTIES.find((d) => d.id === this.aiDifficulty)?.label || 'Medium';
      rivalHud = {
        name: this.playMode === 'two_player' ? 'Player 2' : `AI · ${aiDiffLabel}`,
        isAi: this.playMode === 'ai_compete',
        alive: this.rivalAlive,
        shipShape: this.rivalActiveShipShape,
        score: this.rivalScore,
        combo: this.rivalCombo,
        multiplier: this.getRivalMultiplier(),
        hull: this.rivalHull,
        maxHull: this.rivalMaxHull,
        boostEnergy: Math.round(this.rivalBoostEnergy),
        missileReady: Math.round(this.rivalMissileReady),
        overdriveTimer: Number(this.rivalOverdriveTimer.toFixed(1)),
        kills: this.rivalKills,
        ringsCleared: this.rivalRingsCleared,
        screenX,
        screenY,
      };
    }

    this.onHudUpdate(
      {
        phase: this.phase,
        playMode: this.playMode,
        aiDifficulty: this.aiDifficulty,
        p2ShipShape: this.p2ShipShape,
        aiShipShape: this.aiShipShape,
        roundFormat: this.roundFormat,
        roundNumber: this.roundNumber,
        p1RoundWins: this.p1RoundWins,
        rivalRoundWins: this.rivalRoundWins,
        levelId: this.levelConfig.id,
        levelName: this.levelConfig.name,
        levelProgress,
        score: this.score,
        highScore: this.highScore,
        combo: this.combo,
        comboTimer: THREE.MathUtils.clamp(this.comboDecayTimer / 4.5, 0, 1),
        multiplier: this.getMultiplier(),
        wave: this.wave,
        hull: this.hull,
        maxHull: this.maxHull,
        boostEnergy: Math.round(this.boostEnergy),
        missileReady: Math.round(this.missileReady),
        overdriveTimer: Number(this.overdriveTimer.toFixed(1)),
        magnetTimer: Number(this.magnetTimer.toFixed(1)),
        chronosTimer: Number(this.chronosTimer.toFixed(1)),
        speedKmh,
        kills: this.kills,
        ringsCleared: this.ringsCleared,
        earnedStars: this.earnedStars,
        levelRecords: { ...this.levelRecords },
        wallet: { ...this.wallet },
        milestones: { ...this.milestones, rewardedMilestones: [...this.milestones.rewardedMilestones] },
        unlockedMoves: Array.from(this.unlockedMoves),
        unlockedShips: Array.from(this.unlockedShips),
        moveCooldowns: { ...this.moveCooldowns },
        activeInputBuffer: this.comboSeq.join(' '),
        cameraMode: this.cameraMode,
        glowMode: this.glowMode,
        realmId: this.realmId,
        shipShape: this.shipShape,
        previewShipShape: this.previewShipShape,
        previewRivalShipShape: this.previewRivalShipShape,
        shipSkin: this.shipSkin,
        weaponMode: this.weaponMode,
        autoFire: this.autoFire,
        muted: this.sound.isMuted(),
        boss: bossEnemy
          ? {
              name: bossEnemy.bossName || 'Apex Dreadnought',
              hp: Math.max(0, bossEnemy.hp),
              maxHp: bossEnemy.maxHp,
            }
          : null,
        rival: rivalHud,
        matchResult: this.matchResult,
        bannerText: this.bannerText,
        rewardNotice: this.rewardNotice,
        webglError,
      },
      reticles,
      popups
    );
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.orbitControls?.dispose();
    this.sound.dispose();
    this.clearWorldActors();
    this.terrainGeo?.dispose();
    this.valleyFloorGeo?.dispose();
    this.garageDisposables.forEach((d) => d.dispose());
    this.skyDome?.geometry.dispose();
    this.skyMat?.dispose();
    this.spireInstanced?.geometry.dispose();
    this.spireMat?.dispose();
    this.starInstanced?.geometry.dispose();
    (this.starInstanced?.material as THREE.Material)?.dispose();
    this.contactShadow?.geometry.dispose();
    (this.contactShadow?.material as THREE.Material)?.dispose();
    this.rivalShadow?.geometry.dispose();
    (this.rivalShadow?.material as THREE.Material)?.dispose();
    this.geos?.dispose();
    this.pal?.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
