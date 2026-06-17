// src/components/HeroCanvas.jsx
// What this file does: wraps Three.js Canvas for the hero 3D scene
// Transparent bg so the page void background shows through.
// Receives normalised mouse coords (-1 to +1) and passes to HouseModel.

import { Suspense }    from "react";
import { Canvas }      from "@react-three/fiber";
import { Environment, Preload } from "@react-three/drei";
import HouseModel      from "./HouseModel";
import HeroLighting    from "./HeroLighting";

export default function HeroCanvas({ mouseX, mouseY }) {
  return (
    <Canvas
      // Camera: pulled back enough to show full house with breathing room
      camera={{ position: [0, 1, 10], fov: 42, near: 0.1, far: 1000 }}

      // Transparent background so --void shows through
      gl={{
        alpha:                true,
        antialias:            true,
        powerPreference:      "high-performance",
        preserveDrawingBuffer: false,
      }}

      // Reduce pixel ratio on low-end devices, up to 2 on high-DPI screens
      dpr={[1, 2]}

      // Auto-reduce quality on slow frames
      performance={{ min: 0.5 }}

      style={{
        position:      "absolute",
        inset:         0,
        zIndex:        20,
        background:    "transparent",
        pointerEvents: "none", // let clicks pass through to page buttons
      }}

      // ACESFilmic tone mapping + slightly underexposed = cinematic look
      onCreated={({ gl }) => {
        gl.toneMapping        = 4;   // THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 0.78;
      }}
    >
      <HeroLighting />

      {/* 'night' environment gives cool-dark ambient with subtle sky reflections */}
      <Environment preset="night" />

      {/* Suspense here keeps the canvas mounted while GLB loads */}
      <Suspense fallback={null}>
        <HouseModel mouseX={mouseX} mouseY={mouseY} />
      </Suspense>

      {/* Preload all textures eagerly */}
      <Preload all />
    </Canvas>
  );
}
