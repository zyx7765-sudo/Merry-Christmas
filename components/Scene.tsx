import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, PhotoData } from '../types';

interface SceneProps {
  treeState: TreeState;
  handData: { x: number, y: number } | null;
  uploadedPhotos: PhotoData[];
}

const PARTICLE_COUNT = 2000;

export const Scene: React.FC<SceneProps> = ({ treeState, handData, uploadedPhotos }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const photoGroupRef = useRef<THREE.Group>(null);
  
  // Internal animation progress
  const progress = useRef(0);
  const rotationOffset = useRef({ x: 0, y: 0 });
  
  // --- Snow/Particle Generation ---
  const particles = useMemo(() => {
    const temp = [];
    const colors = ['#FFFFFF', '#D4AF37', '#ADD8E6']; // White, Gold, Light Blue
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Create a cylindrical volume for snow/particles
      const r = 10 + Math.random() * 20; // Wide radius
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 30 - 15; // Vertical range

      const scatterPos: [number, number, number] = [
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      ];

      temp.push({
        initialPos: scatterPos,
        velocity: Math.random() * 0.05 + 0.02, // Falling speed
        scale: Math.random() * 0.1 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
        offset: Math.random() * 100
      });
    }
    return temp;
  }, []);

  // --- Photo Positioning ---
  const photoLayout = useMemo(() => {
     return uploadedPhotos.map((photo, i) => {
         // Scatter: Random sphere
         const u = Math.random();
         const v = Math.random();
         const theta = 2 * Math.PI * u;
         const phi = Math.acos(2 * v - 1);
         const sr = 12;
         const scatterPos = new THREE.Vector3(
            sr * Math.sin(phi) * Math.cos(theta),
            sr * Math.sin(phi) * Math.sin(theta),
            sr * Math.cos(phi)
         );

         // Tree: Spiral up
         const p = i / (uploadedPhotos.length || 1);
         const h = -3 + p * 6;
         const r = ((1 - (h + 5) / 10) * 4) + 1.2; 
         const angle = i * (Math.PI * 2 / 1.618);
         const treePos = new THREE.Vector3(
            Math.cos(angle) * r,
            h,
            Math.sin(angle) * r
         );

         return { scatterPos, treePos, id: photo.id };
     });
  }, [uploadedPhotos]);


  // --- Animation Loop ---
  useFrame((state, delta) => {
    // 1. State Interpolation
    const target = treeState === TreeState.ASSEMBLED ? 0 : 1; 
    progress.current = THREE.MathUtils.damp(progress.current, target, 2, delta);
    const t = progress.current;
    
    // 2. Hand Rotation Control (Only in Scattered mode)
    if (treeState === TreeState.SCATTERED && handData) {
        const targetRotY = (0.5 - handData.x) * 2; 
        const targetRotX = (handData.y - 0.5) * 1;
        rotationOffset.current.x = THREE.MathUtils.lerp(rotationOffset.current.x, targetRotX, 0.1);
        rotationOffset.current.y = THREE.MathUtils.lerp(rotationOffset.current.y, targetRotY, 0.1);
    } else {
        rotationOffset.current.y += 0.001; // Slower auto rotate
        rotationOffset.current.x = THREE.MathUtils.lerp(rotationOffset.current.x, 0, 0.1);
    }

    if (meshRef.current) {
        meshRef.current.rotation.y = rotationOffset.current.y;
        meshRef.current.rotation.x = rotationOffset.current.x;
    }
    if (photoGroupRef.current) {
        photoGroupRef.current.rotation.y = rotationOffset.current.y;
        photoGroupRef.current.rotation.x = rotationOffset.current.x;
    }


    // 3. Update Particles (Snow Logic)
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const time = state.clock.elapsedTime;
    
    particles.forEach((p, i) => {
        const { initialPos, velocity, scale, offset } = p;
        
        let x = initialPos[0];
        let y = initialPos[1];
        let z = initialPos[2];

        // If Tree is assembled: Falling Snow
        // If Scattered: Explosion outwards
        
        if (t < 0.5) {
            // FALLING SNOW
            y = initialPos[1] - ((time * velocity * 20 + offset) % 30);
            // Wrap around
            if (y < -15) y += 30;
            
            // Gentle sway
            x += Math.sin(time + offset) * 0.5;
            z += Math.cos(time + offset) * 0.5;
        } else {
            // SCATTER EXPLOSION
            // Push outwards based on t
            const explosionFactor = t * 15;
            x = initialPos[0] + (initialPos[0] / 10) * explosionFactor;
            y = initialPos[1] + (Math.random() - 0.5) * explosionFactor;
            z = initialPos[2] + (initialPos[2] / 10) * explosionFactor;
        }

        dummy.position.set(x, y, z);
        dummy.rotation.set(time, time, time);
        dummy.scale.setScalar(scale * (1 + t)); // Grow slightly when exploding
        
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        meshRef.current!.setColorAt(i, color.set(p.color));
    });
    meshRef.current!.instanceMatrix.needsUpdate = true;
    meshRef.current!.instanceColor!.needsUpdate = true;

    // 4. Update Photos
    if (photoGroupRef.current && uploadedPhotos.length > 0) {
        photoGroupRef.current.children.forEach((child, i) => {
            if (!photoLayout[i]) return;
            const layout = photoLayout[i];
            
            const currentPos = new THREE.Vector3().lerpVectors(layout.treePos, layout.scatterPos, t);
            
            child.position.lerp(currentPos, 0.1);
            child.lookAt(0, 0, 0);

            const targetScale = treeState === TreeState.SCATTERED ? 1.5 : 0.8;
            child.scale.setScalar(THREE.MathUtils.lerp(child.scale.x, targetScale, 0.1));
        });
    }

  });

  return (
    <>
      <group>
        {/* The Snow/Particles */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
          <dodecahedronGeometry args={[1, 0]} /> 
          <meshStandardMaterial 
            toneMapped={false}
            roughness={0.1} 
            metalness={0.9}
            emissive="#FFFFFF"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </instancedMesh>

        {/* The Photos */}
        <group ref={photoGroupRef}>
            {uploadedPhotos.map((photo, i) => (
                <PhotoFrame key={photo.id} url={photo.url} />
            ))}
        </group>
      </group>
    </>
  );
};

const PhotoFrame = ({ url }: { url: string }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[2.1, 2.1]} />
                <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
            </mesh>
        </mesh>
    );
}