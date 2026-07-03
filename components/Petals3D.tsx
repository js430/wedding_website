"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const COLORS = ["#CC1428", "#8B0010", "#FFB3C4", "#c9a838"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Petal drawn onto an offscreen canvas — a soft teardrop with a
// lighter midrib so it reads as organic rather than a flat dot.
function makePetalTexture(color: string): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(size / 2, size / 2);

  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.bezierCurveTo(15, -12, 17, 10, 0, 27);
  ctx.bezierCurveTo(-17, 10, -15, -12, 0, -26);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.92;
  ctx.fill();

  // midrib highlight
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(2, 0, 0, 21);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

interface PetalData {
  pos: [number, number, number];
  rotSpeed: [number, number, number];
  fall: number;
  sway: number;
  phase: number;
  scale: number;
  color: number;
}

function PetalField() {
  const textures = useMemo(() => COLORS.map(makePetalTexture), []);
  const petals = useMemo<PetalData[]>(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        pos: [rand(-9, 9), rand(-6, 8), rand(-4, 2)],
        rotSpeed: [rand(-1.2, 1.2), rand(-1.2, 1.2), rand(-0.8, 0.8)],
        fall: rand(0.4, 1.1),
        sway: rand(0.3, 0.9),
        phase: rand(0, Math.PI * 2),
        scale: rand(0.22, 0.5),
        color: i % COLORS.length,
      })),
    []
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    petals.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      p.pos[1] -= p.fall * delta;
      if (p.pos[1] < -6.5) {
        p.pos[1] = 7.5;
        p.pos[0] = rand(-9, 9);
      }
      m.position.set(
        p.pos[0] + Math.sin(t * p.sway + p.phase) * 0.7,
        p.pos[1],
        p.pos[2]
      );
      m.rotation.x += p.rotSpeed[0] * delta;
      m.rotation.y += p.rotSpeed[1] * delta;
      m.rotation.z += p.rotSpeed[2] * delta;
    });

    // Mouse parallax — the whole field leans gently toward the cursor
    if (group.current) {
      group.current.rotation.y +=
        (mouse.current.x * 0.24 - group.current.rotation.y) * 0.04;
      group.current.rotation.x +=
        (mouse.current.y * 0.14 - group.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={group}>
      {petals.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={p.pos}
          scale={p.scale}
        >
          <planeGeometry args={[1, 1.6]} />
          <meshBasicMaterial
            map={textures[p.color]}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Petals3D() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <PetalField />
      </Canvas>
    </div>
  );
}
