// Full-screen WebGL canvas for the hero 3D house.

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Preload, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import HouseModel from "./HouseModel";
import HeroLighting from "./HeroLighting";

const MODEL_PATH = "/models/house.glb";

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export default function HeroCanvas({ mouseX, mouseY }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 7], fov: 42, near: 0.05, far: 100 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ width: "100%", height: "100%", display: "block" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <CameraSetup />
        <HeroLighting />

        <Suspense fallback={null}>
          <HouseModel mouseX={mouseX} mouseY={mouseY} />
        </Suspense>

        <Preload all />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);
