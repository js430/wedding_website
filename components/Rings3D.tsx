"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, MutableRefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

interface SpinState {
  vx: number;
  vy: number;
  dragging: boolean;
  idle: number;
}

/** Studio-style environment reflections so the metal reads as real gold. */
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
 * Two interlocked bands (a Hopf link): his in gold, hers in rose gold
 * with a diamond. The centers sit close enough that each ring passes
 * through the other's hole.
 */
function Rings({ spin }: { spin: MutableRefObject<SpinState> }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = spin.current;
    g.rotation.y += s.vx;
    g.rotation.x += s.vy;
    // After release, momentum eases back to the idle spin
    if (!s.dragging) {
      s.vx += (s.idle - s.vx) * 0.03;
      s.vy += (0 - s.vy) * 0.03;
    }
  });

  return (
    <group ref={group} rotation={[0.35, -0.6, 0.08]}>
      {/* His band — gold */}
      <mesh position={[-0.45, 0, 0]}>
        <torusGeometry args={[1.0, 0.14, 48, 96]} />
        <meshStandardMaterial
          color="#d4a53d"
          metalness={1}
          roughness={0.16}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Her band — rose gold, threaded through his */}
      <group position={[0.45, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.85, 0.11, 48, 96]} />
          <meshStandardMaterial
            color="#dfa08c"
            metalness={1}
            roughness={0.14}
            envMapIntensity={1.4}
          />
        </mesh>
        {/* Diamond */}
        <mesh position={[0, 0.98, 0]} scale={0.15}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.2}
            roughness={0.02}
            envMapIntensity={2.5}
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
        <pointLight position={[-5, -2, 4]} intensity={0.5} color="#ffd9c4" />
        <Env />
        <Rings spin={spin} />
      </Canvas>
    </div>
  );
}
