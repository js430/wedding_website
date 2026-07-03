"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// WebGL can't server-render — load the 3D scene client-side only.
const Petals3D = dynamic(() => import("./Petals3D"), { ssr: false });

export default function PetalsField() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return enabled ? <Petals3D /> : null;
}
