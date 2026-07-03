"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, MutableRefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

interface SpinState {
  vx: number;
  vy: number;
  dragging: boolean;
  idle: number;
}

/** Studio-style environment reflections so the metal reads as real. */
function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    return () => {
      scene.environment = null;
      envTex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/**
 * Marquise-cut gem geometry: a pointed-lens girdle (two circular arcs
 * meeting at sharp tips), faceted crown rising to a flat table, and a
 * pavilion tapering to a culet point. Non-indexed triangles give hard
 * facet normals for the classic cut-stone sparkle.
 */
function useMarquiseGeometry() {
  return useMemo(() => {
    const b = 0.5; // half-width at center — length:width = 2:1
    const R = (1 + b * b) / (2 * b);
    const d = Math.sqrt(R * R - 1);
    const M = 24;

    const outline: [number, number][] = [];
    for (let i = 0; i < M; i++) {
      const x = -1 + (2 * i) / (M - 1);
      const z = Math.sqrt(Math.max(R * R - x * x, 0)) - d;
      outline.push([x, z]);
    }
    for (let i = M - 2; i > 0; i--) {
      const x = -1 + (2 * i) / (M - 1);
      const z = -(Math.sqrt(Math.max(R * R - x * x, 0)) - d);
      outline.push([x, z]);
    }

    const n = outline.length;
    const crownH = 0.32;
    const pavilionH = 0.85;
    const tableScale = 0.55;

    const girdle = outline.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const table = outline.map(
      ([x, z]) => new THREE.Vector3(x * tableScale, crownH, z * tableScale)
    );
    const culet = new THREE.Vector3(0, -pavilionH, 0);
    const tableCenter = new THREE.Vector3(0, crownH, 0);

    const tris: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tris.push(girdle[i], culet, girdle[j]); // pavilion facet
      tris.push(girdle[i], girdle[j], table[j]); // crown facet
      tris.push(girdle[i], table[j], table[i]); // crown facet
      tris.push(table[i], table[j], tableCenter); // table fan
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

/**
 * Two interlocked platinum bands (a Hopf link) — hers carries a
 * marquise diamond with real gem optics: transmission, diamond IOR,
 * and chromatic dispersion for the rainbow fire.
 */
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
      {/* His band — satin platinum */}
      <mesh position={[-0.45, 0, 0]}>
        <torusGeometry args={[1.0, 0.14, 48, 96]} />
        <meshStandardMaterial
          color="#E5E4E2"
          metalness={1}
          roughness={0.24}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Her band — polished platinum, threaded through his */}
      <group position={[0.45, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.85, 0.11, 48, 96]} />
          <meshStandardMaterial
            color="#EAE9E7"
            metalness={1}
            roughness={0.09}
            envMapIntensity={1.6}
          />
        </mesh>
        {/* Marquise diamond — culet seated into the band */}
        <mesh geometry={marquise} position={[0, 1.02, 0]} scale={0.24}>
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={0}
            roughness={0}
            transmission={1}
            thickness={1.4}
            ior={2.42}
            dispersion={3.5}
            clearcoat={1}
            clearcoatRoughness={0}
            specularIntensity={1}
            envMapIntensity={2.2}
            side={THREE.DoubleSide}
          />
        </mesh>
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
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 4]} intensity={1.1} />
        <pointLight position={[-5, -2, 4]} intensity={0.5} color="#fff1e0" />
        <Env />
        <Rings spin={spin} />
      </Canvas>
    </div>
  );
}
