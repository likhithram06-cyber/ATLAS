// src/components/HeroLighting.jsx
// What this file does: cinematic Blade Runner 2049 lighting for the 3D hero scene
// Dark ambient + cool moonlight key + signature amber rim from below-right

export default function HeroLighting() {
  return (
    <>
      {/* Very dim ambient — keeps deep shadows readable, barely illuminates */}
      <ambientLight intensity={0.07} color="#1A2535" />

      {/* Key light — cool blue-white from top-left, mimics moonlight */}
      <directionalLight
        position={[-8, 10, 4]}
        intensity={0.85}
        color="#B0C8E0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Rim light — amber from below-right, THE Blade Runner signature */}
      {/* This is the ONLY warm light — everything else is cool/neutral */}
      <pointLight
        position={[6, -1.5, 3]}
        intensity={1.4}
        color="#C8963C"
        distance={22}
        decay={2}
      />

      {/* Subtle fill from front — stops deep shadows going pure black */}
      <directionalLight
        position={[2, 0, 8]}
        intensity={0.12}
        color="#8090A0"
      />

      {/* Ground bounce — tiny warm glow rising from below */}
      <pointLight
        position={[0, -4.5, 0]}
        intensity={0.4}
        color="#3A2010"
        distance={12}
        decay={2}
      />

      {/* Subtle back rim from upper-right to separate model from darkness */}
      <pointLight
        position={[10, 6, -8]}
        intensity={0.3}
        color="#8090A8"
        distance={30}
        decay={2}
      />
    </>
  );
}
