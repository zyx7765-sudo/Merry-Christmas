import React, { useState, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { Environment, OrbitControls, Html } from '@react-three/drei';
import { HandController } from './components/HandController';
import { Scene } from './components/Scene';
import { ArixChristmasTree } from './components/ArixChristmasTree';
import { HandGesture, TreeState, PhotoData } from './types';
import * as THREE from 'three';

const Loader = () => (
  <Html center>
    <div className="loader-ring"><div></div><div></div><div></div><div></div></div>
  </Html>
);

export default function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.ASSEMBLED);
  const [gesture, setGesture] = useState<HandGesture>(HandGesture.NONE);
  const [handData, setHandData] = useState<{x: number, y: number} | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Hand Logic ---
  const handleGesture = useCallback((detectedGesture: HandGesture, data: any) => {
    setGesture(detectedGesture);
    if (data) {
        setHandData({ x: data.x, y: data.y });
    } else {
        setHandData(null);
    }

    if (detectedGesture === HandGesture.FIST) {
        setTreeState(TreeState.ASSEMBLED);
    } else if (detectedGesture === HandGesture.OPEN) {
        setTreeState(TreeState.SCATTERED);
    } 
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newPhotos: PhotoData[] = Array.from(e.target.files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file),
            scatterPosition: [0,0,0],
            treePosition: [0,0,0]
        }));
        setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#051a0f] overflow-hidden">
      
      {/* Hidden Video for MediaPipe */}
      <video ref={videoRef} className="absolute opacity-0 pointer-events-none" autoPlay playsInline muted></video>

      {/* Merry Christmas Header Overlay - Scaled down for mobile */}
      <div className="absolute top-0 left-0 w-full z-10 flex justify-center pt-4 md:pt-8 pointer-events-none">
          <h1 className="font-['Playfair_Display'] text-[#FFD700] text-4xl md:text-7xl italic drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse">
              Merry Christmas!
          </h1>
      </div>

      {/* 3D Canvas */}
      <Canvas 
        shadows 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 2, 18], fov: 35 }}
        gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.2 }}
      >
        <color attach="background" args={['#020a05']} />
        <fog attach="fog" args={['#020a05', 15, 35]} />
        
        <Suspense fallback={<Loader />}>
            {/* The Tree Logic */}
            <group position={[0, -2, 0]}>
                <ArixChristmasTree state={treeState} />
            </group>
            
            {/* The Environment/Snow Logic */}
            <Scene treeState={treeState} handData={handData} uploadedPhotos={photos} />
        </Suspense>
        
        {/* Cinematic Lighting */}
        <ambientLight intensity={0.2} />
        <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={2} color="#ffaa00" castShadow />
        <pointLight position={[-5, 5, -5]} intensity={1} color="#0044ff" distance={20} />
        <Environment preset="city" />

        {/* Post Processing */}
        <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={1.2} mipmapBlur intensity={1.8} radius={0.4} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
        </EffectComposer>

        <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2}
            minDistance={10}
            maxDistance={30}
        />
      </Canvas>

      <HandController onGesture={handleGesture} videoRef={videoRef} />

      {/* UI Overlay - Compacted for mobile */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-3 md:p-8">
        <footer className="pointer-events-auto flex items-end justify-between w-full gap-2">
            
            {/* Instruction Panel - Smaller width, font, and padding */}
            <div className="glass-panel p-3 md:p-6 rounded-lg w-52 md:w-80 text-xs md:text-sm text-white/80 leading-relaxed border-l-2 md:border-l-4 border-[#D4AF37]">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                    <span className="text-[#D4AF37] text-[10px] md:text-xs font-bold uppercase tracking-widest">Gesture Control</span>
                    <div className="h-px bg-[#D4AF37]/30 flex-1"></div>
                </div>
                
                <div className="space-y-2 md:space-y-4">
                    <div className={`flex items-center gap-2 md:gap-4 transition-opacity duration-300 ${gesture === HandGesture.OPEN ? 'opacity-100' : 'opacity-40'}`}>
                        <span className="text-lg md:text-2xl">🖐</span>
                        <div>
                            <strong className="text-white block text-[10px] md:text-base">OPEN HAND: SCATTER</strong>
                            <span className="text-[9px] md:text-xs leading-tight block opacity-80">Explode tree & Snow</span>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 md:gap-4 transition-opacity duration-300 ${gesture === HandGesture.FIST ? 'opacity-100' : 'opacity-40'}`}>
                        <span className="text-lg md:text-2xl">✊</span>
                        <div>
                            <strong className="text-white block text-[10px] md:text-base">FIST: ASSEMBLE</strong>
                            <span className="text-[9px] md:text-xs leading-tight block opacity-80">Form Tree & Snow</span>
                        </div>
                    </div>
                </div>

                <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-white/10 text-[9px] md:text-xs text-[#D4AF37]">
                    Status: <span className="font-bold text-white uppercase">{gesture}</span>
                </div>
            </div>

            {/* Upload Button - Smaller */}
            <label className="cursor-pointer glass-panel px-4 py-2 md:px-6 md:py-4 rounded-full hover:bg-[#D4AF37]/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 md:gap-3 group">
                <span className="text-lg md:text-2xl group-hover:rotate-12 transition-transform">📷</span>
                <span className="font-['Cinzel'] font-bold text-[#D4AF37] text-xs md:text-base whitespace-nowrap">Upload</span>
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
        </footer>
      </div>

    </div>
  );
}