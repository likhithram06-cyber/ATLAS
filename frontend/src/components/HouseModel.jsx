// src/components/HouseModel.jsx
// Renders the AR House with cursor parallax, idle spin, and auto-fit centering.

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/house.glb";
const TARGET_SIZE = 3.4; // max dimension in world units — fills ~35% of viewport height
const ROT_SENSITIVITY = 0.32;
const LERP_SPEED = 0.05;
const AUTO_ROT_SPEED = 0.004;

function prepareScene(source) {
  const scene = source.clone(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Center geometry at origin so rotation pivots on the house
  scene.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fitScale = TARGET_SIZE / maxDim;
  scene.scale.setScalar(fitScale);

  scene.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((mat) => {
      if (!mat) return;
      mat.side = THREE.DoubleSide;
      mat.needsUpdate = true;

      // Model uses KHR_materials_unlit — scene lights won't affect it; keep textures bright
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      if (mat.isMeshBasicMaterial) {
        mat.toneMapped = true;
        mat.color.setHex(0xffffff);
      }
    });
  });

  const fittedBox = new THREE.Box3().setFromObject(scene);
  return { scene, bottomY: fittedBox.min.y };
}

export default function HouseModel({ mouseX, mouseY }) {
  const groupRef = useRef(null);
  const targetRot = useRef({ x: 0, y: 0 });
  const currentRot = useRef({ x: 0, y: 0 });

  const { scene: rawScene } = useGLTF(MODEL_PATH);
  const { scene, bottomY } = useMemo(() => prepareScene(rawScene), [rawScene]);

  useFrame((state) => {
    if (!groupRef.current) return;

    targetRot.current.y = mouseX * ROT_SENSITIVITY;
    targetRot.current.x = -mouseY * ROT_SENSITIVITY * 0.45;

    currentRot.current.x += (targetRot.current.x - currentRot.current.x) * LERP_SPEED;
    currentRot.current.y += (targetRot.current.y - currentRot.current.y) * LERP_SPEED;

    groupRef.current.rotation.x = currentRot.current.x;
    groupRef.current.rotation.y =
      currentRot.current.y + state.clock.elapsedTime * AUTO_ROT_SPEED;
  });

  return (
    <group ref={groupRef} position={[0, -0.15, 0]}>
      <primitive object={scene} rotation={[0, Math.PI * 0.12, 0]} />

      <ContactShadows
        position={[0, bottomY - 0.05, 0]}
        opacity={0.4}
        scale={12}
        blur={2}
        far={8}
        color="#000000"
        frames={Infinity}
      />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
