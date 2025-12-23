import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ArixChristmasTree } from './ArixChristmasTree';
import { TreeState } from '../types';
import * as THREE from 'three';

interface ExperienceProps {
  treeState: TreeState;
}

const MovingLight = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.getElapsedTime();
      lightRef.current.position.x = Math.sin(t * 0.5) * 8;
      lightRef.current.position.z = Math.cos(t * 0.5) * 8;
      lightRef.current.position.y = Math.sin(t * 0.8) * 4;
    }
  });
  return <pointLight ref={lightRef} intensity={8} color="#ffd700" distance={15} decay={2} />;
};

export const Experience: React.FC<ExperienceProps> = ({ treeState }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 14]} fov={40} />
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={8}
        maxDistance={25}
        autoRotate={treeState === TreeState.ASSEMBLED}
        autoRotateSpeed={0.8}
        enableDamping
      />

      {/* Lighting Setup for Luxury Feel */}
      <ambientLight intensity={0.4} color="#002211" />
      <spotLight 
        position={[10, 15, 10]} 
        angle={0.4} 
        penumbra={1} 
        intensity={3} 
        color="#ffffff" 
        castShadow 
      />
      <MovingLight />
      
      {/* Environment for Reflections (Crucial for Gold) */}
      <Environment preset="city" />

      {/* The Main Sculpture */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <ArixChristmasTree state={treeState} />
      </Float>

      {/* Ambient Particles - Golden Dust */}
      <Sparkles 
        count={300} 
        scale={20} 
        size={3} 
        speed={0.2} 
        opacity={0.4} 
        color="#FFD700"
      />

      {/* Post Processing for Cinematic Bloom */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.9} 
          mipmapBlur 
          intensity={2.0} 
          radius={0.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
      </EffectComposer>
    </>
  );
};