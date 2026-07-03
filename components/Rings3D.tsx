"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  MutableRefObject,
} from "react";
import * as THREE from "three";

interface SpinState {
  vx: number;
  vy: number;
  dragging: boolean;
  idle: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* ── Marquise outline ─────────────────────────────────────────────────────
   Lens shape from two circular arcs meeting at sharp tips, 2:1 ratio.
   Shared by the stone geometry and the prong placement. */
const LENS_B = 0.5;
const LENS_R = (1 + LENS_B * LENS_B) / (2 * LENS_B);
const LENS_D = Math.sqrt(LENS_R * LENS_R - 1);
const LENS_TH = Math.asin(1 / LENS_R);

function sampleLens(t: number): [number, number] {
  if (t < 0.5) {
    const s = t / 0.5;
    const th = -LENS_TH + s * 2 * LENS_TH;
    return [LENS_R * Math.sin(th), LENS_R * Math.cos(th) - LENS_D];
  }
  const s = (t - 0.5) / 0.5;
  const th = LENS_TH - s * 2 * LENS_TH;
  return [LENS_R * Math.sin(th), -(LENS_R * Math.cos(th) - LENS_D)];
}

/* ── Jewelry-studio environment ───────────────────────────────────────────
   Alternating HDR softbox strips and darkness. Facets flash as they
   sweep the light/dark boundaries — the source of real sparkle. */
function JewelEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = new THREE.Scene();
    const strip = (intensity: number) => {
      const mat = new THREE.MeshBasicMaterial();
      mat.color.setScalar(intensity);
      return mat;
    };

    const R = 9;
    const COUNT = 12;
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2;
      const intensity = i % 2 === 0 ? (i % 4 === 0 ? 10 : 5.5) : 0.15;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 8), strip(intensity));
      m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      m.rotation.y = a + Math.PI;
      env.add(m);
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), strip(7));
    top.position.set(0, 8, 0);
    top.rotation.x = Math.PI / 2;
    env.add(top);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), strip(0.6));
    floor.position.set(0, -8, 0);
    floor.rotation.x = -Math.PI / 2;
    env.add(floor);

    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(env, 0.02).texture;
    scene.environment = envTex;

    return () => {
      scene.environment = null;
      envTex.dispose();
      pmrem.dispose();
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    };
  }, [gl, scene]);
  return null;
}

/* ── Marquise brilliant geometry ──────────────────────────────────────────
   Table → star/bezel crown tiers → girdle band → lower girdle facets →
   pavilion mains → keel ridge. Half-step offsets between tiers give the
   alternating kite/triangle facets of a brilliant cut. */
function useMarquiseGeometry() {
  return useMemo(() => {
    const N = 32;
    const ring = (scale: number, y: number, offset: number) =>
      Array.from({ length: N }, (_, i) => {
        const [x, z] = sampleLens(((i + offset) % N) / N);
        return new THREE.Vector3(x * scale, y, z * scale);
      });

    const gT = 0.035;
    const tableR = ring(0.52, 0.3, 0);
    const bezelR = ring(0.8, 0.19, 0.5);
    const girdleTopR = ring(1.0, gT, 0);
    const girdleBotR = ring(1.0, -gT, 0);
    const pavMidR = ring(0.55, -0.5, 0.5);
    const keelY = -0.82;
    const keelHalf = 0.42;
    const tableC = new THREE.Vector3(0, 0.3, 0);

    const tris: THREE.Vector3[] = [];
    const quadStrip = (a: THREE.Vector3[], b: THREE.Vector3[]) => {
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        tris.push(a[i], b[i], a[j]);
        tris.push(a[j], b[i], b[j]);
      }
    };

    for (let i = 0; i < N; i++) {
      tris.push(tableR[i], tableR[(i + 1) % N], tableC);
    }
    quadStrip(tableR, bezelR);
    quadStrip(bezelR, girdleTopR);
    quadStrip(girdleTopR, girdleBotR);
    quadStrip(girdleBotR, pavMidR);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const kA = new THREE.Vector3(
        THREE.MathUtils.clamp(pavMidR[i].x * 1.4, -keelHalf, keelHalf),
        keelY,
        0
      );
      const kB = new THREE.Vector3(
        THREE.MathUtils.clamp(pavMidR[j].x * 1.4, -keelHalf, keelHalf),
        keelY,
        0
      );
      tris.push(pavMidR[i], kA, pavMidR[j]);
      if (kA.distanceToSquared(kB) > 1e-6) tris.push(pavMidR[j], kA, kB);
    }

    const pos = new Float32Array(tris.length * 3);
    tris.forEach((v, i) => {
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
}

/* ── Shared jewelry materials ─────────────────────────────────────────── */
function useJewelryMats() {
  const mats = useMemo(() => {
    const polished = new THREE.MeshPhysicalMaterial({
      color: 0xeae9e7,
      metalness: 1,
      roughness: 0.06,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.4,
    });
    const satin = new THREE.MeshPhysicalMaterial({
      color: 0xe5e4e2,
      metalness: 1,
      roughness: 0.16,
      envMapIntensity: 1.2,
    });
    // Micro-pavé: tiny stones don't need transmission — hard facets +
    // hot env reflections read as diamond glitter at this size
    const pave = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.03,
      clearcoat: 1,
      clearcoatRoughness: 0,
      envMapIntensity: 3.2,
      specularIntensity: 1.2,
    });
    const paveGeo = new THREE.OctahedronGeometry(1, 0);
    return { polished, satin, pave, paveGeo };
  }, []);

  useEffect(
    () => () => {
      mats.polished.dispose();
      mats.satin.dispose();
      mats.pave.dispose();
      mats.paveGeo.dispose();
    },
    [mats]
  );
  return mats;
}

/* ── Micro-pavé rows on a torus band (single instanced draw call) ─────── */
function PaveBand({
  rows,
  perRow,
  bandR = 1.0,
  tubeR,
  stoneScale,
  geo,
  mat,
}: {
  rows: number[]; // tube angles (0 = outer equator)
  perRow: number;
  bandR?: number;
  tubeR: number;
  stoneScale: number;
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = rows.length * perRow;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const s = new THREE.Vector3(stoneScale, stoneScale * 1.2, stoneScale);
    let idx = 0;
    rows.forEach((phi, r) => {
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      for (let i = 0; i < perRow; i++) {
        const a = ((i + (r % 2) * 0.5) / perRow) * Math.PI * 2;
        // seated into the tube so roughly half the stone sits proud
        const radial = bandR + tubeR * 0.94 * cosP;
        const p = new THREE.Vector3(
          radial * Math.cos(a),
          radial * Math.sin(a),
          tubeR * 0.94 * sinP
        );
        const normal = new THREE.Vector3(
          cosP * Math.cos(a),
          cosP * Math.sin(a),
          sinP
        ).normalize();
        q.setFromUnitVectors(up, normal);
        m.compose(p, q, s);
        mesh.setMatrixAt(idx++, m);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [rows, perRow, bandR, tubeR, stoneScale]);

  return <instancedMesh ref={ref} args={[geo, mat, count]} />;
}

/* ── Six-claw prong head + basket, in stone-local coordinates ─────────── */
function ProngHead({ metal }: { metal: THREE.Material }) {
  const { tubes, tips } = useMemo(() => {
    // one claw at each tip, four on the shoulders
    const params = [0, 0.5, 0.15, 0.35, 0.65, 0.85];
    const tubes: THREE.TubeGeometry[] = [];
    const tips: THREE.Vector3[] = [];
    params.forEach((t) => {
      const [gx, gz] = sampleLens(t);
      const p0 = new THREE.Vector3(gx * 1.02, -0.55, gz * 1.02);
      const p1 = new THREE.Vector3(gx * 1.2, 0.0, gz * 1.2);
      const p2 = new THREE.Vector3(gx * 0.88, 0.38, gz * 0.88);
      tubes.push(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 12, 0.07, 8)
      );
      tips.push(p2);
    });
    return { tubes, tips };
  }, []);

  useEffect(
    () => () => tubes.forEach((g) => g.dispose()),
    [tubes]
  );

  return (
    <>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g} material={metal} />
      ))}
      {/* rounded claw tips curling over the crown */}
      {tips.map((p, i) => (
        <mesh key={`tip-${i}`} material={metal} position={p}>
          <sphereGeometry args={[0.075, 12, 12]} />
        </mesh>
      ))}
      {/* basket wires under the girdle */}
      <mesh material={metal} position={[0, -0.26, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.18, 0.6, 1]}>
        <torusGeometry args={[0.78, 0.05, 10, 48]} />
      </mesh>
      <mesh material={metal} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 0.48, 1]}>
        <torusGeometry args={[0.78, 0.045, 10, 48]} />
      </mesh>
    </>
  );
}

/* ── Camera-glint texture for scintillation sprites ───────────────────── */
function makeGlintTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  ctx.globalCompositeOperation = "lighter";

  const core = ctx.createRadialGradient(c, c, 0, c, c, 9);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  const ray = (angle: number, len: number) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(-len, 0, len, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-len, -1.2, len * 2, 2.4);
    ctx.restore();
  };
  ray(0, 30);
  ray(Math.PI / 2, 30);

  return new THREE.CanvasTexture(canvas);
}

/** Twinkling glints riding the center stone. */
function GemSparkles() {
  const tex = useMemo(makeGlintTexture, []);
  const data = useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        // stone length runs along local Z at the head position
        pos: [rand(-0.1, 0.1), 1.32 + rand(-0.02, 0.1), rand(-0.22, 0.22)] as [
          number,
          number,
          number
        ],
        speed: rand(1.6, 3.8),
        phase: rand(0, Math.PI * 2),
        size: rand(0.07, 0.16),
      })),
    []
  );
  const refs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    data.forEach((s, i) => {
      const sp = refs.current[i];
      if (!sp) return;
      const k = Math.max(0, Math.sin(t * s.speed + s.phase));
      const v = Math.pow(k, 8);
      sp.scale.setScalar(s.size * (0.3 + v));
      (sp.material as THREE.SpriteMaterial).opacity = v;
    });
  });

  return (
    <>
      {data.map((s, i) => (
        <sprite
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={s.pos}
        >
          <spriteMaterial
            map={tex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  );
}

/* ── The rings ────────────────────────────────────────────────────────────
   Equal-size interlocked platinum bands. Hers: polished, micro-pavé
   rows, cathedral six-prong head holding the marquise lengthwise along
   the finger axis. His: satin with two pavé rows. */
function Rings({ spin }: { spin: MutableRefObject<SpinState> }) {
  const group = useRef<THREE.Group>(null);
  const marquise = useMarquiseGeometry();
  const { polished, satin, pave, paveGeo } = useJewelryMats();

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = spin.current;
    g.rotation.y += s.vx;
    g.rotation.x += s.vy;
    if (!s.dragging) {
      s.vx += (s.idle - s.vx) * 0.03;
      s.vy += (0 - s.vy) * 0.03;
    }
  });

  return (
    <group ref={group} rotation={[0.35, -0.6, 0.08]}>
      {/* His band — satin platinum with two micro-pavé rows */}
      <group position={[-0.45, 0, 0]}>
        <mesh material={satin}>
          <torusGeometry args={[1.0, 0.11, 48, 96]} />
        </mesh>
        <PaveBand
          rows={[-0.35, 0.35]}
          perRow={36}
          tubeR={0.11}
          stoneScale={0.032}
          geo={paveGeo}
          mat={pave}
        />
      </group>

      {/* Her band — polished platinum, three micro-pavé rows, threaded */}
      <group position={[0.45, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={polished}>
          <torusGeometry args={[1.0, 0.1, 48, 96]} />
        </mesh>
        <PaveBand
          rows={[-0.45, 0, 0.45]}
          perRow={40}
          tubeR={0.1}
          stoneScale={0.026}
          geo={paveGeo}
          mat={pave}
        />

        {/* Cathedral head: stone raised above the band, length along the
            finger axis (local Z), six claws + basket */}
        <group position={[0, 1.32, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.24}>
          <mesh geometry={marquise}>
            <meshPhysicalMaterial
              color="#ffffff"
              metalness={0}
              roughness={0}
              transmission={1}
              thickness={1.6}
              ior={2.42}
              dispersion={4}
              clearcoat={1}
              clearcoatRoughness={0}
              specularIntensity={1}
              envMapIntensity={3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <ProngHead metal={polished} />
        </group>

        <GemSparkles />
      </group>
    </group>
  );
}

export default function Rings3D() {
  const spin = useRef<SpinState>({ vx: 0.006, vy: 0, dragging: false, idle: 0.006 });
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spin.current.idle = 0;
      spin.current.vx = 0;
    }
  }, []);

  return (
    <div
      className="h-[380px] md:h-[480px] cursor-grab active:cursor-grabbing"
      // pan-y keeps vertical page scrolling alive on touch — horizontal
      // drags spin the rings
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        spin.current.dragging = true;
        last.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!spin.current.dragging) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        spin.current.vx = dx * 0.0035;
        spin.current.vy = dy * 0.002;
      }}
      onPointerUp={(e) => {
        spin.current.dragging = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        spin.current.dragging = false;
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 6, 4]} intensity={1.4} />
        <pointLight position={[-5, -2, 4]} intensity={0.5} color="#fff1e0" />
        <JewelEnv />
        <Rings spin={spin} />
      </Canvas>
    </div>
  );
}
