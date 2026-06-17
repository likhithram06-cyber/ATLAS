// src/components/HouseModel.jsx
// What this file does: renders the AR House 3D model with:
//   - cursor-driven parallax rotation (mouse moves → house tilts)
//   - slow idle auto-rotation when cursor is still
//   - Blade Runner amber rim lighting applied via materials
//   - subtle contact shadow grounding the model

import { useRef, useEffect } from "react";
import { useFrame }          from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";

// Rotation constants
const ROT_SENSITIVITY = 0.28;  // how much the mouse tilts the model
const LERP_SPEED      = 0.04;  // how fast model chases cursor — lower = heavier feel
const AUTO_ROT_SPEED  = 0.003; // idle auto-rotation (radians per frame)

export default function HouseModel({ mouseX, mouseY }) {
  const groupRef   = useRef(null);
  const targetRot  = useRef({ x: 0, y: 0 });
  const currentRot = useRef({ x: 0, y: 0 });

  // Load the GLB file from /public/models/
  const { scene } = useGLTF("/models/house.glb");

  // Per-frame update: smoothly chase cursor position
  useFrame((state) => {
    if (!groupRef.current) return;

    // Convert mouse (-1 to +1) to target rotation angles
    // Negating mouseX makes the house feel "weighted" (tilts opposite to cursor)
    targetRot.current.y =  mouseX * ROT_SENSITIVITY;
    targetRot.current.x = -mouseY * ROT_SENSITIVITY * 0.45;

    // Lerp current → target for smooth heavy-drag feel
    currentRot.current.x += (targetRot.current.x - currentRot.current.x) * LERP_SPEED;
    currentRot.current.y += (targetRot.current.y - currentRot.current.y) * LERP_SPEED;

    // Apply rotation + slow idle spin
    groupRef.current.rotation.x = currentRot.current.x;
    groupRef.current.rotation.y = currentRot.current.y + state.clock.elapsedTime * AUTO_ROT_SPEED;
  });

  // Slightly smaller scale on mobile (598k triangles is heavy)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && groupRef.current) {
      groupRef.current.scale.setScalar(0.012);
    }
  }, []);

  // Traverse meshes and tweak materials for the Blade Runner look
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;

        if (child.material) {
          child.material.needsUpdate = true;
          // Slightly desaturate / darken to match the moody palette
          if (child.material.color) {
            child.material.color.multiplyScalar(0.82);
          }
          // Boost metalness subtly so amber rim light picks up reflections
          if (child.material.metalness !== undefined) {
            child.material.metalness = Math.min(1, (child.material.metalness || 0) + 0.1);
          }
        }
      }
    });
  }, [scene]);

  return (
    <group ref={groupRef}>
      {/* The AR House model */}
      {/*
        Scale / position calibration:
          Too small → scale={0.02} or {0.03}
          Too large → scale={0.008} or {0.005}
          Too low   → position y: -1 → 0
          Too high  → position y: -1 → -2
      */}
      <primitive
        object={scene}
        scale={0.015}
        position={[0, -1.2, 0]}
        rotation={[0, Math.PI * 0.15, 0]}
      />

      {/* Soft contact shadow — grounds the model so it doesn't look floating */}
      <ContactShadows
        position={[0, -2.6, 0]}
        opacity={0.35}
        scale={22}
        blur={2.5}
        color="#000000"
        frames={1}
      />
    </group>
  );
}

// Preload so it doesn't flash on first render
useGLTF.preload("/models/house.glb");
