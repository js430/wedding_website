"use client";

import dynamic from "next/dynamic";
import SparkleTitle from "./SparkleTitle";

// WebGL can't server-render
const Rings3D = dynamic(() => import("./Rings3D"), { ssr: false });

export default function RingsSection() {
  return (
    <section
      id="rings"
      className="py-24 px-6"
      style={{
        background:
          "linear-gradient(180deg, #FEE8EC 0%, #FFD3DC 50%, #FEE8EC 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <SparkleTitle text="With These Rings" />
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>
        <p className="text-center font-sans text-bark/60 text-sm -mt-4">
          A promise in platinum — go ahead, give them a spin.
        </p>
        <Rings3D />
        <p className="text-center font-sans text-bark/40 text-xs tracking-[0.3em] uppercase -mt-4">
          Drag to spin
        </p>
      </div>
    </section>
  );
}
