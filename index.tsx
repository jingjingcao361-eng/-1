import React, { useRef, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Float, 
  Sparkles, 
  ContactShadows,
  Text,
  Html,
  useTexture
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- Assets & Constants ---
const THEME = {
  emerald: "#003820",
  emeraldHighlight: "#005C35",
  gold: "#FFD700",
  goldDark: "#C5A000",
  bg: "#000502"
};

// --- Materials ---

// Luxurious Emerald Material
const EmeraldMaterial = () => (
  <meshPhysicalMaterial 
    color={THEME.emerald}
    emissive={THEME.emerald}
    emissiveIntensity={0.1}
    roughness={0.15}
    metalness={0.6}
    clearcoat={1}
    clearcoatRoughness={0.1}
    reflectivity={1}
    flatShading={false}
  />
);

// High Polish Gold Material
const GoldMaterial = () => (
  <meshStandardMaterial 
    color={THEME.gold}
    emissive="#ffaa00"
    emissiveIntensity={0.2}
    roughness={0.1}
    metalness={1}
  />
);

// --- Components ---

const Ribbon = ({ radiusBottom, radiusTop, height, turns = 3 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const steps = 100;
    // We want the ribbon to wrap outside the cone.
    // The cone has rBottom=1.8, rTop=0.1.
    // We add a small offset to ensure it floats above.
    const rOffset = 0.2; 
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Interpolate radius (Cone shape)
      const r = THREE.MathUtils.lerp(radiusBottom + rOffset, radiusTop + rOffset, t);
      
      // Angle: spiraling up
      const theta = t * Math.PI * 2 * turns;
      
      // Y position: centered vertically like the cone
      const y = (t - 0.5) * height;
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [radiusBottom, radiusTop, height, turns]);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate the ribbon slowly in reverse to the tree rotation for a "gliding" effect
      meshRef.current.rotation.y = -state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      <tubeGeometry args={[curve, 128, 0.03, 8, false]} />
      <GoldMaterial />
    </mesh>
  );
};

const Ornament = ({ position, scale = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Random slight rotation for glitter effect
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.z += 0.005;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[0.2, 0]} />
        <GoldMaterial />
      </mesh>
    </group>
  );
};

const TreeLayer = ({ position, scale, rotationSpeed = 0.2, layerIndex }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Counter-rotate layers for a magical floating mechanism feel
      const dir = layerIndex % 2 === 0 ? 1 : -1;
      groupRef.current.rotation.y += delta * rotationSpeed * dir * 0.5;
    }
  });

  // Calculate ornament positions in a spiral
  const ornaments = useMemo(() => {
    const items: React.ReactNode[] = [];
    const count = 6 + layerIndex * 2;
    const radius = 1.3; 
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Bobbing vertically slightly based on angle
      const y = -0.8 + Math.sin(angle * 3) * 0.2; 
      
      items.push(
        <Ornament 
          key={i} 
          position={[x, y, z]} 
          scale={0.6 + Math.random() * 0.4} 
        />
      );
    }
    return items;
  }, [layerIndex]);

  // Base cone dimensions for the ribbon to wrap around
  const coneDims = { rBottom: 1.8, rTop: 0.1, height: 2.5 };

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* The Foliage Cone - Stylized as a faceted crystal cone */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[coneDims.rTop, coneDims.rBottom, coneDims.height, 7]} />
        <EmeraldMaterial />
      </mesh>
      
      {/* Animated Gold Garland Ribbon */}
      <Ribbon 
        radiusBottom={coneDims.rBottom} 
        radiusTop={coneDims.rTop} 
        height={coneDims.height} 
      />

      {/* Gold Ring trim at bottom of layer */}
      <mesh position={[0, -1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.05, 16, 100]} />
        <GoldMaterial />
      </mesh>

      {/* Ornaments attached to this layer */}
      {ornaments}
    </group>
  );
};

const StarTopper = () => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.y = t * 0.5;
      ref.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    }
  });

  return (
    <group ref={ref} position={[0, 4.2, 0]}>
      {/* Central glowing core */}
      <mesh>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color={THEME.gold} />
      </mesh>
      {/* Radiating spikes */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial 
          color={THEME.gold} 
          emissive={THEME.gold} 
          emissiveIntensity={2} 
          transparent 
          opacity={0.8}
        />
      </mesh>
      <pointLight color={THEME.gold} intensity={5} distance={5} decay={2} />
    </group>
  );
};

const VolumetricBeam = () => {
  // A subtle light beam pointing down from the top
  return (
    <mesh position={[0, 2, 0]}>
      <cylinderGeometry args={[0.5, 5, 12, 32, 1, true]} />
      <meshBasicMaterial 
        color={THEME.gold} 
        transparent 
        opacity={0.03} 
        side={THREE.DoubleSide} 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

const BackgroundAmbience = () => {
  return (
    <>
      {/* Volumetric Fog to fade the floor into the background */}
      <fogExp2 attach="fog" args={[THEME.bg, 0.035]} />

      {/* Deep Background Shimmer - Dark Gold */}
      <Sparkles 
        count={300} 
        scale={[20, 15, 20]} 
        size={2} 
        speed={0.2} 
        opacity={0.2}
        color={THEME.goldDark} 
        position={[0, 5, -5]}
      />

      {/* Mid-range Floating Dust - Emerald Tint */}
      <Sparkles 
        count={150} 
        scale={[10, 10, 10]} 
        size={1} 
        speed={0.1} 
        opacity={0.3}
        color={THEME.emeraldHighlight}
        position={[0, 2, 0]}
      />
      
      {/* Light Beam Effect */}
      <VolumetricBeam />
    </>
  );
};

const ChristmasTree = () => {
  return (
    <group position={[0, -1, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        {/* Layer 1 (Bottom) */}
        <TreeLayer position={[0, 0, 0]} scale={[1.5, 1.2, 1.5]} layerIndex={3} />
        {/* Layer 2 */}
        <TreeLayer position={[0, 1.5, 0]} scale={[1.2, 1.2, 1.2]} layerIndex={2} />
        {/* Layer 3 */}
        <TreeLayer position={[0, 2.8, 0]} scale={[0.9, 1.2, 0.9]} layerIndex={1} />
        {/* Layer 4 (Top) */}
        <TreeLayer position={[0, 3.8, 0]} scale={[0.5, 1, 0.5]} layerIndex={0} />
        
        <StarTopper />
      </Float>
      
      {/* Base/Pot */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <cylinderGeometry args={[0.8, 1, 1, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
         <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
         <GoldMaterial />
      </mesh>
    </group>
  );
};

const Overlay = () => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '40px',
      boxSizing: 'border-box',
      color: THEME.gold,
      fontFamily: "'Playfair Display', serif",
      zIndex: 10
    }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.2em'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Arix</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Signature Collection</div>
      </header>

      <footer style={{ 
        textAlign: 'center',
        textShadow: `0 0 20px ${THEME.gold}`
      }}>
        <h1 style={{ 
          fontSize: '4rem', 
          margin: 0, 
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          background: `linear-gradient(to bottom, ${THEME.gold}, #aa8800)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Joyeux Noël
        </h1>
        <p style={{ 
          marginTop: '10px', 
          fontFamily: "'Cinzel', serif", 
          letterSpacing: '0.3em',
          fontSize: '0.9rem',
          opacity: 0.9 
        }}>
          The Interactive Experience
        </p>
      </footer>
    </div>
  );
};

const Experience = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={45} />
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={5}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.3}
      />

      {/* Lighting Setup */}
      <ambientLight intensity={0.2} />
      <spotLight 
        position={[10, 10, 10]} 
        angle={0.15} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        color="#fffaee"
      />
      <pointLight position={[-5, 5, -5]} intensity={1} color={THEME.emerald} />
      <pointLight position={[5, -2, 5]} intensity={1} color={THEME.gold} />

      {/* Environment Reflections */}
      <Environment preset="city" />

      {/* Background Atmosphere */}
      <BackgroundAmbience />

      {/* Main Object */}
      <ChristmasTree />

      {/* Foreground Magic */}
      <Sparkles 
        count={100} 
        scale={8} 
        size={4} 
        speed={0.4} 
        opacity={0.6} 
        color={THEME.gold} 
      />
      
      <ContactShadows 
        resolution={1024} 
        scale={20} 
        blur={2} 
        opacity={0.5} 
        far={10} 
        color="#000000" 
      />

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.4}
        />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const App = () => {
  return (
    <>
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ 
          antialias: false,
          toneMapping: THREE.ReinhardToneMapping,
          toneMappingExposure: 1.5
        }}
      >
        <color attach="background" args={[THEME.bg]} />
        <Experience />
      </Canvas>
      <Overlay />
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);