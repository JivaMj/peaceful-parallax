import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import portfolio from '../data/portfolio.json';

function FloatingGeometry() {
  const group = useRef<THREE.Group>(null);
  const mesh1 = useRef<THREE.Mesh>(null);
  const mesh2 = useRef<THREE.Mesh>(null);
  const mesh3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.1;
    }
    if (mesh1.current) {
      mesh1.current.rotation.x = t * 0.3;
      mesh1.current.rotation.z = t * 0.2;
      mesh1.current.position.y = Math.sin(t * 0.5) * 0.3;
    }
    if (mesh2.current) {
      mesh2.current.rotation.x = t * 0.2;
      mesh2.current.rotation.y = t * 0.3;
      mesh2.current.position.x = Math.sin(t * 0.3) * 0.5;
    }
    if (mesh3.current) {
      mesh3.current.rotation.z = t * 0.4;
      mesh3.current.position.y = Math.cos(t * 0.4) * 0.4;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={mesh1} position={[-2, 0.5, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#7c3aed" wireframe transparent opacity={0.6} />
      </mesh>
      <mesh ref={mesh2} position={[2, -0.5, -1]}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#06b6d4" wireframe transparent opacity={0.5} />
      </mesh>
      <mesh ref={mesh3} position={[0, 1.5, -2]}>
        <torusGeometry args={[0.3, 0.1, 16, 32]} />
        <meshStandardMaterial color="#a78bfa" wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default function Hero() {
  return (
    <section
      id="hero"
      aria-label="Hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '2rem',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.6} color="#7c3aed" />
          <pointLight position={[-5, -3, 3]} intensity={0.4} color="#06b6d4" />
          <FloatingGeometry />
        </Canvas>
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '800px' }}>
        <p
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.9rem',
            letterSpacing: '0.3em',
            color: '#22d3ee',
            marginBottom: '1rem',
            textTransform: 'uppercase',
          }}
        >
          {portfolio.hero.greeting}
        </p>
        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #e2e8f0 0%, #a78bfa 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {portfolio.personal.name}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: '#cbd5e1',
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}
        >
          {portfolio.personal.title}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="#projects"
            style={{
              padding: '0.85rem 2rem',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white',
              borderRadius: '8px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(124, 58, 237, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {portfolio.hero.cta}
          </a>
          <a
            href="#contact"
            style={{
              padding: '0.85rem 2rem',
              border: '1px solid #7c3aed',
              color: '#a78bfa',
              borderRadius: '8px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {portfolio.hero.ctaSecondary}
          </a>
        </div>
      </div>

     

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(0); }
          }
        }
      `}</style>
    </section>
  );
}
