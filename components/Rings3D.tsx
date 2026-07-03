"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, MutableRefObject } from "react";
import * as THREE from "three";

interface SpinState {
  vx: number;
  vy: number;
  dragging: boolean;
  idle: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Jewelry-studio environment: alternating bright softbox strips and
 * darkness in a ring around the scene. Real-life diamond sparkle comes
 * from facets sweeping across hard light/dark boundaries as the stone
 * moves — a uniform room can't produce it.
 */
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
      // bright / dark / medium rotation for contrast boundaries
      const intensity = i % 2 === 0 ? (i % 4 === 0 ? 10 : 5.5) : 0.15;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 8), strip(intensity));
      m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      m.rotation.y = a + Math.PI; // face the origin
      env.add(m);
    }
    // Overhead softbox
    const top = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), strip(7));
    top.position.set(0, 8, 0);
    top.rotation.x = Math.PI / 2;
    env.add(top);
    // Dim floor bounce
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

/**
 * Marquise brilliant cut. Facet tiers, top to bottom:
 *   table (flat) → star/bezel facets → upper girdle facets → girdle
 *   band → lower girdle facets → pavilion mains → keel line.
 * Adjacent tiers are sampled a half-step offset apart so the strips
 * triangulate into alternating kite/triangle facets like a real
 * brilliant. The pavilion ends in a keel (ridge) along the length —
 * marquise stones don't taper to a single point.
 */
function useMarquiseGeometry() {
  return useMemo(() => {
    const b = 0.5; // half-width — 2:1 marquise
    const R = (1 + b * b) / (2 * b);
    const d = Math.sqrt(R * R - 1);
    const thetaM = Math.asin(1 / R);

    // Point on the lens perimeter, t in [0,1)
    const sample = (t: number): [number, number] => {
      if (t < 0.5) {
        const s = t / 0.5;
        const th = -thetaM + s * 2 * thetaM;
        return [R * Math.sin(th), R * Math.cos(th) - d];
      }
      const s = (t - 0.5) / 0.5;
      const th = thetaM - s * 2 * thetaM;
      return [R * Math.sin(th), -(R * Math.cos(th) - d)];
    };

    const N = 32;
    const ring = (scale: number, y: number, offset: number) =>
      Array.from({ length: N }, (_, i) => {
        const [x, z] = sample(((i + offset) % N) / N);
        return new THREE.Vector3(x * scale, y, z * scale);
      });

    // Tiers
    const gT = 0.035; // half girdle thickness
    const tableR = ring(0.52, 0.3, 0); // table edge
    const bezelR = ring(0.8, 0.19, 0.5); // crown mid tier (offset!)
    const girdleTopR = ring(1.0, gT, 0);
    const girdleBotR = ring(1.0, -gT, 0);
    const pavMidR = ring(0.55, -0.5, 0.5); // pavilion tier (offset!)
    const keelY = -0.82;
    const keelHalf = 0.42;
    const tableC = new THREE.Vector3(0, 0.3, 0);

    const tris: THREE.Vector3[] = [];
    const quadStrip = (a: THREE.Vector3[], bRing: THREE.Vector3[]) => {
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        tris.push(a[i], bRing[i], a[j]);
        tris.push(a[j], bRing[i], bRing[j]);
      }
    };

    // Table fan (flat top)
    for (let i = 0; i < N; i++) {
      tris.push(tableR[i], tableR[(i + 1) % N], tableC);
    }
    // Crown: star facets, bezel facets, upper girdle facets
    quadStrip(tableR, bezelR);
    quadStrip(bezelR, girdleTopR);
    // Girdle band
    quadStrip(girdleTopR, girdleBotR);
    // Pavilion: lower girdle facets
    quadStrip(girdleBotR, pavMidR);
    // Pavilion mains → keel ridge along the length axis
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
    geo.computeVertexNormals(); // non-indexed → hard facet normals
    return geo;
  }, []);
}

/** Camera-glint texture: bright core with a four-ray star. */
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

/** Twinkling glints riding on the stone — the "camera sparkle". */
function GemSparkles() {
  const tex = useMemo(makeGlintTexture, []);
  const data = useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        pos: [rand(-0.26, 0.26), 1.16 + rand(-0.01, 0.13), rand(-0.11, 0.11)] as [
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
      const v = Math.pow(k, 8); // sharp on/off — a flash, not a fade
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

/** Pavé stones circling a band — tiny gems sharing one geometry/material. */
function PaveStones() {
  const geo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 1,
        thickness: 0.5,
        ior: 2.42,
        dispersion: 3,
        clearcoat: 1,
        envMapIntensity: 2.5,
        side: THREE.DoubleSide,
      }),
    []
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat]
  );

  const COUNT = 18;
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => {
        const a = (i / COUNT) * Math.PI * 2;
        return (
          <mesh
            key={i}
            geometry={geo}
            material={mat}
            // seated into the tube so roughly half the stone sits proud
            position={[Math.cos(a) * 1.09, Math.sin(a) * 1.09, 0]}
            rotation={[0, 0, a - Math.PI / 2]}
            scale={[0.05, 0.065, 0.05]}
          />
        );
      })}
    </>
  );
}

/** Two interlocked platinum bands; hers carries the marquise diamond. */
function Rings({ spin }: { spin: MutableRefObject<SpinState> }) {
  const group = useRef<THREE.Group>(null);
  const marquise = useMarquiseGeometry();

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
      {/* His band — satin platinum, pavé diamonds around the outside */}
      <group position={[-0.45, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.0, 0.12, 48, 96]} />
          <meshStandardMaterial
            color="#E5E4E2"
            metalness={1}
            roughness={0.24}
            envMapIntensity={1.2}
          />
        </mesh>
        <PaveStones />
      </group>

      {/* Her band — polished platinum, threaded through his */}
      <group position={[0.45, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.0, 0.12, 48, 96]} />
          <meshStandardMaterial
            color="#EAE9E7"
            metalness={1}
            roughness={0.09}
            envMapIntensity={1.3}
          />
        </mesh>
        {/* Marquise diamond — keel seated into the band */}
        <mesh geometry={marquise} position={[0, 1.16, 0]} scale={0.26}>
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
