import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';

interface ArixChristmasTreeProps {
  state: TreeState;
}

const NEEDLE_COUNT = 6000; // Lush count
const RIBBON_COUNT = 1500; 
const GOLD_ORNAMENT_COUNT = 150;
const RED_ORNAMENT_COUNT = 100;
const LIGHTS_COUNT = 200;

// Helper: Random point in large sphere for scatter
const getRandomScatterPoint = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; 
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  ];
};

export const ArixChristmasTree: React.FC<ArixChristmasTreeProps> = ({ state }) => {
  const needlesRef = useRef<THREE.InstancedMesh>(null);
  const ribbonRef = useRef<THREE.InstancedMesh>(null);
  const goldOrnamentsRef = useRef<THREE.InstancedMesh>(null);
  const redOrnamentsRef = useRef<THREE.InstancedMesh>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.Group>(null);
  
  const morphProgress = useRef(0);
  
  // --- Data Generation ---

  // 1. Lush Pine Needles (Green)
  const needlesData = useMemo(() => {
    const data = [];
    // Fibonacci Spiral distribution for organic tree look
    const phi = Math.PI * (3 - Math.sqrt(5)); 
    
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const scatterPos = getRandomScatterPoint(35);
      
      const y = 5 - (i / (NEEDLE_COUNT - 1)) * 10; // Top (5) to Bottom (-5)
      const radius = (5 - y) * 0.6; // Cone shape
      
      const theta = phi * i;
      
      // Add thickness/randomness to the branch tips
      const r = radius + (Math.random() - 0.5) * 1.5;
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      
      // Look at logic (needles point slightly up and out)
      const rotation = new THREE.Euler(
         Math.random() * 0.5 - 0.2, 
         theta + Math.PI / 2, 
         0.5 // Tilt up
      );

      data.push({
        scatterPosition: scatterPos,
        treePosition: [x, y, z] as [number, number, number],
        rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
        scale: Math.random() * 0.5 + 0.5,
      });
    }
    return data;
  }, []);

  // 2. The Golden Ribbon
  const ribbonData = useMemo(() => {
    const data = [];
    const turns = 6;
    const height = 10;
    
    for (let i = 0; i < RIBBON_COUNT; i++) {
       const scatterPos = getRandomScatterPoint(40);
       const t = i / RIBBON_COUNT;
       
       const y = 4.5 - (t * 9); // Spiral down
       const baseRadius = (5 - y) * 0.75; // Follow cone
       const r = baseRadius + 0.6; // Hover slightly off tree
       
       const angle = t * Math.PI * 2 * turns;
       
       const x = Math.cos(angle) * r;
       const z = Math.sin(angle) * r;

       data.push({
         scatterPosition: scatterPos,
         treePosition: [x, y, z] as [number, number, number],
         scale: Math.random() * 0.5 + 0.5
       });
    }
    return data;
  }, []);

  // 3. Ornaments Helper
  const generateOrnamentData = (count: number, color: string, radiusOffset = 0.0) => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const scatterPos = getRandomScatterPoint(30);
      
      // Random position on cone surface
      const y = -4.5 + Math.random() * 9;
      const coneR = (5 - y) * 0.6;
      const r = coneR + 0.2 + Math.random() * 0.5 + radiusOffset;
      const angle = Math.random() * Math.PI * 2;
      
      data.push({
        scatterPosition: scatterPos,
        treePosition: [Math.cos(angle) * r, y, Math.sin(angle) * r] as [number, number, number],
        scale: 0.5 + Math.random() * 0.5,
        phase: Math.random() * 10
      });
    }
    return data;
  };

  const goldData = useMemo(() => generateOrnamentData(GOLD_ORNAMENT_COUNT, 'gold'), []);
  const redData = useMemo(() => generateOrnamentData(RED_ORNAMENT_COUNT, 'red'), []);
  const lightsData = useMemo(() => generateOrnamentData(LIGHTS_COUNT, 'light', -0.2), []); // Lights inside tree


  // --- Animation Loop ---

  useFrame((stateThree, delta) => {
    const { clock } = stateThree;
    const time = clock.getElapsedTime();

    // 1. Morph Progress
    const target = state === TreeState.ASSEMBLED ? 1 : 0;
    // Faster snapping for "Explosion" (0), smoother for Assemble (1)
    const smoothTime = state === TreeState.ASSEMBLED ? 2.0 : 0.8;
    morphProgress.current = THREE.MathUtils.damp(morphProgress.current, target, smoothTime, delta);
    const t = morphProgress.current;

    const dummy = new THREE.Object3D();
    const colorDummy = new THREE.Color();

    // --- Update Needles ---
    if (needlesRef.current) {
      needlesData.forEach((data, i) => {
        const { scatterPosition, treePosition, rotation, scale } = data;
        
        dummy.position.set(
          THREE.MathUtils.lerp(scatterPosition[0], treePosition[0], t),
          THREE.MathUtils.lerp(scatterPosition[1], treePosition[1], t),
          THREE.MathUtils.lerp(scatterPosition[2], treePosition[2], t)
        );

        // Gentle Sway
        if (t > 0.8) {
            dummy.rotation.set(
                rotation[0] + Math.sin(time + treePosition[1]) * 0.05,
                rotation[1],
                rotation[2] + Math.cos(time + treePosition[1]) * 0.05
            );
        } else {
            dummy.rotation.set(time, time, time); // Spin when scattered
        }

        dummy.scale.setScalar(scale);

        dummy.updateMatrix();
        needlesRef.current!.setMatrixAt(i, dummy.matrix);
      });
      needlesRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Update Ribbon ---
    if (ribbonRef.current) {
        ribbonData.forEach((data, i) => {
            const { scatterPosition, treePosition } = data;
            
            // Ribbon flows
            const flowOffset = Math.sin(time * 2 + (i * 0.1)) * 0.05;

            dummy.position.set(
                THREE.MathUtils.lerp(scatterPosition[0], treePosition[0], t),
                THREE.MathUtils.lerp(scatterPosition[1], treePosition[1] + flowOffset, t),
                THREE.MathUtils.lerp(scatterPosition[2], treePosition[2], t)
            );
            
            // Ribbon particles look like glowing dust
            const scale = t > 0.1 ? (Math.sin(time * 5 + i) * 0.2 + 0.8) : 0.5;
            dummy.scale.setScalar(scale * 0.8);
            dummy.lookAt(0,0,0);
            
            dummy.updateMatrix();
            ribbonRef.current!.setMatrixAt(i, dummy.matrix);
        });
        ribbonRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Update Ornaments ---
    const updateOrnaments = (ref: any, dataSet: any[]) => {
        if (ref.current) {
            dataSet.forEach((data, i) => {
                const { scatterPosition, treePosition, scale, phase } = data;
                dummy.position.set(
                    THREE.MathUtils.lerp(scatterPosition[0], treePosition[0], t),
                    THREE.MathUtils.lerp(scatterPosition[1], treePosition[1], t),
                    THREE.MathUtils.lerp(scatterPosition[2], treePosition[2], t)
                );
                dummy.rotation.set(time * 0.5, phase, 0);
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                ref.current!.setMatrixAt(i, dummy.matrix);
            });
            ref.current.instanceMatrix.needsUpdate = true;
        }
    };

    updateOrnaments(goldOrnamentsRef, goldData);
    updateOrnaments(redOrnamentsRef, redData);

    // --- Update Lights (Blinking) ---
    if (lightsRef.current) {
        lightsData.forEach((data, i) => {
             const { scatterPosition, treePosition, phase } = data;
             dummy.position.set(
                THREE.MathUtils.lerp(scatterPosition[0], treePosition[0], t),
                THREE.MathUtils.lerp(scatterPosition[1], treePosition[1], t),
                THREE.MathUtils.lerp(scatterPosition[2], treePosition[2], t)
             );
             // Twinkle
             const blink = Math.sin(time * 4 + phase) * 0.5 + 0.5;
             dummy.scale.setScalar(0.4 + blink * 0.4);
             dummy.updateMatrix();
             lightsRef.current!.setMatrixAt(i, dummy.matrix);
             
             // Warm/Cold shift
             lightsRef.current!.setColorAt(i, colorDummy.setHSL(0.12, 1.0, 0.5 + blink * 0.5));
        });
        lightsRef.current.instanceMatrix.needsUpdate = true;
        if (lightsRef.current.instanceColor) lightsRef.current.instanceColor.needsUpdate = true;
    }

    // --- Update Star ---
    if (starRef.current) {
        const startY = 20;
        const endY = 5.2;
        starRef.current.position.y = THREE.MathUtils.lerp(startY, endY, t);
        starRef.current.position.x = 0;
        starRef.current.position.z = 0;
        starRef.current.scale.setScalar(THREE.MathUtils.lerp(0.1, 1.2, t));
        starRef.current.rotation.y = time * 0.5;
    }
  });

  return (
    <group>
      {/* 1. Lush Needles - Using very thin boxes or cones for pine needles */}
      <instancedMesh ref={needlesRef} args={[undefined, undefined, NEEDLE_COUNT]}>
        <coneGeometry args={[0.06, 0.6, 3]} /> 
        <meshStandardMaterial 
          color="#0d3b23" // Deeper Green
          roughness={0.7} 
          metalness={0.1}
        />
      </instancedMesh>

      {/* 2. The Ribbon - Glowing Gold Stream */}
      <instancedMesh ref={ribbonRef} args={[undefined, undefined, RIBBON_COUNT]}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 3. Gold Ornaments */}
      <instancedMesh ref={goldOrnamentsRef} args={[undefined, undefined, GOLD_ORNAMENT_COUNT]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color="#FFD700" 
          roughness={0.1} 
          metalness={1.0} 
          envMapIntensity={3}
        />
      </instancedMesh>

      {/* 4. Red Ornaments */}
      <instancedMesh ref={redOrnamentsRef} args={[undefined, undefined, RED_ORNAMENT_COUNT]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial 
          color="#8b0000" 
          roughness={0.2} 
          metalness={0.8}
          emissive="#550000"
          emissiveIntensity={0.2} 
        />
      </instancedMesh>

      {/* 5. Lights */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, LIGHTS_COUNT]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial 
          toneMapped={false}
          emissive="#FFFACD"
          emissiveIntensity={3}
          color="#FFFACD"
        />
      </instancedMesh>

      {/* 6. The Star */}
      <group ref={starRef}>
        <mesh>
             <octahedronGeometry args={[0.6, 0]} />
             <meshStandardMaterial 
                color="#FFFFFF"
                emissive="#FFF"
                emissiveIntensity={5}
                toneMapped={false}
             />
        </mesh>
        <pointLight intensity={3} distance={10} color="#ffddaa" decay={2} />
        {/* Glow halo */}
        <mesh scale={[1.5, 1.5, 1.5]}>
             <sphereGeometry args={[0.5, 16, 16]} />
             <meshBasicMaterial color="#FFD700" transparent opacity={0.3} />
        </mesh>
      </group>

    </group>
  );
};