import * as THREE from 'three';
import { RealmTheme, ShipSkinInfo } from './types';

export interface MaterialPalette {
  hullPrimary: THREE.MeshPhysicalMaterial;
  hullTrim: THREE.MeshStandardMaterial;
  hullDark: THREE.MeshStandardMaterial;
  canopyGlass: THREE.MeshPhysicalMaterial;
  engineGold: THREE.MeshPhysicalMaterial;
  thrusterFlame: THREE.MeshBasicMaterial;
  laserPlayer: THREE.MeshBasicMaterial;
  laserSpread: THREE.MeshBasicMaterial;
  laserBeam: THREE.MeshBasicMaterial;
  laserOverdrive: THREE.MeshBasicMaterial;
  missileBody: THREE.MeshStandardMaterial;

  // Rival / Player 2 Materials (Tactical Slate & Solar Orange)
  rivalHullPrimary: THREE.MeshPhysicalMaterial;
  rivalHullTrim: THREE.MeshStandardMaterial;
  rivalThrusterFlame: THREE.MeshBasicMaterial;
  rivalLaser: THREE.MeshBasicMaterial;
  rivalShieldMat: THREE.MeshBasicMaterial;

  // Threat Materials
  enemyHull: THREE.MeshPhysicalMaterial;
  enemyArmor: THREE.MeshStandardMaterial;
  enemyCore: THREE.MeshStandardMaterial;
  bossHull: THREE.MeshPhysicalMaterial;
  bossRing: THREE.MeshPhysicalMaterial;
  obstacleStone: THREE.MeshStandardMaterial;
  obstacleTrim: THREE.MeshStandardMaterial;

  // Reward & Coin Materials
  crystalShard: THREE.MeshPhysicalMaterial;
  shardHalo: THREE.MeshBasicMaterial;
  overdriveCore: THREE.MeshPhysicalMaterial;
  repairCore: THREE.MeshPhysicalMaterial;
  magnetCore: THREE.MeshPhysicalMaterial;
  chronosCore: THREE.MeshPhysicalMaterial;
  coinCopper: THREE.MeshPhysicalMaterial;
  coinSilver: THREE.MeshPhysicalMaterial;
  coinGold: THREE.MeshPhysicalMaterial;
  boostRingOuter: THREE.MeshStandardMaterial;
  boostRingGlow: THREE.MeshBasicMaterial;

  // World & Garage Materials
  terrainMat: THREE.MeshStandardMaterial;
  terrainWireMat: THREE.MeshBasicMaterial;
  skyscraperMat: THREE.MeshStandardMaterial;
  valleyIceMat: THREE.MeshPhysicalMaterial;
  valleyLavaMat: THREE.MeshStandardMaterial;
  valleyHighwayMat: THREE.MeshStandardMaterial;
  valleyOceanMat: THREE.MeshPhysicalMaterial;
  garageFloorMat: THREE.MeshStandardMaterial;
  garageRingMat: THREE.MeshStandardMaterial;
  vaultShell: THREE.MeshPhysicalMaterial;
  vaultHolo: THREE.MeshBasicMaterial;

  shieldMat: THREE.MeshBasicMaterial;
  contactShadowTex: THREE.CanvasTexture;
  dispose: () => void;
}

function createHullPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Brushed composite aerospace alloy base
  ctx.fillStyle = '#e4eaf3';
  ctx.fillRect(0, 0, 1024, 1024);

  // Fine directional micro-grain
  for (let y = 0; y < 1024; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.03)';
    ctx.fillRect(0, y, 1024, 1);
  }

  // Distinct aerospace armor plate tonal blocks
  const plates = [
    [0, 0, 256, 256, 'rgba(15, 23, 42, 0.055)'],
    [256, 256, 256, 256, 'rgba(15, 23, 42, 0.07)'],
    [512, 0, 256, 512, 'rgba(255, 255, 255, 0.06)'],
    [768, 512, 256, 256, 'rgba(15, 23, 42, 0.06)'],
    [128, 768, 384, 256, 'rgba(15, 23, 42, 0.045)'],
  ] as const;
  for (const [x, y, w, h, c] of plates) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }

  // Subtle airflow weathering streaks
  for (let i = 0; i < 160; i++) {
    const x = ((i * 197) % 980) + 12;
    const y = (i * 89) % 960;
    const len = 36 + (i % 70);
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.06)');
    g.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2, len);
  }

  // Crisp primary & secondary panel seams
  const step = 128;
  ctx.strokeStyle = 'rgba(12, 20, 36, 0.44)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Access hatch diagonals
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 1024; x += 256) {
    for (let y = 0; y < 1024; y += 256) {
      ctx.strokeRect(x + 24, y + 24, 80, 48);
      ctx.beginPath();
      ctx.moveTo(x + 128, y + 32);
      ctx.lineTo(x + 220, y + 124);
      ctx.stroke();
    }
  }

  // Specular bevel edge along seams
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 3; i < 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
  }

  // Micro-rivet lines
  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  for (let x = 10; x < 1024; x += step) {
    for (let y = 10; y < 1024; y += step) {
      for (let r = 0; r < 96; r += 24) {
        ctx.fillRect(x + r, y, 2.5, 2.5);
        ctx.fillRect(x, y + r, 2.5, 2.5);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createHullBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c4c4c4';
  ctx.fillRect(0, 0, 1024, 1024);

  const step = 128;
  ctx.strokeStyle = '#262626';
  ctx.lineWidth = 3.2;
  for (let i = 0; i <= 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 2;
  for (let x = 0; x < 1024; x += 256) {
    for (let y = 0; y < 1024; y += 256) {
      ctx.strokeRect(x + 24, y + 24, 80, 48);
    }
  }

  ctx.fillStyle = '#ffffff';
  for (let x = 10; x < 1024; x += step) {
    for (let y = 10; y < 1024; y += step) {
      for (let r = 0; r < 96; r += 24) {
        ctx.fillRect(x + r, y, 2.5, 2.5);
        ctx.fillRect(x, y + r, 2.5, 2.5);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createTerrainRockTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, 0, 512, 512);

  // Geological strata veins
  for (let y = 0; y < 512; y += 6) {
    const shade = ((y * 17) % 29) > 14 ? 'rgba(0,0,0,0.075)' : 'rgba(255,255,255,0.055)';
    ctx.fillStyle = shade;
    ctx.fillRect(0, y, 512, 2 + (y % 4));
  }

  for (let i = 0; i < 6500; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 19341.123) % 1;
    const px = Math.abs(x) * 512;
    const py = Math.abs(y) * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(px, py, 4 + (i % 9), 1.5 + (i % 4));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createTerrainBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4200; i++) {
    const px = Math.abs(Math.sin(i * 31.7) * 512) % 512;
    const py = Math.abs(Math.cos(i * 63.1) * 512) % 512;
    ctx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#525252';
    ctx.fillRect(px, py, 5 + (i % 8), 2 + (i % 5));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSkyscraperTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 256, 512);

  // Vertical glass curtain mullions
  ctx.fillStyle = '#1e293b';
  for (let x = 0; x < 256; x += 24) {
    ctx.fillRect(x, 0, 4, 512);
  }

  for (let y = 10; y < 502; y += 16) {
    for (let x = 6; x < 248; x += 24) {
      const hash = (x * 19 + y * 11) % 17;
      if (hash > 6) {
        ctx.fillStyle = hash === 16 ? '#fbbf24' : hash > 12 ? '#bae6fd' : '#38bdf8';
      } else {
        ctx.fillStyle = '#090e1a';
      }
      ctx.fillRect(x, y, 16, 10);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createHighwayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#191e28';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3200; i++) {
    const px = Math.abs(Math.sin(i * 45.164) * 512) % 512;
    const py = Math.abs(Math.cos(i * 91.213) * 512) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(px, py, 2, 3);
  }

  // Concrete outer shoulders
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 28, 512);
  ctx.fillRect(484, 0, 28, 512);

  // Subtle tire wear lanes
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(90, 0, 32, 512);
  ctx.fillRect(160, 0, 32, 512);
  ctx.fillRect(320, 0, 32, 512);
  ctx.fillRect(390, 0, 32, 512);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(44, 0, 7, 512);
  ctx.fillRect(461, 0, 7, 512);

  ctx.fillStyle = '#f59e0b';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(252, y, 8, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createLavaTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#240905';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 110; i++) {
    const x = Math.abs(Math.sin(i * 19.3) * 512) % 512;
    const y = Math.abs(Math.cos(i * 43.7) * 512) % 512;
    const r = 16 + (i % 38);
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, '#fdba74');
    grad.addColorStop(0.42, '#ea580c');
    grad.addColorStop(1, 'rgba(36,9,5,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createWaveBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 8) {
    for (let x = 0; x < 256; x += 16) {
      const wave = Math.sin((x + y * 2) * 0.12) * 45;
      const v = Math.max(20, Math.min(235, Math.round(128 + wave)));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 16, 8);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 12);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createHazardGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181014';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(220, 38, 38, 0.48)';
  ctx.lineWidth = 8;
  for (let i = -512; i < 1024; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMaterialPalette(
  theme: RealmTheme,
  skin: ShipSkinInfo,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): MaterialPalette {
  const hullTex = createHullPanelTexture(maxAnisotropy);
  const hullBump = createHullBumpTexture(maxAnisotropy);
  const rockTex = createTerrainRockTexture(maxAnisotropy);
  const rockBump = createTerrainBumpTexture(maxAnisotropy);
  const buildingTex = createSkyscraperTexture(maxAnisotropy);
  const highwayTex = createHighwayTexture(maxAnisotropy);
  const lavaTex = createLavaTexture(maxAnisotropy);
  const waveBump = createWaveBumpTexture(maxAnisotropy);
  const hazardTex = createHazardGridTexture(maxAnisotropy);
  const contactShadowTex = createContactShadowTexture();

  const hullPrimary = new THREE.MeshPhysicalMaterial({
    color: skin.hullColor,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.045,
    metalness: 0.54,
    roughness: 0.34,
    clearcoat: 0.28,
    clearcoatRoughness: 0.25,
  });

  const hullTrim = new THREE.MeshStandardMaterial({
    color: skin.trimColor,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.025,
    metalness: 0.48,
    roughness: 0.38,
    emissive: skin.trimColor,
    emissiveIntensity: 0.06,
  });

  const hullDark = new THREE.MeshStandardMaterial({
    color: 0x1b2230,
    bumpMap: hullBump,
    bumpScale: 0.02,
    metalness: 0.55,
    roughness: 0.55,
  });

  const canopyGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1e4e6e,
    metalness: 0.12,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.65,
    transparent: true,
    opacity: isSoftwareGl ? 0.65 : 0.88,
    ior: 1.52,
    thickness: 0.5,
    clearcoat: 0.72,
    clearcoatRoughness: 0.1,
    emissive: 0x0c4a6e,
    emissiveIntensity: 0.06,
  });

  const engineGold = new THREE.MeshPhysicalMaterial({
    color: 0xc28a3a,
    metalness: 0.9,
    roughness: 0.22,
    anisotropy: 0.7,
  });

  const thrusterFlame = new THREE.MeshBasicMaterial({
    color: skin.flameColor,
    transparent: true,
    opacity: 0.88,
  });

  const laserPlayer = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const laserSpread = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
  const laserBeam = new THREE.MeshBasicMaterial({ color: 0xa78bfa });
  const laserOverdrive = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  const missileBody = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.76,
    roughness: 0.26,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
  });

  const rivalHullPrimary = new THREE.MeshPhysicalMaterial({
    color: 0x3f4c5e,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.045,
    metalness: 0.58,
    roughness: 0.34,
    clearcoat: 0.28,
    clearcoatRoughness: 0.24,
  });

  const rivalHullTrim = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.025,
    metalness: 0.48,
    roughness: 0.35,
    emissive: 0xea580c,
    emissiveIntensity: 0.14,
  });

  const rivalThrusterFlame = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.9,
  });

  const rivalLaser = new THREE.MeshBasicMaterial({ color: 0xfb923c });

  const rivalShieldMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    wireframe: true,
    transparent: true,
    opacity: 0.38,
  });

  const enemyHull = new THREE.MeshPhysicalMaterial({
    color: 0x261116,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.035,
    metalness: 0.68,
    roughness: 0.36,
    clearcoat: 0.22,
    emissive: 0x3b0a12,
    emissiveIntensity: 0.16,
  });

  const enemyArmor = new THREE.MeshStandardMaterial({
    color: 0xc81e32,
    map: hullTex,
    metalness: 0.45,
    roughness: 0.42,
    emissive: 0x991b1b,
    emissiveIntensity: 0.26,
  });

  const enemyCore = new THREE.MeshStandardMaterial({
    color: 0xff2442,
    emissive: 0xff1e38,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.15,
  });

  const bossHull = new THREE.MeshPhysicalMaterial({
    color: 0x220b12,
    map: hazardTex,
    bumpMap: hullBump,
    bumpScale: 0.04,
    metalness: 0.72,
    roughness: 0.32,
    clearcoat: 0.3,
  });

  const bossRing = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    metalness: 0.72,
    roughness: 0.28,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.42,
  });

  const obstacleStone = new THREE.MeshStandardMaterial({
    color: 0x2b161b,
    map: hazardTex,
    bumpMap: rockBump,
    bumpScale: 0.14,
    metalness: 0.38,
    roughness: 0.65,
  });

  const obstacleTrim = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.85,
    metalness: 0.4,
    roughness: 0.32,
  });

  const crystalShard = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    metalness: 0.15,
    roughness: 0.12,
    clearcoat: 0.8,
    emissive: 0x059669,
    emissiveIntensity: 0.72,
    iridescence: isSoftwareGl ? 0 : 0.65,
  });

  const shardHalo = new THREE.MeshBasicMaterial({ color: 0x34d399 });

  const overdriveCore = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    metalness: 0.72,
    roughness: 0.18,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
  });

  const repairCore = new THREE.MeshPhysicalMaterial({
    color: 0x22c55e,
    metalness: 0.35,
    roughness: 0.22,
    emissive: 0x16a34a,
    emissiveIntensity: 0.82,
  });

  const magnetCore = new THREE.MeshPhysicalMaterial({
    color: 0xa855f7,
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0x9333ea,
    emissiveIntensity: 0.82,
  });

  const chronosCore = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.28,
    roughness: 0.16,
    emissive: 0x0284c7,
    emissiveIntensity: 0.82,
  });

  const coinCopper = new THREE.MeshPhysicalMaterial({
    color: 0xc86d41,
    metalness: 0.88,
    roughness: 0.24,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.2,
    anisotropy: 0.75,
  });

  const coinSilver = new THREE.MeshPhysicalMaterial({
    color: 0xdbe3ee,
    metalness: 0.92,
    roughness: 0.2,
    emissive: 0x475569,
    emissiveIntensity: 0.16,
    anisotropy: 0.75,
  });

  const coinGold = new THREE.MeshPhysicalMaterial({
    color: 0xf0b90b,
    metalness: 0.92,
    roughness: 0.2,
    emissive: 0xa16207,
    emissiveIntensity: 0.25,
    anisotropy: 0.75,
  });

  const boostRingOuter = new THREE.MeshStandardMaterial({
    color: 0x13382e,
    map: hullTex,
    metalness: 0.72,
    roughness: 0.32,
  });

  const boostRingGlow = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.9,
  });

  // Sculpted smooth terrain with geological strata bump map
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: rockTex,
    bumpMap: rockBump,
    bumpScale: 0.28,
    metalness: 0.12,
    roughness: 0.86,
  });

  const terrainWireMat = new THREE.MeshBasicMaterial({
    color: theme.terrainGrid,
    wireframe: true,
    transparent: true,
    opacity: theme.terrainWireOpacity,
  });

  const skyscraperMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    map: buildingTex,
    metalness: 0.62,
    roughness: 0.3,
    emissive: 0x1e293b,
    emissiveIntensity: 0.4,
  });

  const valleyIceMat = new THREE.MeshPhysicalMaterial({
    color: 0x93d1ed,
    bumpMap: waveBump,
    bumpScale: 0.08,
    metalness: 0.18,
    roughness: 0.12,
    clearcoat: 0.82,
    clearcoatRoughness: 0.12,
  });

  const valleyLavaMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    map: lavaTex,
    emissive: 0xea580c,
    emissiveMap: lavaTex,
    emissiveIntensity: 0.95,
    roughness: 0.55,
    metalness: 0.1,
  });

  const valleyHighwayMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: highwayTex,
    metalness: 0.26,
    roughness: 0.44,
  });

  const valleyOceanMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d7a6f,
    bumpMap: waveBump,
    bumpScale: 0.14,
    metalness: 0.15,
    roughness: 0.15,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
  });

  const garageFloorMat = new THREE.MeshStandardMaterial({
    color: 0x131926,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.03,
    metalness: 0.62,
    roughness: 0.42,
  });

  const garageRingMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.82,
    roughness: 0.28,
  });

  const vaultShell = new THREE.MeshPhysicalMaterial({
    color: 0x101827,
    map: hullTex,
    bumpMap: hullBump,
    bumpScale: 0.035,
    metalness: 0.72,
    roughness: 0.36,
    clearcoat: 0.35,
  });

  const vaultHolo = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.48,
  });

  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });

  const allMaterials: THREE.Material[] = [
    hullPrimary,
    hullTrim,
    hullDark,
    canopyGlass,
    engineGold,
    thrusterFlame,
    laserPlayer,
    laserSpread,
    laserBeam,
    laserOverdrive,
    missileBody,
    rivalHullPrimary,
    rivalHullTrim,
    rivalThrusterFlame,
    rivalLaser,
    rivalShieldMat,
    enemyHull,
    enemyArmor,
    enemyCore,
    bossHull,
    bossRing,
    obstacleStone,
    obstacleTrim,
    crystalShard,
    shardHalo,
    overdriveCore,
    repairCore,
    magnetCore,
    chronosCore,
    coinCopper,
    coinSilver,
    coinGold,
    boostRingOuter,
    boostRingGlow,
    terrainMat,
    terrainWireMat,
    skyscraperMat,
    valleyIceMat,
    valleyLavaMat,
    valleyHighwayMat,
    valleyOceanMat,
    garageFloorMat,
    garageRingMat,
    vaultShell,
    vaultHolo,
    shieldMat,
  ];

  const allTextures: THREE.Texture[] = [
    hullTex,
    hullBump,
    rockTex,
    rockBump,
    buildingTex,
    highwayTex,
    lavaTex,
    waveBump,
    hazardTex,
    contactShadowTex,
  ];

  return {
    hullPrimary,
    hullTrim,
    hullDark,
    canopyGlass,
    engineGold,
    thrusterFlame,
    laserPlayer,
    laserSpread,
    laserBeam,
    laserOverdrive,
    missileBody,
    rivalHullPrimary,
    rivalHullTrim,
    rivalThrusterFlame,
    rivalLaser,
    rivalShieldMat,
    enemyHull,
    enemyArmor,
    enemyCore,
    bossHull,
    bossRing,
    obstacleStone,
    obstacleTrim,
    crystalShard,
    shardHalo,
    overdriveCore,
    repairCore,
    magnetCore,
    chronosCore,
    coinCopper,
    coinSilver,
    coinGold,
    boostRingOuter,
    boostRingGlow,
    terrainMat,
    terrainWireMat,
    skyscraperMat,
    valleyIceMat,
    valleyLavaMat,
    valleyHighwayMat,
    valleyOceanMat,
    garageFloorMat,
    garageRingMat,
    vaultShell,
    vaultHolo,
    shieldMat,
    contactShadowTex,
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
      allMaterials.forEach((m) => m.dispose());
    },
  };
}

export function applyRealmToPalette(pal: MaterialPalette, theme: RealmTheme): void {
  pal.terrainWireMat.color.setHex(theme.terrainGrid);
  pal.terrainWireMat.opacity = theme.terrainWireOpacity;
}

export function applyShipSkinToPalette(pal: MaterialPalette, skin: ShipSkinInfo): void {
  pal.hullPrimary.color.setHex(skin.hullColor);
  pal.hullTrim.color.setHex(skin.trimColor);
  pal.hullTrim.emissive.setHex(skin.trimColor);
  pal.thrusterFlame.color.setHex(skin.flameColor);
}
