import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MaterialPalette } from './materials';
import { CollectibleKind, EnemyKind, ShipShapeId } from './types';

export interface PlayerRig {
  group: THREE.Group;
  modelRoot: THREE.Group;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
  shieldDome: THREE.Mesh;
  cannonLeft: THREE.Mesh;
  cannonRight: THREE.Mesh;
  haloRing?: THREE.Mesh;
  isLockedVault?: boolean;
}

export interface EnemyRig {
  group: THREE.Group;
  spinParts: THREE.Object3D[];
  counterSpinParts: THREE.Object3D[];
  coreMesh: THREE.Mesh;
  hitRadius: number;
}

export interface GateRig {
  group: THREE.Group;
  innerRing: THREE.Mesh;
  chevrons: THREE.Group;
  radius: number;
}

export interface CollectibleRig {
  group: THREE.Group;
  inner: THREE.Mesh;
  halo: THREE.Mesh;
}

export interface ObstacleRig {
  group: THREE.Group;
  spinPart?: THREE.Object3D;
  colliders: Array<{ offsetX: number; offsetY: number; halfW: number; halfH: number }>;
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p.clone();
    if (g.attributes.tangent) g.deleteAttribute('tangent');
    return g;
  });
  const merged = mergeGeometries(normalized, false);
  normalized.forEach((p) => p.dispose());
  if (!merged) return parts[0].clone();
  return merged;
}

function makeTransformed(
  geo: THREE.BufferGeometry,
  tx = 0,
  ty = 0,
  tz = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1
): THREE.BufferGeometry {
  const g = geo.clone();
  const mat = new THREE.Matrix4().compose(
    new THREE.Vector3(tx, ty, tz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
  g.applyMatrix4(mat);
  return g;
}

export class GeometryBank {
  public readonly playerFuselageGeo: THREE.BufferGeometry;
  public readonly playerWingGeo: THREE.BufferGeometry;
  public readonly playerTailFinGeo: THREE.BufferGeometry;
  public readonly playerNacelleGeo: THREE.BufferGeometry;
  public readonly playerCanopyGeo: THREE.BufferGeometry;
  public readonly playerCanopyFrameGeo: THREE.BufferGeometry;
  public readonly playerCockpitSeatGeo: THREE.BufferGeometry;
  public readonly playerThrusterGeo: THREE.BufferGeometry;
  public readonly playerCannonGeo: THREE.BufferGeometry;
  public readonly playerIntakeGeo: THREE.BufferGeometry;
  public readonly playerPylonGeo: THREE.BufferGeometry;
  public readonly playerShieldGeo: THREE.BufferGeometry;

  // Additional Player Ship Geometries
  public readonly tridentNoseGeo: THREE.BufferGeometry;
  public readonly tridentWingGeo: THREE.BufferGeometry;
  public readonly titanPodGeo: THREE.BufferGeometry;
  public readonly titanBridgeGeo: THREE.BufferGeometry;
  public readonly phantomBodyGeo: THREE.BufferGeometry;
  public readonly phantomForwardWingGeo: THREE.BufferGeometry;
  public readonly seraphHaloGeo: THREE.BufferGeometry;
  public readonly sovereignWingGeo: THREE.BufferGeometry;
  public readonly raptorWingGeo: THREE.BufferGeometry;
  public readonly talonBoomGeo: THREE.BufferGeometry;
  public readonly mantisClawGeo: THREE.BufferGeometry;
  public readonly hammerCanardGeo: THREE.BufferGeometry;
  public readonly eclipseWingGeo: THREE.BufferGeometry;
  public readonly chronoDiscGeo: THREE.BufferGeometry;
  public readonly wyvernStrutGeo: THREE.BufferGeometry;

  // Locked Vault Geometries
  public readonly vaultPodGeo: THREE.BufferGeometry;
  public readonly vaultCageGeo: THREE.BufferGeometry;
  public readonly vaultLockGeo: THREE.BufferGeometry;

  // Enemy Geometries
  public readonly dartBodyGeo: THREE.BufferGeometry;
  public readonly dartWingGeo: THREE.BufferGeometry;
  public readonly dartRingGeo: THREE.BufferGeometry;

  public readonly gyroCoreGeo: THREE.BufferGeometry;
  public readonly gyroRingOuterGeo: THREE.BufferGeometry;
  public readonly gyroRingInnerGeo: THREE.BufferGeometry;
  public readonly gyroSpikeGeo: THREE.BufferGeometry;

  public readonly monolithBodyGeo: THREE.BufferGeometry;
  public readonly monolithCapGeo: THREE.BufferGeometry;
  public readonly monolithOrbGeo: THREE.BufferGeometry;

  public readonly cruiserKnotGeo: THREE.BufferGeometry;
  public readonly cruiserWingGeo: THREE.BufferGeometry;
  public readonly cruiserPodGeo: THREE.BufferGeometry;

  public readonly prismCoreGeo: THREE.BufferGeometry;
  public readonly prismBladeGeo: THREE.BufferGeometry;

  public readonly bossHullGeo: THREE.BufferGeometry;
  public readonly bossRing1Geo: THREE.BufferGeometry;
  public readonly bossRing2Geo: THREE.BufferGeometry;
  public readonly bossCoreGeo: THREE.BufferGeometry;
  public readonly bossTurretGeo: THREE.BufferGeometry;
  public readonly bossSpireGeo: THREE.BufferGeometry;

  public readonly gateOuterGeo: THREE.BufferGeometry;
  public readonly gateInnerGeo: THREE.BufferGeometry;
  public readonly gateChevronGeo: THREE.BufferGeometry;
  public readonly gatePylonGeo: THREE.BufferGeometry;

  public readonly shardGeo: THREE.BufferGeometry;
  public readonly shardHaloGeo: THREE.BufferGeometry;
  public readonly overdriveCoreGeo: THREE.BufferGeometry;
  public readonly overdriveCageGeo: THREE.BufferGeometry;
  public readonly repairBoxGeo: THREE.BufferGeometry;
  public readonly magnetCoreGeo: THREE.BufferGeometry;
  public readonly chronosCoreGeo: THREE.BufferGeometry;
  public readonly coinDiscGeo: THREE.BufferGeometry;
  public readonly coinRimGeo: THREE.BufferGeometry;

  public readonly obstaclePillarGeo: THREE.BufferGeometry;
  public readonly obstacleHexCapGeo: THREE.BufferGeometry;
  public readonly obstacleArchBeamGeo: THREE.BufferGeometry;
  public readonly obstacleAsteroidGeo: THREE.BufferGeometry;
  public readonly obstacleCrossBarGeo: THREE.BufferGeometry;
  public readonly obstacleSawRingGeo: THREE.BufferGeometry;
  public readonly obstacleSawToothGeo: THREE.BufferGeometry;
  public readonly obstacleLaserBeamGeo: THREE.BufferGeometry;

  public readonly laserGeo: THREE.BufferGeometry;
  public readonly beamGeo: THREE.BufferGeometry;
  public readonly missileGeo: THREE.BufferGeometry;
  public readonly enemyShotGeo: THREE.BufferGeometry;
  public readonly debrisGeo: THREE.BufferGeometry;
  public readonly shockwaveGeo: THREE.BufferGeometry;
  public readonly exhaustParticleGeo: THREE.BufferGeometry;

  private readonly allGeos: THREE.BufferGeometry[] = [];

  constructor() {
    // 1. Sculpted Fighter Fuselage (curved splines + nose radome + dorsal spine)
    const fuseShape = new THREE.Shape();
    fuseShape.moveTo(0, 2.55);
    fuseShape.quadraticCurveTo(0.28, 1.85, 0.44, 0.95);
    fuseShape.quadraticCurveTo(0.62, -0.05, 0.56, -1.25);
    fuseShape.lineTo(0.36, -1.78);
    fuseShape.lineTo(-0.36, -1.78);
    fuseShape.lineTo(-0.56, -1.25);
    fuseShape.quadraticCurveTo(-0.62, -0.05, -0.44, 0.95);
    fuseShape.quadraticCurveTo(-0.28, 1.85, 0, 2.55);
    const baseFuse = new THREE.ExtrudeGeometry(fuseShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.1,
      bevelSegments: 4,
      curveSegments: 16,
    });
    baseFuse.rotateX(Math.PI / 2);
    baseFuse.center();

    const radomePts = [
      new THREE.Vector2(0.005, 0.65),
      new THREE.Vector2(0.11, 0.42),
      new THREE.Vector2(0.21, 0.15),
      new THREE.Vector2(0.27, -0.18),
      new THREE.Vector2(0.24, -0.35),
    ];
    const radomeRaw = new THREE.LatheGeometry(radomePts, 18);
    radomeRaw.rotateX(Math.PI / 2);
    const radomePart = makeTransformed(radomeRaw, 0, 0.01, 2.22);

    const dorsalRaw = new THREE.CylinderGeometry(0.14, 0.25, 2.0, 12);
    dorsalRaw.rotateX(Math.PI / 2);
    const dorsalPart = makeTransformed(dorsalRaw, 0, 0.24, -0.58, 0, 0, 0, 1.0, 0.65, 1.0);

    this.playerFuselageGeo = mergeParts([baseFuse, radomePart, dorsalPart]);
    baseFuse.dispose();
    radomeRaw.dispose();
    radomePart.dispose();
    dorsalRaw.dispose();
    dorsalPart.dispose();

    // 2. Swept Wing with Wingtip Pod & Underwing Missile Pylon
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.34, 0.52);
    wingShape.quadraticCurveTo(1.45, -0.25, 2.48, -0.98);
    wingShape.lineTo(2.34, -1.42);
    wingShape.quadraticCurveTo(1.3, -1.15, 0.44, -1.15);
    wingShape.closePath();
    const wingSlab = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.045,
      bevelSegments: 3,
      curveSegments: 12,
    });
    wingSlab.rotateX(Math.PI / 2);

    const tipPodRaw = new THREE.CapsuleGeometry(0.065, 0.72, 6, 12);
    tipPodRaw.rotateX(Math.PI / 2);
    const tipPod = makeTransformed(tipPodRaw, 2.44, -0.01, 1.18);

    const pylonRaw = new THREE.BoxGeometry(0.06, 0.16, 0.68);
    const pylon = makeTransformed(pylonRaw, 1.38, -0.12, 0.72);

    this.playerWingGeo = mergeParts([wingSlab, tipPod, pylon]);
    wingSlab.dispose();
    tipPodRaw.dispose();
    tipPod.dispose();
    pylonRaw.dispose();
    pylon.dispose();

    // 3. Angled Tail Fin with Rudder Trim
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.75, 0);
    finShape.lineTo(1.02, 0.92);
    finShape.lineTo(0.48, 0.92);
    finShape.quadraticCurveTo(0.18, 0.5, 0, 0);
    this.playerTailFinGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.048,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.022,
      bevelSegments: 2,
    });
    this.playerTailFinGeo.rotateY(Math.PI / 2);

    // 4. Sculpted Multi-Station Turbo-Ion Nacelle + Stepped Exhaust Iris
    const lathePts = [
      new THREE.Vector2(0.11, -1.08),
      new THREE.Vector2(0.22, -0.96),
      new THREE.Vector2(0.26, -0.78),
      new THREE.Vector2(0.24, -0.62),
      new THREE.Vector2(0.3, -0.35),
      new THREE.Vector2(0.31, 0.25),
      new THREE.Vector2(0.25, 0.68),
      new THREE.Vector2(0.2, 0.92),
      new THREE.Vector2(0.13, 0.96),
      new THREE.Vector2(0.09, 0.8),
    ];
    this.playerNacelleGeo = new THREE.LatheGeometry(lathePts, 24);
    this.playerNacelleGeo.rotateX(Math.PI / 2);

    // 5. Bubble Canopy + Cockpit Arch Frame + Pilot HUD Seat
    this.playerCanopyGeo = new THREE.SphereGeometry(0.34, 24, 16);
    this.playerCanopyGeo.scale(0.88, 0.66, 2.3);

    const frameArch1 = new THREE.TorusGeometry(0.31, 0.028, 8, 20, Math.PI);
    const archPart1 = makeTransformed(frameArch1, 0, 0.02, 0.12, 0, 0, 0, 0.92, 0.72, 1.0);
    const archPart2 = makeTransformed(frameArch1, 0, 0.04, -0.28, 0, 0, 0, 0.94, 0.7, 1.0);
    const spineBarRaw = new THREE.CapsuleGeometry(0.025, 0.8, 4, 8);
    spineBarRaw.rotateX(Math.PI / 2);
    const spineBar = makeTransformed(spineBarRaw, 0, 0.21, -0.1, -0.12, 0, 0);
    this.playerCanopyFrameGeo = mergeParts([archPart1, archPart2, spineBar]);
    frameArch1.dispose();
    archPart1.dispose();
    archPart2.dispose();
    spineBarRaw.dispose();
    spineBar.dispose();

    const seatBase = new THREE.BoxGeometry(0.24, 0.14, 0.28);
    const seatBack = new THREE.BoxGeometry(0.22, 0.28, 0.08);
    const headrest = new THREE.BoxGeometry(0.16, 0.12, 0.08);
    const s1 = makeTransformed(seatBase, 0, 0.02, 0);
    const s2 = makeTransformed(seatBack, 0, 0.16, -0.12, -0.2);
    const s3 = makeTransformed(headrest, 0, 0.3, -0.16);
    this.playerCockpitSeatGeo = mergeParts([s1, s2, s3]);
    seatBase.dispose();
    seatBack.dispose();
    headrest.dispose();
    s1.dispose();
    s2.dispose();
    s3.dispose();

    // 6. Contoured Afterburner Plume
    const plumePts = [
      new THREE.Vector2(0.004, -0.58),
      new THREE.Vector2(0.08, -0.25),
      new THREE.Vector2(0.17, 0.15),
      new THREE.Vector2(0.13, 0.42),
      new THREE.Vector2(0.2, 0.55),
      new THREE.Vector2(0.01, 0.58),
    ];
    this.playerThrusterGeo = new THREE.LatheGeometry(plumePts, 16);
    this.playerThrusterGeo.rotateX(Math.PI / 2);

    // 7. Stepped Rail Cannon (shroud + barrel + muzzle collar)
    const shroud = new THREE.CylinderGeometry(0.085, 0.095, 0.55, 10);
    shroud.rotateX(Math.PI / 2);
    const barrel = new THREE.CylinderGeometry(0.042, 0.052, 1.38, 10);
    barrel.rotateX(Math.PI / 2);
    const muzzle = new THREE.CylinderGeometry(0.062, 0.062, 0.16, 10);
    muzzle.rotateX(Math.PI / 2);
    const pShroud = makeTransformed(shroud, 0, 0, -0.25);
    const pBarrel = makeTransformed(barrel, 0, 0, 0.15);
    const pMuzzle = makeTransformed(muzzle, 0, 0, 0.8);
    this.playerCannonGeo = mergeParts([pShroud, pBarrel, pMuzzle]);
    shroud.dispose();
    barrel.dispose();
    muzzle.dispose();
    pShroud.dispose();
    pBarrel.dispose();
    pMuzzle.dispose();

    // 8. Sculpted Dorsal Intake Spine
    const intakeShape = new THREE.Shape();
    intakeShape.moveTo(0, 0.85);
    intakeShape.lineTo(0.24, 0.45);
    intakeShape.lineTo(0.28, -0.82);
    intakeShape.lineTo(-0.28, -0.82);
    intakeShape.lineTo(-0.24, 0.45);
    intakeShape.closePath();
    this.playerIntakeGeo = new THREE.ExtrudeGeometry(intakeShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    this.playerIntakeGeo.rotateX(Math.PI / 2);
    this.playerIntakeGeo.center();

    // Underwing Missile Hardpoint Pod
    const podBody = new THREE.CapsuleGeometry(0.055, 0.52, 6, 10);
    podBody.rotateX(Math.PI / 2);
    this.playerPylonGeo = podBody;

    this.playerShieldGeo = new THREE.IcosahedronGeometry(2.85, 1);

    // Trident Tri-Wing Geometries
    const triPts = [
      new THREE.Vector2(0.005, 2.05),
      new THREE.Vector2(0.22, 1.1),
      new THREE.Vector2(0.42, 0.15),
      new THREE.Vector2(0.48, -0.85),
      new THREE.Vector2(0.32, -1.75),
      new THREE.Vector2(0.08, -1.9),
    ];
    this.tridentNoseGeo = new THREE.LatheGeometry(triPts, 18);
    this.tridentNoseGeo.rotateX(Math.PI / 2);

    const triWing = new THREE.Shape();
    triWing.moveTo(0.2, 0.65);
    triWing.quadraticCurveTo(1.35, 0.05, 2.38, -0.62);
    triWing.lineTo(1.98, -1.28);
    triWing.lineTo(0.26, -0.82);
    triWing.closePath();
    const triWingRaw = new THREE.ExtrudeGeometry(triWing, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.032,
      bevelSize: 0.035,
      bevelSegments: 3,
    });
    triWingRaw.rotateX(Math.PI / 2);
    const triTipRaw = new THREE.CapsuleGeometry(0.055, 0.65, 5, 10);
    triTipRaw.rotateX(Math.PI / 2);
    const triTip = makeTransformed(triTipRaw, 2.2, 0, 0.92);
    this.tridentWingGeo = mergeParts([triWingRaw, triTip]);
    triWingRaw.dispose();
    triTipRaw.dispose();
    triTip.dispose();

    // Titan Heavy Gunship Geometries
    const podShape = new THREE.Shape();
    podShape.moveTo(0, 2.05);
    podShape.quadraticCurveTo(0.42, 1.35, 0.48, 0.65);
    podShape.lineTo(0.56, -1.65);
    podShape.lineTo(-0.46, -1.65);
    podShape.lineTo(-0.44, 0.65);
    podShape.quadraticCurveTo(-0.36, 1.35, 0, 2.05);
    this.titanPodGeo = new THREE.ExtrudeGeometry(podShape, {
      depth: 0.52,
      bevelEnabled: true,
      bevelThickness: 0.11,
      bevelSize: 0.08,
      bevelSegments: 3,
    });
    this.titanPodGeo.rotateX(Math.PI / 2);
    this.titanPodGeo.center();

    const bridgeMain = new THREE.BoxGeometry(2.45, 0.34, 1.25);
    const bridgeRidge = new THREE.BoxGeometry(1.95, 0.18, 0.65);
    const b1 = makeTransformed(bridgeMain, 0, 0, 0);
    const b2 = makeTransformed(bridgeRidge, 0, 0.22, -0.1);
    this.titanBridgeGeo = mergeParts([b1, b2]);
    bridgeMain.dispose();
    bridgeRidge.dispose();
    b1.dispose();
    b2.dispose();

    // Phantom Forward-Swept Needle Geometries
    const phPts = [
      new THREE.Vector2(0.005, 2.35),
      new THREE.Vector2(0.18, 1.45),
      new THREE.Vector2(0.36, 0.35),
      new THREE.Vector2(0.44, -0.75),
      new THREE.Vector2(0.32, -1.85),
      new THREE.Vector2(0.1, -2.05),
    ];
    this.phantomBodyGeo = new THREE.LatheGeometry(phPts, 20);
    this.phantomBodyGeo.rotateX(Math.PI / 2);

    const fwdWing = new THREE.Shape();
    fwdWing.moveTo(0.24, -0.45);
    fwdWing.quadraticCurveTo(1.4, 0.35, 2.58, 1.06);
    fwdWing.lineTo(2.12, 1.42);
    fwdWing.lineTo(0.32, 0.38);
    fwdWing.closePath();
    const fwdRaw = new THREE.ExtrudeGeometry(fwdWing, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.035,
      bevelSegments: 3,
    });
    fwdRaw.rotateX(Math.PI / 2);
    const fwdPodRaw = new THREE.CapsuleGeometry(0.055, 0.68, 5, 10);
    fwdPodRaw.rotateX(Math.PI / 2);
    const fwdPod = makeTransformed(fwdPodRaw, 2.38, 0, -1.16);
    this.phantomForwardWingGeo = mergeParts([fwdRaw, fwdPod]);
    fwdRaw.dispose();
    fwdPodRaw.dispose();
    fwdPod.dispose();

    // Seraph Halo Ring-Wing
    this.seraphHaloGeo = new THREE.TorusGeometry(1.78, 0.14, 14, 42);

    // Sovereign Twin-Delta Ace Wings
    const sovWing = new THREE.Shape();
    sovWing.moveTo(0.4, 1.35);
    sovWing.lineTo(2.88, -0.35);
    sovWing.lineTo(2.62, -1.68);
    sovWing.lineTo(1.22, -1.35);
    sovWing.lineTo(0.46, -1.72);
    sovWing.closePath();
    const sovRaw = new THREE.ExtrudeGeometry(sovWing, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.05,
      bevelSegments: 3,
    });
    sovRaw.rotateX(Math.PI / 2);
    const sovPodRaw = new THREE.CapsuleGeometry(0.07, 0.85, 6, 10);
    sovPodRaw.rotateX(Math.PI / 2);
    const sovPod = makeTransformed(sovPodRaw, 2.75, 0, 1.0);
    this.sovereignWingGeo = mergeParts([sovRaw, sovPod]);
    sovRaw.dispose();
    sovPodRaw.dispose();
    sovPod.dispose();

    // Raptor Stealth Trapezoid Wings
    const rapWing = new THREE.Shape();
    rapWing.moveTo(0.44, 0.88);
    rapWing.lineTo(2.48, -0.45);
    rapWing.lineTo(2.26, -1.24);
    rapWing.lineTo(0.48, -1.26);
    rapWing.closePath();
    this.raptorWingGeo = new THREE.ExtrudeGeometry(rapWing, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.032,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    this.raptorWingGeo.rotateX(Math.PI / 2);

    // Talon Dual Nose Booms (sculpted Lathe)
    const boomPts = [
      new THREE.Vector2(0.005, 2.0),
      new THREE.Vector2(0.14, 1.45),
      new THREE.Vector2(0.24, 0.25),
      new THREE.Vector2(0.25, -1.45),
      new THREE.Vector2(0.16, -1.95),
    ];
    this.talonBoomGeo = new THREE.LatheGeometry(boomPts, 18);
    this.talonBoomGeo.rotateX(Math.PI / 2);

    // Mantis Forward Split Mandible
    const clawShape = new THREE.Shape();
    clawShape.moveTo(0.32, -0.82);
    clawShape.quadraticCurveTo(1.15, 0.25, 1.28, 0.72);
    clawShape.lineTo(0.92, 2.38);
    clawShape.lineTo(0.55, 1.56);
    clawShape.lineTo(0.65, 0.42);
    clawShape.lineTo(0.25, -0.35);
    clawShape.closePath();
    this.mantisClawGeo = new THREE.ExtrudeGeometry(clawShape, {
      depth: 0.095,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 3,
    });
    this.mantisClawGeo.rotateX(Math.PI / 2);

    // Hammerhead Wide Front Canard
    const camShape = new THREE.Shape();
    camShape.moveTo(-2.25, 0.15);
    camShape.lineTo(-1.85, 0.42);
    camShape.lineTo(1.85, 0.42);
    camShape.lineTo(2.25, 0.15);
    camShape.lineTo(2.05, -0.35);
    camShape.lineTo(-2.05, -0.35);
    camShape.closePath();
    this.hammerCanardGeo = new THREE.ExtrudeGeometry(camShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    this.hammerCanardGeo.rotateX(Math.PI / 2);
    this.hammerCanardGeo.center();

    // Eclipse Crescent Flying Wing
    const eclShape = new THREE.Shape();
    eclShape.moveTo(0, 1.82);
    eclShape.quadraticCurveTo(1.6, 0.7, 2.95, -0.95);
    eclShape.lineTo(2.45, -1.58);
    eclShape.quadraticCurveTo(1.4, -0.85, 0.85, -0.55);
    eclShape.lineTo(0, -1.12);
    eclShape.lineTo(-0.85, -0.55);
    eclShape.quadraticCurveTo(-1.4, -0.85, -2.45, -1.58);
    eclShape.lineTo(-2.95, -0.95);
    eclShape.quadraticCurveTo(-1.6, 0.7, 0, 1.82);
    this.eclipseWingGeo = new THREE.ExtrudeGeometry(eclShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
    });
    this.eclipseWingGeo.rotateX(Math.PI / 2);
    this.eclipseWingGeo.center();

    // Chrono-Wing Shroud Disc
    this.chronoDiscGeo = new THREE.TorusGeometry(2.05, 0.16, 14, 42);
    this.chronoDiscGeo.rotateX(Math.PI / 2);

    // Wyvern Biplane Strut
    this.wyvernStrutGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.78, 10);

    // Locked Stealth Containment Vault Pod
    const vHex = new THREE.CylinderGeometry(1.55, 1.85, 1.15, 8);
    const vCap = new THREE.CylinderGeometry(0.85, 1.55, 0.55, 8);
    const vBot = new THREE.CylinderGeometry(1.85, 1.15, 0.45, 8);
    const vp1 = makeTransformed(vHex, 0, 0, 0);
    const vp2 = makeTransformed(vCap, 0, 0.85, 0);
    const vp3 = makeTransformed(vBot, 0, -0.8, 0);
    this.vaultPodGeo = mergeParts([vp1, vp2, vp3]);
    vHex.dispose();
    vCap.dispose();
    vBot.dispose();
    vp1.dispose();
    vp2.dispose();
    vp3.dispose();
    this.vaultCageGeo = new THREE.TorusGeometry(2.55, 0.06, 10, 48);
    this.vaultLockGeo = new THREE.OctahedronGeometry(0.52, 0);

    // Enemy 1: Interceptor Dart (Multi-faceted sculpted fuselage)
    const dPts = [
      new THREE.Vector2(0.01, -1.45),
      new THREE.Vector2(0.45, -0.45),
      new THREE.Vector2(0.75, 0.55),
      new THREE.Vector2(0.45, 1.25),
      new THREE.Vector2(0.12, 1.4),
    ];
    this.dartBodyGeo = new THREE.LatheGeometry(dPts, 10);
    this.dartBodyGeo.rotateX(Math.PI / 2);
    const dartWingShape = new THREE.Shape();
    dartWingShape.moveTo(0.25, 0.55);
    dartWingShape.lineTo(1.82, -0.75);
    dartWingShape.lineTo(1.38, -1.08);
    dartWingShape.lineTo(0.25, -0.5);
    dartWingShape.closePath();
    this.dartWingGeo = new THREE.ExtrudeGeometry(dartWingShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2,
    });
    this.dartWingGeo.rotateX(Math.PI / 2);
    this.dartRingGeo = new THREE.TorusGeometry(0.68, 0.08, 10, 24);

    // Enemy 2: Sentinel Gyro-Sphere
    this.gyroCoreGeo = new THREE.IcosahedronGeometry(0.92, 1);
    this.gyroRingOuterGeo = new THREE.TorusGeometry(1.75, 0.15, 12, 36);
    this.gyroRingInnerGeo = new THREE.TorusGeometry(1.32, 0.11, 10, 28);
    this.gyroSpikeGeo = new THREE.ConeGeometry(0.22, 0.85, 8);

    // Enemy 3: Fluted Monolith Turret
    const mCol = new THREE.CylinderGeometry(0.78, 1.05, 3.4, 8);
    const mCollar = new THREE.TorusGeometry(1.05, 0.14, 8, 16);
    mCollar.rotateX(Math.PI / 2);
    const mc1 = makeTransformed(mCol, 0, 0, 0);
    const mc2 = makeTransformed(mCollar, 0, 0.85, 0);
    const mc3 = makeTransformed(mCollar, 0, -0.85, 0);
    this.monolithBodyGeo = mergeParts([mc1, mc2, mc3]);
    mCol.dispose();
    mCollar.dispose();
    mc1.dispose();
    mc2.dispose();
    mc3.dispose();
    this.monolithCapGeo = new THREE.ConeGeometry(0.78, 1.08, 8);
    this.monolithOrbGeo = new THREE.OctahedronGeometry(0.42, 1);

    // Enemy 4: Vortex Cruiser
    this.cruiserKnotGeo = new THREE.TorusKnotGeometry(0.95, 0.24, 64, 12, 2, 3);
    const cruiserWingShape = new THREE.Shape();
    cruiserWingShape.moveTo(0.8, 1.15);
    cruiserWingShape.lineTo(2.95, 0.12);
    cruiserWingShape.lineTo(2.42, -1.45);
    cruiserWingShape.lineTo(0.7, -0.82);
    cruiserWingShape.closePath();
    this.cruiserWingGeo = new THREE.ExtrudeGeometry(cruiserWingShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 3,
    });
    this.cruiserWingGeo.rotateX(Math.PI / 2);
    this.cruiserPodGeo = new THREE.CylinderGeometry(0.32, 0.24, 2.25, 12);
    this.cruiserPodGeo.rotateX(Math.PI / 2);

    // Enemy 5: Star-Prism Interceptor
    this.prismCoreGeo = new THREE.OctahedronGeometry(1.05, 1);
    this.prismBladeGeo = new THREE.ConeGeometry(0.38, 2.1, 6);

    // Enemy 6: Apex Dreadnought Boss
    const bossShape = new THREE.Shape();
    bossShape.moveTo(0, 4.35);
    bossShape.lineTo(3.25, 2.25);
    bossShape.lineTo(5.3, -0.8);
    bossShape.lineTo(3.45, -3.65);
    bossShape.lineTo(-3.45, -3.65);
    bossShape.lineTo(-5.3, -0.8);
    bossShape.lineTo(-3.25, 2.25);
    bossShape.closePath();
    this.bossHullGeo = new THREE.ExtrudeGeometry(bossShape, {
      depth: 1.4,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.3,
      bevelSegments: 3,
    });
    this.bossHullGeo.rotateX(Math.PI / 2);
    this.bossHullGeo.center();
    this.bossRing1Geo = new THREE.TorusGeometry(6.4, 0.34, 14, 48);
    this.bossRing2Geo = new THREE.TorusGeometry(4.9, 0.24, 12, 40);
    this.bossCoreGeo = new THREE.IcosahedronGeometry(1.75, 2);
    this.bossTurretGeo = new THREE.CylinderGeometry(0.45, 0.65, 2.4, 12);
    this.bossTurretGeo.rotateX(Math.PI / 2);
    this.bossSpireGeo = new THREE.ConeGeometry(0.85, 3.2, 8);

    // Boost Gate (Octagonal armored gantry)
    this.gateOuterGeo = new THREE.TorusGeometry(5.6, 0.34, 12, 8);
    this.gateInnerGeo = new THREE.TorusGeometry(4.95, 0.16, 10, 36);
    const chevShape = new THREE.Shape();
    chevShape.moveTo(0, 0.55);
    chevShape.lineTo(0.45, -0.35);
    chevShape.lineTo(0, -0.1);
    chevShape.lineTo(-0.45, -0.35);
    chevShape.closePath();
    this.gateChevronGeo = new THREE.ExtrudeGeometry(chevShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    this.gatePylonGeo = new THREE.BoxGeometry(0.75, 2.4, 0.85);

    // Collectibles & Coins
    this.shardGeo = new THREE.OctahedronGeometry(0.95, 0);
    this.shardHaloGeo = new THREE.TorusGeometry(1.38, 0.08, 10, 28);
    this.overdriveCoreGeo = new THREE.DodecahedronGeometry(0.9, 0);
    this.overdriveCageGeo = new THREE.TorusKnotGeometry(1.2, 0.09, 48, 10, 2, 3);
    this.repairBoxGeo = new THREE.BoxGeometry(1.35, 0.44, 0.44);
    this.magnetCoreGeo = new THREE.TorusGeometry(0.85, 0.22, 12, 28);
    this.chronosCoreGeo = new THREE.IcosahedronGeometry(0.9, 1);
    this.coinDiscGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.22, 28);
    this.coinDiscGeo.rotateX(Math.PI / 2);
    this.coinRimGeo = new THREE.TorusGeometry(0.98, 0.11, 10, 28);

    // Obstacles (reinforced industrial pillars & rocky clusters)
    const pShaft = new THREE.CylinderGeometry(1.38, 1.88, 34, 8);
    const pCollar = new THREE.TorusGeometry(1.85, 0.24, 8, 12);
    pCollar.rotateX(Math.PI / 2);
    const op1 = makeTransformed(pShaft, 0, 0, 0);
    const op2 = makeTransformed(pCollar, 0, 6, 0);
    const op3 = makeTransformed(pCollar, 0, -4, 0);
    this.obstaclePillarGeo = mergeParts([op1, op2, op3]);
    pShaft.dispose();
    pCollar.dispose();
    op1.dispose();
    op2.dispose();
    op3.dispose();

    this.obstacleHexCapGeo = new THREE.ConeGeometry(1.85, 3.2, 8);
    this.obstacleArchBeamGeo = new THREE.BoxGeometry(22, 2.6, 2.6);

    // Organic displaced asteroid hazard
    const astBase = new THREE.IcosahedronGeometry(2.3, 2);
    const astPos = astBase.attributes.position;
    for (let i = 0; i < astPos.count; i++) {
      const vx = astPos.getX(i);
      const vy = astPos.getY(i);
      const vz = astPos.getZ(i);
      const n = 0.84 + 0.26 * Math.sin(vx * 2.1 + vy * 1.7) * Math.cos(vz * 2.3);
      astPos.setXYZ(i, vx * n, vy * n, vz * n);
    }
    astBase.computeVertexNormals();
    this.obstacleAsteroidGeo = astBase;

    this.obstacleCrossBarGeo = new THREE.BoxGeometry(18, 1.3, 1.3);
    this.obstacleSawRingGeo = new THREE.TorusGeometry(5.5, 0.42, 10, 32);
    this.obstacleSawToothGeo = new THREE.ConeGeometry(0.65, 1.8, 6);
    this.obstacleLaserBeamGeo = new THREE.CylinderGeometry(0.42, 0.42, 22, 12);
    this.obstacleLaserBeamGeo.rotateZ(Math.PI / 2);

    // Projectiles & FX
    this.laserGeo = new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8);
    this.laserGeo.rotateX(Math.PI / 2);
    this.beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 6.2, 10);
    this.beamGeo.rotateX(Math.PI / 2);
    this.missileGeo = new THREE.ConeGeometry(0.22, 1.35, 10);
    this.missileGeo.rotateX(Math.PI / 2);
    this.enemyShotGeo = new THREE.OctahedronGeometry(0.5, 1);
    this.debrisGeo = new THREE.TetrahedronGeometry(0.55, 0);
    this.shockwaveGeo = new THREE.TorusGeometry(1.0, 0.09, 10, 32);
    this.exhaustParticleGeo = new THREE.OctahedronGeometry(0.22, 0);

    this.allGeos = [
      this.playerFuselageGeo,
      this.playerWingGeo,
      this.playerTailFinGeo,
      this.playerNacelleGeo,
      this.playerCanopyGeo,
      this.playerCanopyFrameGeo,
      this.playerCockpitSeatGeo,
      this.playerThrusterGeo,
      this.playerCannonGeo,
      this.playerIntakeGeo,
      this.playerPylonGeo,
      this.playerShieldGeo,
      this.tridentNoseGeo,
      this.tridentWingGeo,
      this.titanPodGeo,
      this.titanBridgeGeo,
      this.phantomBodyGeo,
      this.phantomForwardWingGeo,
      this.seraphHaloGeo,
      this.sovereignWingGeo,
      this.raptorWingGeo,
      this.talonBoomGeo,
      this.mantisClawGeo,
      this.hammerCanardGeo,
      this.eclipseWingGeo,
      this.chronoDiscGeo,
      this.wyvernStrutGeo,
      this.vaultPodGeo,
      this.vaultCageGeo,
      this.vaultLockGeo,
      this.dartBodyGeo,
      this.dartWingGeo,
      this.dartRingGeo,
      this.gyroCoreGeo,
      this.gyroRingOuterGeo,
      this.gyroRingInnerGeo,
      this.gyroSpikeGeo,
      this.monolithBodyGeo,
      this.monolithCapGeo,
      this.monolithOrbGeo,
      this.cruiserKnotGeo,
      this.cruiserWingGeo,
      this.cruiserPodGeo,
      this.prismCoreGeo,
      this.prismBladeGeo,
      this.bossHullGeo,
      this.bossRing1Geo,
      this.bossRing2Geo,
      this.bossCoreGeo,
      this.bossTurretGeo,
      this.bossSpireGeo,
      this.gateOuterGeo,
      this.gateInnerGeo,
      this.gateChevronGeo,
      this.gatePylonGeo,
      this.shardGeo,
      this.shardHaloGeo,
      this.overdriveCoreGeo,
      this.overdriveCageGeo,
      this.repairBoxGeo,
      this.magnetCoreGeo,
      this.chronosCoreGeo,
      this.coinDiscGeo,
      this.coinRimGeo,
      this.obstaclePillarGeo,
      this.obstacleHexCapGeo,
      this.obstacleArchBeamGeo,
      this.obstacleAsteroidGeo,
      this.obstacleCrossBarGeo,
      this.obstacleSawRingGeo,
      this.obstacleSawToothGeo,
      this.obstacleLaserBeamGeo,
      this.laserGeo,
      this.beamGeo,
      this.missileGeo,
      this.enemyShotGeo,
      this.debrisGeo,
      this.shockwaveGeo,
      this.exhaustParticleGeo,
    ];
  }

  private addCockpitAssembly(modelRoot: THREE.Group, pal: MaterialPalette, x: number, y: number, z: number, scale = 1): void {
    const cockpit = new THREE.Group();
    cockpit.position.set(x, y, z);
    cockpit.scale.setScalar(scale);

    const seat = new THREE.Mesh(this.playerCockpitSeatGeo, pal.hullDark);
    seat.position.set(0, -0.08, -0.05);
    cockpit.add(seat);

    const canopy = new THREE.Mesh(this.playerCanopyGeo, pal.canopyGlass);
    cockpit.add(canopy);

    const frame = new THREE.Mesh(this.playerCanopyFrameGeo, pal.hullDark);
    cockpit.add(frame);

    modelRoot.add(cockpit);
  }

  public createLockedVaultShip(pal: MaterialPalette): PlayerRig {
    const group = new THREE.Group();
    const modelRoot = new THREE.Group();
    group.add(modelRoot);

    const shieldDome = new THREE.Mesh(this.playerShieldGeo, pal.shieldMat);
    shieldDome.visible = false;
    group.add(shieldDome);

    const pod = new THREE.Mesh(this.vaultPodGeo, pal.vaultShell);
    pod.castShadow = true;
    pod.receiveShadow = true;
    modelRoot.add(pod);

    const core = new THREE.Mesh(this.vaultLockGeo, pal.vaultHolo);
    core.position.set(0, 1.38, 0);
    modelRoot.add(core);

    const cage1 = new THREE.Mesh(this.vaultCageGeo, pal.vaultHolo);
    cage1.rotation.x = Math.PI / 3;
    modelRoot.add(cage1);

    const cage2 = new THREE.Mesh(this.vaultCageGeo, pal.vaultHolo);
    cage2.rotation.y = Math.PI / 3;
    cage2.scale.setScalar(0.84);
    modelRoot.add(cage2);

    // Dummy hidden thruster/cannon anchors so update loops remain uniform
    const thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
    const thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
    thrusterLeft.visible = false;
    thrusterRight.visible = false;
    const cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
    const cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
    cannonLeft.visible = false;
    cannonRight.visible = false;

    return {
      group,
      modelRoot,
      thrusterLeft,
      thrusterRight,
      shieldDome,
      cannonLeft,
      cannonRight,
      haloRing: cage1,
      isLockedVault: true,
    };
  }

  public createPlayerShip(
    shapeId: ShipShapeId,
    basePal: MaterialPalette,
    variant: 'p1' | 'rival' = 'p1'
  ): PlayerRig {
    const pal: MaterialPalette =
      variant === 'rival'
        ? {
            ...basePal,
            hullPrimary: basePal.rivalHullPrimary,
            hullTrim: basePal.rivalHullTrim,
            thrusterFlame: basePal.rivalThrusterFlame,
            shieldMat: basePal.rivalShieldMat,
          }
        : basePal;

    const group = new THREE.Group();
    const modelRoot = new THREE.Group();
    modelRoot.rotation.y = Math.PI;
    group.add(modelRoot);

    const shieldDome = new THREE.Mesh(this.playerShieldGeo, pal.shieldMat);
    shieldDome.visible = false;
    group.add(shieldDome);

    let thrusterLeft: THREE.Mesh;
    let thrusterRight: THREE.Mesh;
    let cannonLeft: THREE.Mesh;
    let cannonRight: THREE.Mesh;
    let haloRing: THREE.Mesh | undefined;

    if (shapeId === 'trident') {
      const nose = new THREE.Mesh(this.tridentNoseGeo, pal.hullPrimary);
      nose.castShadow = true;
      modelRoot.add(nose);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.35, 0.95);

      const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
      angles.forEach((ang, idx) => {
        const wingHolder = new THREE.Group();
        wingHolder.rotation.z = ang + Math.PI / 2;
        const wing = new THREE.Mesh(this.tridentWingGeo, idx === 0 ? pal.hullTrim : pal.hullPrimary);
        wing.castShadow = true;
        wingHolder.add(wing);
        modelRoot.add(wingHolder);
      });

      const ring = new THREE.Mesh(this.dartRingGeo, pal.hullTrim);
      ring.scale.setScalar(1.28);
      ring.position.z = -1.25;
      modelRoot.add(ring);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.55, -0.15, -0.8);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.55, -0.15, -0.8);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.55, -0.15, -2.05);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.55, -0.15, -2.05);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.4, -0.3, 0.45);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.4, -0.3, 0.45);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'titan') {
      const bridge = new THREE.Mesh(this.titanBridgeGeo, pal.hullDark);
      bridge.position.set(0, 0.05, -0.2);
      bridge.castShadow = true;
      modelRoot.add(bridge);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.42, 0.35, 1.08);

      const podR = new THREE.Mesh(this.titanPodGeo, pal.hullPrimary);
      podR.position.set(1.25, 0, 0);
      podR.castShadow = true;
      modelRoot.add(podR);
      const podL = new THREE.Mesh(this.titanPodGeo, pal.hullPrimary);
      podL.position.set(-1.25, 0, 0);
      podL.castShadow = true;
      modelRoot.add(podL);

      const wingR = new THREE.Mesh(this.playerWingGeo, pal.hullTrim);
      wingR.position.set(0.85, -0.05, -0.15);
      wingR.scale.setScalar(0.85);
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.playerWingGeo, pal.hullTrim);
      wingL.scale.set(-0.85, 0.85, 0.85);
      wingL.position.set(-0.85, -0.05, -0.15);
      modelRoot.add(wingL);

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finR.position.set(1.25, 0.25, -1.4);
      modelRoot.add(finR);
      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finL.position.set(-1.25, 0.25, -1.4);
      modelRoot.add(finL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(1.25, 0, -1.0);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-1.25, 0, -1.0);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.scale.set(1.3, 1.3, 1);
      thrusterRight.position.set(1.25, 0, -2.2);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.scale.set(1.3, 1.3, 1);
      thrusterLeft.position.set(-1.25, 0, -2.2);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.55, -0.1, 1.0);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.55, -0.1, 1.0);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'phantom') {
      const body = new THREE.Mesh(this.phantomBodyGeo, pal.hullPrimary);
      body.castShadow = true;
      modelRoot.add(body);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.55, 0.96);

      const wingR = new THREE.Mesh(this.phantomForwardWingGeo, pal.hullTrim);
      wingR.castShadow = true;
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.phantomForwardWingGeo, pal.hullTrim);
      wingL.scale.x = -1;
      wingL.castShadow = true;
      modelRoot.add(wingL);

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullDark);
      finR.position.set(0.4, 0.15, -1.65);
      finR.rotation.z = -0.35;
      modelRoot.add(finR);
      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullDark);
      finL.position.set(-0.4, 0.15, -1.65);
      finL.rotation.z = 0.35;
      modelRoot.add(finL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.45, -0.05, -1.1);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.45, -0.05, -1.1);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.45, -0.05, -2.35);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.45, -0.05, -2.35);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(2.0, -0.1, 0.9);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-2.0, -0.1, 0.9);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'seraph') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.36, 0.45, 1.0);

      haloRing = new THREE.Mesh(this.seraphHaloGeo, pal.hullTrim);
      haloRing.position.set(0, 0, -0.45);
      modelRoot.add(haloRing);

      const wingR = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingR.scale.setScalar(0.75);
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingL.scale.set(-0.75, 0.75, 0.75);
      modelRoot.add(wingL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.62, -0.05, -0.85);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.62, -0.05, -0.85);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.62, -0.05, -2.1);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.62, -0.05, -2.1);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.5, 0, 0.3);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.5, 0, 0.3);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'sovereign') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.scale.set(1.25, 1.15, 1.15);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      const spine = new THREE.Mesh(this.playerIntakeGeo, pal.engineGold);
      spine.position.set(0, 0.32, -0.1);
      modelRoot.add(spine);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.42, 0.55, 1.04);

      const wingR = new THREE.Mesh(this.sovereignWingGeo, pal.hullPrimary);
      wingR.castShadow = true;
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.sovereignWingGeo, pal.hullPrimary);
      wingL.scale.x = -1;
      wingL.castShadow = true;
      modelRoot.add(wingL);

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finR.position.set(0.85, 0.16, -1.65);
      finR.rotation.z = -0.25;
      modelRoot.add(finR);
      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finL.position.set(-0.85, 0.16, -1.65);
      finL.rotation.z = 0.25;
      modelRoot.add(finL);

      [0.65, 1.25, -0.65, -1.25].forEach((nx) => {
        const nac = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
        nac.position.set(nx, -0.05, -0.95);
        modelRoot.add(nac);
      });

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.scale.set(1.25, 1.25, 1);
      thrusterRight.position.set(0.95, -0.05, -2.2);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.scale.set(1.25, 1.25, 1);
      thrusterLeft.position.set(-0.95, -0.05, -2.2);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullTrim);
      cannonRight.position.set(2.1, -0.1, 0.35);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullTrim);
      cannonLeft.position.set(-2.1, -0.1, 0.35);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'raptor') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.scale.set(1.12, 0.9, 1.08);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.55, 1.0);

      const wingR = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      wingR.castShadow = true;
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      wingL.scale.x = -1;
      wingL.castShadow = true;
      modelRoot.add(wingL);

      const hStabR = new THREE.Mesh(this.tridentWingGeo, pal.hullTrim);
      hStabR.scale.set(0.45, 1, 0.45);
      hStabR.position.set(0.35, -0.02, -1.25);
      modelRoot.add(hStabR);
      const hStabL = new THREE.Mesh(this.tridentWingGeo, pal.hullTrim);
      hStabL.scale.set(-0.45, 1, 0.45);
      hStabL.position.set(-0.35, -0.02, -1.25);
      modelRoot.add(hStabL);

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullDark);
      finR.position.set(0.65, 0.14, -1.5);
      finR.rotation.z = -0.48;
      modelRoot.add(finR);
      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullDark);
      finL.position.set(-0.65, 0.14, -1.5);
      finL.rotation.z = 0.48;
      modelRoot.add(finL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.42, -0.04, -0.95);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.42, -0.04, -0.95);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.42, -0.04, -2.15);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.42, -0.04, -2.15);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(0.85, -0.1, 0.65);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-0.85, -0.1, 0.65);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'talon') {
      const pod = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      pod.scale.set(0.82, 1.0, 0.72);
      pod.position.set(0, 0.08, -0.2);
      pod.castShadow = true;
      modelRoot.add(pod);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.38, 0.15, 0.94);

      const boomR = new THREE.Mesh(this.talonBoomGeo, pal.hullPrimary);
      boomR.position.set(1.12, 0, 0.15);
      boomR.castShadow = true;
      modelRoot.add(boomR);
      const boomL = new THREE.Mesh(this.talonBoomGeo, pal.hullPrimary);
      boomL.position.set(-1.12, 0, 0.15);
      boomL.castShadow = true;
      modelRoot.add(boomL);

      const bridge = new THREE.Mesh(this.hammerCanardGeo, pal.hullTrim);
      bridge.scale.set(0.6, 0.85, 0.75);
      bridge.position.set(0, 0, -1.45);
      modelRoot.add(bridge);

      const wingR = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      wingR.position.set(0.45, -0.04, -0.2);
      wingR.scale.set(0.85, 1, 0.9);
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      wingL.position.set(-0.45, -0.04, -0.2);
      wingL.scale.set(-0.85, 1, 0.9);
      modelRoot.add(wingL);

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finR.position.set(1.12, 0.14, -1.65);
      modelRoot.add(finR);
      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finL.position.set(-1.12, 0.14, -1.65);
      modelRoot.add(finL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(1.12, 0, -1.15);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-1.12, 0, -1.15);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(1.12, 0, -2.3);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-1.12, 0, -2.3);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.12, -0.04, 1.8);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.12, -0.04, 1.8);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'corsair') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.36, 0.2, 1.0);

      const noseRing = new THREE.Mesh(this.dartRingGeo, pal.engineGold);
      noseRing.position.set(0, 0, 1.55);
      noseRing.scale.setScalar(0.8);
      modelRoot.add(noseRing);

      const innerR = new THREE.Mesh(this.playerWingGeo, pal.hullTrim);
      innerR.scale.set(0.48, 1, 0.85);
      innerR.rotation.z = -0.38;
      innerR.position.set(0.15, 0.02, 0.05);
      modelRoot.add(innerR);
      const innerL = new THREE.Mesh(this.playerWingGeo, pal.hullTrim);
      innerL.scale.set(-0.48, 1, 0.85);
      innerL.rotation.z = 0.38;
      innerL.position.set(-0.15, 0.02, 0.05);
      modelRoot.add(innerL);

      const outerR = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      outerR.scale.set(0.75, 1, 0.8);
      outerR.rotation.z = 0.24;
      outerR.position.set(0.85, -0.35, -0.05);
      modelRoot.add(outerR);
      const outerL = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      outerL.scale.set(-0.75, 1, 0.8);
      outerL.rotation.z = -0.24;
      outerL.position.set(-0.85, -0.35, -0.05);
      modelRoot.add(outerL);

      const fin = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      fin.position.set(0, 0.15, -1.45);
      modelRoot.add(fin);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.5, -0.08, -0.95);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.5, -0.08, -0.95);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.5, -0.08, -2.1);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.5, -0.08, -2.1);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.65, -0.15, 0.35);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.65, -0.15, 0.35);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'wyvern') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.35, 0.98);

      const lowR = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      lowR.position.set(0, -0.28, 0.1);
      modelRoot.add(lowR);
      const lowL = new THREE.Mesh(this.raptorWingGeo, pal.hullPrimary);
      lowL.scale.x = -1;
      lowL.position.set(0, -0.28, 0.1);
      modelRoot.add(lowL);

      const upR = new THREE.Mesh(this.raptorWingGeo, pal.hullTrim);
      upR.position.set(0, 0.5, 0.25);
      upR.scale.set(0.92, 1, 0.92);
      modelRoot.add(upR);
      const upL = new THREE.Mesh(this.raptorWingGeo, pal.hullTrim);
      upL.scale.set(-0.92, 1, 0.92);
      upL.position.set(0, 0.5, 0.25);
      modelRoot.add(upL);

      [-1.55, -0.85, 0.85, 1.55].forEach((sx) => {
        const strut = new THREE.Mesh(this.wyvernStrutGeo, pal.hullDark);
        strut.position.set(sx, 0.1, 0.05);
        modelRoot.add(strut);
      });

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finR.position.set(0.55, 0.12, -1.45);
      modelRoot.add(finR);
      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finL.position.set(-0.55, 0.12, -1.45);
      modelRoot.add(finL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.62, -0.05, -0.85);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.62, -0.05, -0.85);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.62, -0.05, -2.08);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.62, -0.05, -2.08);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.55, 0.45, 0.45);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.55, 0.45, 0.45);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'mantis') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.scale.set(0.95, 0.9, 0.85);
      fuselage.position.z = -0.35;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, -0.05, 0.96);

      const clawR = new THREE.Mesh(this.mantisClawGeo, pal.hullTrim);
      clawR.castShadow = true;
      modelRoot.add(clawR);
      const clawL = new THREE.Mesh(this.mantisClawGeo, pal.hullTrim);
      clawL.scale.x = -1;
      clawL.castShadow = true;
      modelRoot.add(clawL);

      const wingR = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingR.position.set(0.15, -0.04, -0.45);
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingL.scale.x = -1;
      wingL.position.set(-0.15, -0.04, -0.45);
      modelRoot.add(wingL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.58, -0.05, -1.0);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.58, -0.05, -1.0);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.58, -0.05, -2.2);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.58, -0.05, -2.2);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(0.92, 0.02, 1.55);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-0.92, 0.02, 1.55);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'hammerhead') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.scale.set(1.3, 1.25, 1.12);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.44, 0.45, 1.05);

      const hammer = new THREE.Mesh(this.hammerCanardGeo, pal.hullTrim);
      hammer.position.set(0, 0.02, 1.45);
      hammer.castShadow = true;
      modelRoot.add(hammer);

      const podR = new THREE.Mesh(this.titanPodGeo, pal.hullDark);
      podR.scale.set(0.75, 0.8, 0.85);
      podR.position.set(1.95, 0, 1.2);
      modelRoot.add(podR);
      const podL = new THREE.Mesh(this.titanPodGeo, pal.hullDark);
      podL.scale.set(0.75, 0.8, 0.85);
      podL.position.set(-1.95, 0, 1.2);
      modelRoot.add(podL);

      const wingR = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingR.position.set(0.2, -0.05, -0.55);
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingL.scale.x = -1;
      wingL.position.set(-0.2, -0.05, -0.55);
      modelRoot.add(wingL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.8, -0.05, -1.05);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.8, -0.05, -1.05);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.scale.set(1.2, 1.2, 1);
      thrusterRight.position.set(0.8, -0.05, -2.25);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.scale.set(1.2, 1.2, 1);
      thrusterLeft.position.set(-0.8, -0.05, -2.25);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullTrim);
      cannonRight.position.set(1.95, -0.1, 1.8);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullTrim);
      cannonLeft.position.set(-1.95, -0.1, 1.8);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'eclipse') {
      const wing = new THREE.Mesh(this.eclipseWingGeo, pal.hullPrimary);
      wing.castShadow = true;
      wing.receiveShadow = true;
      modelRoot.add(wing);

      const spine = new THREE.Mesh(this.playerIntakeGeo, pal.hullDark);
      spine.position.set(0, 0.24, 0.1);
      modelRoot.add(spine);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.3, 0.42, 1.0);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.7, 0.04, -0.65);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.7, 0.04, -0.65);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.7, 0.04, -1.9);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.7, 0.04, -1.9);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullTrim);
      cannonRight.position.set(1.7, -0.05, 0.15);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullTrim);
      cannonLeft.position.set(-1.7, -0.05, 0.15);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'valhalla') {
      const fuselage = new THREE.Mesh(this.phantomBodyGeo, pal.hullPrimary);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.55, 0.98);

      [0.42, -0.42].forEach((tilt, idx) => {
        const wR = new THREE.Mesh(this.raptorWingGeo, idx === 0 ? pal.hullPrimary : pal.hullTrim);
        wR.rotation.z = tilt;
        wR.position.set(0, 0, -0.25);
        modelRoot.add(wR);
        const wL = new THREE.Mesh(this.raptorWingGeo, idx === 0 ? pal.hullPrimary : pal.hullTrim);
        wL.scale.x = -1;
        wL.rotation.z = -tilt;
        wL.position.set(0, 0, -0.25);
        modelRoot.add(wL);
      });

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.55, 0.12, -1.0);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.55, 0.12, -1.0);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.55, 0.12, -2.25);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.55, 0.12, -2.25);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(2.05, 0.85, 0.2);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-2.05, 0.85, 0.2);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'chronowing') {
      const fuselage = new THREE.Mesh(this.phantomBodyGeo, pal.hullPrimary);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.45, 0.98);

      const disc = new THREE.Mesh(this.chronoDiscGeo, pal.hullTrim);
      disc.position.set(0, 0, -0.15);
      disc.castShadow = true;
      modelRoot.add(disc);

      haloRing = new THREE.Mesh(this.seraphHaloGeo, pal.engineGold);
      haloRing.scale.setScalar(0.52);
      haloRing.position.set(0, 0, -1.2);
      modelRoot.add(haloRing);

      const crossWing = new THREE.Mesh(this.hammerCanardGeo, pal.hullPrimary);
      crossWing.position.set(0, -0.02, -0.15);
      crossWing.scale.set(0.9, 0.8, 0.9);
      modelRoot.add(crossWing);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.65, -0.05, -0.95);
      modelRoot.add(nacR);
      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.65, -0.05, -0.95);
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.65, -0.05, -2.2);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.65, -0.05, -2.2);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.85, 0, 0.3);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.85, 0, 0.3);
      modelRoot.add(cannonLeft);
    } else if (shapeId === 'hyperion') {
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.scale.set(1.32, 1.2, 1.25);
      fuselage.castShadow = true;
      modelRoot.add(fuselage);

      const railSpine = new THREE.Mesh(this.talonBoomGeo, pal.engineGold);
      railSpine.scale.set(0.85, 0.85, 1.05);
      railSpine.position.set(0, 0.35, 0.55);
      modelRoot.add(railSpine);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.52, 0.45, 1.04);

      const wingR = new THREE.Mesh(this.sovereignWingGeo, pal.hullPrimary);
      wingR.scale.set(1.1, 1, 1.05);
      wingR.castShadow = true;
      modelRoot.add(wingR);
      const wingL = new THREE.Mesh(this.sovereignWingGeo, pal.hullPrimary);
      wingL.scale.set(-1.1, 1, 1.05);
      wingL.castShadow = true;
      modelRoot.add(wingL);

      const fwdR = new THREE.Mesh(this.phantomForwardWingGeo, pal.hullTrim);
      fwdR.scale.set(0.68, 1, 0.72);
      fwdR.position.set(0, 0.25, 0.45);
      modelRoot.add(fwdR);
      const fwdL = new THREE.Mesh(this.phantomForwardWingGeo, pal.hullTrim);
      fwdL.scale.set(-0.68, 1, 0.72);
      fwdL.position.set(0, 0.25, 0.45);
      modelRoot.add(fwdL);

      haloRing = new THREE.Mesh(this.seraphHaloGeo, pal.hullTrim);
      haloRing.scale.setScalar(0.82);
      haloRing.position.set(0, 0, -0.75);
      modelRoot.add(haloRing);

      [-1.35, -0.72, 0.72, 1.35].forEach((nx) => {
        const nac = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
        nac.position.set(nx, -0.05, -1.1);
        modelRoot.add(nac);
      });

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.scale.set(1.3, 1.3, 1.1);
      thrusterRight.position.set(1.02, -0.05, -2.35);
      modelRoot.add(thrusterRight);
      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.scale.set(1.3, 1.3, 1.1);
      thrusterLeft.position.set(-1.02, -0.05, -2.35);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(2.35, -0.05, 0.55);
      modelRoot.add(cannonRight);
      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-2.35, -0.05, 0.55);
      modelRoot.add(cannonLeft);
    } else {
      // Valkyrie Mk.I Sculpted Delta Interceptor
      const fuselage = new THREE.Mesh(this.playerFuselageGeo, pal.hullPrimary);
      fuselage.castShadow = true;
      fuselage.receiveShadow = true;
      modelRoot.add(fuselage);

      const spine = new THREE.Mesh(this.playerIntakeGeo, pal.hullDark);
      spine.position.set(0, 0.28, -0.15);
      spine.castShadow = true;
      modelRoot.add(spine);

      this.addCockpitAssembly(modelRoot, pal, 0, 0.34, 0.45, 1.0);

      const wingR = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingR.position.set(0, -0.02, -0.1);
      wingR.castShadow = true;
      modelRoot.add(wingR);

      const wingL = new THREE.Mesh(this.playerWingGeo, pal.hullPrimary);
      wingL.scale.x = -1;
      wingL.position.set(0, -0.02, -0.1);
      wingL.castShadow = true;
      modelRoot.add(wingL);

      const pylonR = new THREE.Mesh(this.playerPylonGeo, pal.hullTrim);
      pylonR.position.set(1.38, -0.19, 0.65);
      modelRoot.add(pylonR);
      const pylonL = new THREE.Mesh(this.playerPylonGeo, pal.hullTrim);
      pylonL.position.set(-1.38, -0.19, 0.65);
      modelRoot.add(pylonL);

      const finR = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finR.position.set(0.52, 0.12, -1.45);
      finR.rotation.z = -0.32;
      modelRoot.add(finR);

      const finL = new THREE.Mesh(this.playerTailFinGeo, pal.hullTrim);
      finL.position.set(-0.52, 0.12, -1.45);
      finL.rotation.z = 0.32;
      modelRoot.add(finL);

      const nacR = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacR.position.set(0.68, -0.05, -0.78);
      nacR.castShadow = true;
      modelRoot.add(nacR);

      const nacL = new THREE.Mesh(this.playerNacelleGeo, pal.engineGold);
      nacL.position.set(-0.68, -0.05, -0.78);
      nacL.castShadow = true;
      modelRoot.add(nacL);

      thrusterRight = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterRight.position.set(0.68, -0.05, -2.05);
      modelRoot.add(thrusterRight);

      thrusterLeft = new THREE.Mesh(this.playerThrusterGeo, pal.thrusterFlame);
      thrusterLeft.position.set(-0.68, -0.05, -2.05);
      modelRoot.add(thrusterLeft);

      cannonRight = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonRight.position.set(1.25, -0.12, 0.45);
      modelRoot.add(cannonRight);

      cannonLeft = new THREE.Mesh(this.playerCannonGeo, pal.hullDark);
      cannonLeft.position.set(-1.25, -0.12, 0.45);
      modelRoot.add(cannonLeft);
    }

    return {
      group,
      modelRoot,
      thrusterLeft,
      thrusterRight,
      shieldDome,
      cannonLeft,
      cannonRight,
      haloRing,
    };
  }

  public createEnemy(kind: EnemyKind, pal: MaterialPalette): EnemyRig {
    const group = new THREE.Group();
    const spinParts: THREE.Object3D[] = [];
    const counterSpinParts: THREE.Object3D[] = [];
    let coreMesh: THREE.Mesh;
    let hitRadius = 2.0;

    if (kind === 'dart') {
      const body = new THREE.Mesh(this.dartBodyGeo, pal.enemyHull);
      body.castShadow = true;
      group.add(body);

      const wingR = new THREE.Mesh(this.dartWingGeo, pal.enemyArmor);
      group.add(wingR);
      const wingL = new THREE.Mesh(this.dartWingGeo, pal.enemyArmor);
      wingL.scale.x = -1;
      group.add(wingL);

      const dorsal = new THREE.Mesh(this.playerTailFinGeo, pal.enemyArmor);
      dorsal.scale.setScalar(0.65);
      dorsal.position.set(0, 0.3, -0.5);
      group.add(dorsal);

      const ring = new THREE.Mesh(this.dartRingGeo, pal.enemyArmor);
      ring.position.z = -0.6;
      group.add(ring);
      spinParts.push(ring);

      coreMesh = new THREE.Mesh(this.monolithOrbGeo, pal.enemyCore);
      coreMesh.position.set(0, 0.2, 0.75);
      group.add(coreMesh);
      hitRadius = 2.1;
    } else if (kind === 'prism') {
      coreMesh = new THREE.Mesh(this.prismCoreGeo, pal.enemyCore);
      group.add(coreMesh);

      const bladeGroup = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        const blade = new THREE.Mesh(this.prismBladeGeo, pal.enemyHull);
        blade.position.set(Math.cos(ang) * 1.35, Math.sin(ang) * 1.35, 0);
        blade.rotation.z = ang - Math.PI / 2;
        bladeGroup.add(blade);
      }
      group.add(bladeGroup);
      spinParts.push(bladeGroup);

      const ring = new THREE.Mesh(this.gyroRingInnerGeo, pal.enemyArmor);
      group.add(ring);
      counterSpinParts.push(ring);
      hitRadius = 2.3;
    } else if (kind === 'gyro') {
      coreMesh = new THREE.Mesh(this.gyroCoreGeo, pal.enemyCore);
      group.add(coreMesh);

      const outerRing = new THREE.Mesh(this.gyroRingOuterGeo, pal.enemyHull);
      outerRing.castShadow = true;
      group.add(outerRing);
      spinParts.push(outerRing);

      const innerRing = new THREE.Mesh(this.gyroRingInnerGeo, pal.enemyArmor);
      innerRing.rotation.x = Math.PI / 3;
      group.add(innerRing);
      counterSpinParts.push(innerRing);

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const spike = new THREE.Mesh(this.gyroSpikeGeo, pal.enemyArmor);
        spike.position.set(Math.cos(angle) * 2.05, Math.sin(angle) * 2.05, 0);
        spike.rotation.z = angle - Math.PI / 2;
        outerRing.add(spike);
      }
      hitRadius = 2.5;
    } else if (kind === 'monolith') {
      const body = new THREE.Mesh(this.monolithBodyGeo, pal.enemyHull);
      body.castShadow = true;
      group.add(body);

      const capTop = new THREE.Mesh(this.monolithCapGeo, pal.enemyArmor);
      capTop.position.y = 2.22;
      group.add(capTop);

      const capBot = new THREE.Mesh(this.monolithCapGeo, pal.enemyArmor);
      capBot.rotation.x = Math.PI;
      capBot.position.y = -2.22;
      group.add(capBot);

      coreMesh = new THREE.Mesh(this.monolithOrbGeo, pal.enemyCore);
      coreMesh.scale.setScalar(1.45);
      coreMesh.position.z = 1.05;
      group.add(coreMesh);

      const orbitGroup = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        const orb = new THREE.Mesh(this.monolithOrbGeo, pal.enemyArmor);
        orb.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
        orbitGroup.add(orb);
      }
      group.add(orbitGroup);
      spinParts.push(orbitGroup);
      hitRadius = 2.6;
    } else if (kind === 'cruiser') {
      coreMesh = new THREE.Mesh(this.cruiserKnotGeo, pal.enemyCore);
      group.add(coreMesh);
      spinParts.push(coreMesh);

      const wingR = new THREE.Mesh(this.cruiserWingGeo, pal.enemyHull);
      wingR.castShadow = true;
      group.add(wingR);
      const wingL = new THREE.Mesh(this.cruiserWingGeo, pal.enemyHull);
      wingL.scale.x = -1;
      wingL.castShadow = true;
      group.add(wingL);

      const podR = new THREE.Mesh(this.cruiserPodGeo, pal.enemyArmor);
      podR.position.set(2.35, 0, -0.3);
      group.add(podR);
      const podL = new THREE.Mesh(this.cruiserPodGeo, pal.enemyArmor);
      podL.position.set(-2.35, 0, -0.3);
      group.add(podL);

      const halo = new THREE.Mesh(this.gyroRingOuterGeo, pal.enemyArmor);
      halo.scale.setScalar(1.1);
      group.add(halo);
      counterSpinParts.push(halo);
      hitRadius = 3.4;
    } else {
      const hull = new THREE.Mesh(this.bossHullGeo, pal.bossHull);
      hull.castShadow = true;
      group.add(hull);

      const bridge = new THREE.Mesh(this.titanBridgeGeo, pal.enemyHull);
      bridge.scale.set(2.2, 2.2, 2.2);
      bridge.position.set(0, 1.3, -0.4);
      group.add(bridge);

      coreMesh = new THREE.Mesh(this.bossCoreGeo, pal.enemyCore);
      coreMesh.position.set(0, 0.3, 1.9);
      group.add(coreMesh);
      spinParts.push(coreMesh);

      const ring1 = new THREE.Mesh(this.bossRing1Geo, pal.bossRing);
      ring1.rotation.x = 0.45;
      group.add(ring1);
      spinParts.push(ring1);

      const ring2 = new THREE.Mesh(this.bossRing2Geo, pal.enemyArmor);
      ring2.rotation.y = 0.7;
      group.add(ring2);
      counterSpinParts.push(ring2);

      const turretOffsets = [
        [-4.2, 0.6, 1.4],
        [4.2, 0.6, 1.4],
        [-2.8, -0.6, 2.2],
        [2.8, -0.6, 2.2],
      ];
      turretOffsets.forEach(([tx, ty, tz]) => {
        const t = new THREE.Mesh(this.bossTurretGeo, pal.enemyArmor);
        t.position.set(tx, ty, tz);
        group.add(t);
      });

      const spireTop = new THREE.Mesh(this.bossSpireGeo, pal.enemyHull);
      spireTop.position.set(0, 2.2, -0.6);
      group.add(spireTop);

      const spireBot = new THREE.Mesh(this.bossSpireGeo, pal.enemyHull);
      spireBot.rotation.x = Math.PI;
      spireBot.position.set(0, -2.2, -0.6);
      group.add(spireBot);

      hitRadius = 6.2;
    }

    return { group, spinParts, counterSpinParts, coreMesh, hitRadius };
  }

  public createBoostGate(pal: MaterialPalette): GateRig {
    const group = new THREE.Group();

    const outer = new THREE.Mesh(this.gateOuterGeo, pal.boostRingOuter);
    group.add(outer);

    const innerRing = new THREE.Mesh(this.gateInnerGeo, pal.boostRingGlow);
    group.add(innerRing);

    const chevrons = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const chev = new THREE.Mesh(this.gateChevronGeo, pal.boostRingGlow);
      chev.position.set(Math.cos(a) * 4.4, Math.sin(a) * 4.4, 0.1);
      chev.rotation.z = a + Math.PI / 2;
      chevrons.add(chev);
    }
    group.add(chevrons);

    const pylonL = new THREE.Mesh(this.gatePylonGeo, pal.boostRingOuter);
    pylonL.position.set(-5.8, 0, 0);
    group.add(pylonL);

    const pylonR = new THREE.Mesh(this.gatePylonGeo, pal.boostRingOuter);
    pylonR.position.set(5.8, 0, 0);
    group.add(pylonR);

    return { group, innerRing, chevrons, radius: 5.2 };
  }

  public createCollectible(kind: CollectibleKind, pal: MaterialPalette): CollectibleRig {
    const group = new THREE.Group();
    let inner: THREE.Mesh;
    let halo: THREE.Mesh;

    if (kind === 'shard') {
      inner = new THREE.Mesh(this.shardGeo, pal.crystalShard);
      halo = new THREE.Mesh(this.shardHaloGeo, pal.shardHalo);
      halo.rotation.x = Math.PI / 3;
      group.add(inner, halo);
    } else if (kind === 'overdrive') {
      inner = new THREE.Mesh(this.overdriveCoreGeo, pal.overdriveCore);
      halo = new THREE.Mesh(this.overdriveCageGeo, pal.overdriveCore);
      group.add(inner, halo);
    } else if (kind === 'magnet') {
      inner = new THREE.Mesh(this.magnetCoreGeo, pal.magnetCore);
      halo = new THREE.Mesh(this.shardHaloGeo, pal.shardHalo);
      halo.rotation.x = Math.PI / 2;
      group.add(inner, halo);
    } else if (kind === 'chronos') {
      inner = new THREE.Mesh(this.chronosCoreGeo, pal.chronosCore);
      halo = new THREE.Mesh(this.shardHaloGeo, pal.chronosCore);
      halo.rotation.y = Math.PI / 3;
      group.add(inner, halo);
    } else if (kind === 'coin_copper' || kind === 'coin_silver' || kind === 'coin_gold') {
      const mat =
        kind === 'coin_gold'
          ? pal.coinGold
          : kind === 'coin_silver'
            ? pal.coinSilver
            : pal.coinCopper;
      inner = new THREE.Mesh(this.coinDiscGeo, mat);
      halo = new THREE.Mesh(this.coinRimGeo, mat);
      group.add(inner, halo);
    } else {
      inner = new THREE.Mesh(this.repairBoxGeo, pal.repairCore);
      const vBar = new THREE.Mesh(this.repairBoxGeo, pal.repairCore);
      vBar.rotation.z = Math.PI / 2;
      inner.add(vBar);
      halo = new THREE.Mesh(this.shardHaloGeo, pal.repairCore);
      halo.rotation.y = Math.PI / 4;
      group.add(inner, halo);
    }

    return { group, inner, halo };
  }

  public createObstacle(variant: number, pal: MaterialPalette): ObstacleRig {
    const group = new THREE.Group();
    const colliders: ObstacleRig['colliders'] = [];

    if (variant === 0) {
      const pL = new THREE.Mesh(this.obstaclePillarGeo, pal.obstacleStone);
      pL.position.set(-10, -2, 0);
      pL.castShadow = true;
      const capL = new THREE.Mesh(this.obstacleHexCapGeo, pal.obstacleTrim);
      capL.position.set(-10, 16.5, 0);

      const pR = new THREE.Mesh(this.obstaclePillarGeo, pal.obstacleStone);
      pR.position.set(10, -2, 0);
      pR.castShadow = true;
      const capR = new THREE.Mesh(this.obstacleHexCapGeo, pal.obstacleTrim);
      capR.position.set(10, 16.5, 0);

      const beam = new THREE.Mesh(this.obstacleArchBeamGeo, pal.obstacleStone);
      beam.position.set(0, 13.5, 0);
      const beamTrim = new THREE.Mesh(this.obstacleCrossBarGeo, pal.obstacleTrim);
      beamTrim.position.set(0, 12.1, 0);

      group.add(pL, capL, pR, capR, beam, beamTrim);
      colliders.push(
        { offsetX: -10, offsetY: 0, halfW: 1.9, halfH: 18 },
        { offsetX: 10, offsetY: 0, halfW: 1.9, halfH: 18 },
        { offsetX: 0, offsetY: 13.5, halfW: 11, halfH: 1.7 }
      );
      return { group, colliders };
    } else if (variant === 1) {
      const p = new THREE.Mesh(this.obstaclePillarGeo, pal.obstacleStone);
      p.castShadow = true;
      const cap = new THREE.Mesh(this.obstacleHexCapGeo, pal.obstacleTrim);
      cap.position.y = 18.5;
      const ring = new THREE.Mesh(this.gateOuterGeo, pal.obstacleTrim);
      ring.rotation.x = Math.PI / 2;
      ring.scale.setScalar(0.5);
      ring.position.y = 3.5;
      group.add(p, cap, ring);
      colliders.push({ offsetX: 0, offsetY: 0, halfW: 2.0, halfH: 18 });
      return { group, colliders };
    } else if (variant === 2) {
      const core = new THREE.Mesh(this.obstacleAsteroidGeo, pal.obstacleStone);
      core.scale.setScalar(1.35);
      core.castShadow = true;
      const ring = new THREE.Mesh(this.gyroRingOuterGeo, pal.obstacleTrim);
      ring.scale.setScalar(2.1);
      ring.rotation.x = 0.6;
      const shard1 = new THREE.Mesh(this.shardGeo, pal.obstacleTrim);
      shard1.position.set(2.4, 1.4, 0);
      const shard2 = new THREE.Mesh(this.shardGeo, pal.obstacleTrim);
      shard2.position.set(-2.4, -1.2, 0.5);
      group.add(core, ring, shard1, shard2);
      colliders.push({ offsetX: 0, offsetY: 0, halfW: 3.1, halfH: 3.1 });
      return { group, spinPart: group, colliders };
    } else if (variant === 3) {
      const cross = new THREE.Group();
      const barH = new THREE.Mesh(this.obstacleCrossBarGeo, pal.obstacleStone);
      const barTrim = new THREE.Mesh(this.obstacleCrossBarGeo, pal.obstacleTrim);
      barTrim.scale.set(0.95, 0.35, 1.15);
      const hub = new THREE.Mesh(this.overdriveCoreGeo, pal.obstacleTrim);
      hub.scale.setScalar(1.9);
      cross.add(barH, barTrim, hub);
      group.add(cross);
      colliders.push({ offsetX: 0, offsetY: 0, halfW: 8.5, halfH: 1.0 });
      return { group, spinPart: cross, colliders };
    } else if (variant === 4) {
      const saw = new THREE.Group();
      const ring = new THREE.Mesh(this.obstacleSawRingGeo, pal.obstacleStone);
      saw.add(ring);
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        const tooth = new THREE.Mesh(this.obstacleSawToothGeo, pal.obstacleTrim);
        tooth.position.set(Math.cos(ang) * 4.7, Math.sin(ang) * 4.7, 0);
        tooth.rotation.z = ang + Math.PI / 2;
        saw.add(tooth);
      }
      group.add(saw);
      colliders.push(
        { offsetX: -5.2, offsetY: 0, halfW: 1.4, halfH: 5.5 },
        { offsetX: 5.2, offsetY: 0, halfW: 1.4, halfH: 5.5 },
        { offsetX: 0, offsetY: 5.2, halfW: 5.5, halfH: 1.4 },
        { offsetX: 0, offsetY: -5.2, halfW: 5.5, halfH: 1.4 }
      );
      return { group, spinPart: saw, colliders };
    } else {
      const pL = new THREE.Mesh(this.obstaclePillarGeo, pal.obstacleStone);
      pL.position.set(-11, 0, 0);
      const pR = new THREE.Mesh(this.obstaclePillarGeo, pal.obstacleStone);
      pR.position.set(11, 0, 0);
      const beam = new THREE.Mesh(this.obstacleLaserBeamGeo, pal.obstacleTrim);
      group.add(pL, pR, beam);
      colliders.push(
        { offsetX: -11, offsetY: 0, halfW: 1.8, halfH: 18 },
        { offsetX: 11, offsetY: 0, halfW: 1.8, halfH: 18 },
        { offsetX: 0, offsetY: 0, halfW: 11, halfH: 1.0 }
      );
      return { group, colliders };
    }
  }

  public dispose(): void {
    this.allGeos.forEach((g) => g.dispose());
  }
}
