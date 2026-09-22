import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles() {
  const count = 500;
  const mesh = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mixRatio = Math.random();
      col[i * 3] = 0.486 * (1 - mixRatio) + 0.024 * mixRatio;
      col[i * 3 + 1] = 0.227 * (1 - mixRatio) + 0.714 * mixRatio;
      col[i * 3 + 2] = 0.929 * (1 - mixRatio) + 0.835 * mixRatio;
    }

    return [pos, col];
  }, []);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function Planet() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[3, -1, -5]}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a3e"
        emissive="#7c3aed"
        emissiveIntensity={0.15}
        roughness={0.7}
        metalness={0.3}
      />
      {/* Atmosphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshStandardMaterial
          color="#7c3aed"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Ring */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[2.2, 2.8, 64]} />
        <meshStandardMaterial
          color="#a78bfa"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </mesh>
  );
}

export default function StarField() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#7c3aed" />
        <pointLight position={[-10, -5, 5]} intensity={0.4} color="#06b6d4" />
        <Particles />
        <Planet />
      </Canvas>
    </div>
  );
}
