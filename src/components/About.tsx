import { useState, useEffect, useRef } from 'react';
import portfolio from '../data/portfolio.json';

export default function About() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={ref}
      aria-label="Sobre mi"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6rem 2rem',
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              width: '280px',
              height: '280px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #151530, #1e1e4a)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', width: '200px', height: '200px', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '50%', animation: 'spin 20s linear infinite' }} />
            <div style={{ position: 'absolute', width: '150px', height: '150px', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '50%', animation: 'spin 15s linear infinite reverse' }} />
            {portfolio.personal.avatar ? (
              <img
                src={portfolio.personal.avatar}
                alt={portfolio.personal.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '20px',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
            ) : (
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '4rem', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', position: 'relative', zIndex: 1 }}>
                {portfolio.personal.initials}
              </span>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', letterSpacing: '0.3em', color: '#22d3ee', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Sobre mi
          </p>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: '1.5rem', color: '#e2e8f0' }}>
            {portfolio.about.heading}
          </h2>
          <p style={{ color: '#cbd5e1', lineHeight: 1.8, marginBottom: '1.5rem', fontSize: '1rem' }}>
            {portfolio.personal.longDescription}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {portfolio.about.stats.map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.8rem', fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
