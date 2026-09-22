import { useState, useEffect, useRef } from 'react';
import portfolio from '../data/portfolio.json';

export default function Projects() {
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [glitching, setGlitching] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const projects = portfolio.projects;
  const project = projects[selectedIndex];

  const handleSelect = (index: number) => {
    if (index === selectedIndex) return;
    setGlitching(true);
    setTimeout(() => {
      setSelectedIndex(index);
      setTimeout(() => setGlitching(false), 300);
    }, 200);
  };

  return (
    <section
      id="projects"
      ref={ref}
      aria-label="Proyectos"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6rem 2rem',
        position: 'relative',
      }}
    >
      <div style={{
        maxWidth: '1300px',
        width: '100%',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', letterSpacing: '0.3em', color: '#22d3ee', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Proyectos
          </p>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, color: '#e2e8f0' }}>
            {portfolio.projectsHeading}
          </h2>
        </div>

        {/* 3-column layout: selector | visualization | info */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

          {/* LEFT: Project selector - spaceship cockpit style */}
          <div style={{
            background: 'rgba(10, 10, 26, 0.8)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '12px',
            padding: '1rem 0.75rem',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)' }} />
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
              Seleccion de misión
            </p>
            {projects.map((p, index) => {
              const isActive = selectedIndex === index;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(index)}
                  aria-pressed={isActive}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    background: isActive ? `${p.color}15` : 'transparent',
                    border: `1px solid ${isActive ? `${p.color}50` : 'rgba(30, 41, 59, 0.3)'}`,
                    borderRadius: '8px',
                    color: isActive ? '#e2e8f0' : '#64748b',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.65rem',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isActive ? p.color : '#334155',
                    boxShadow: isActive ? `0 0 8px ${p.color}` : 'none',
                    flexShrink: 0,
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </span>
                </button>
              );
            })}
            <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.15em' }}>
                {selectedIndex + 1} / {projects.length} MISIONES
              </span>
            </div>
          </div>

          {/* CENTER: Main visualization with scanlines */}
          <div style={{
            background: 'rgba(15, 15, 42, 0.8)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '450px',
          }}>
            {/* Top HUD bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: '#64748b', letterSpacing: '0.15em' }}>
                PROYECTO // {project.id}
              </span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: project.status === 'ACTIVO' ? '#22c55e' : '#64748b', letterSpacing: '0.1em' }}>
                {project.status}
              </span>
            </div>

            {/* Scanline overlay */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(124, 58, 237, 0.03) 2px, rgba(124, 58, 237, 0.03) 4px)',
              pointerEvents: 'none',
              zIndex: 2,
            }} />

            {/* Glitch transition overlay */}
            {glitching && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(6, 182, 212, 0.1) 3px, rgba(6, 182, 212, 0.1) 6px)',
                pointerEvents: 'none',
                zIndex: 10,
                animation: 'glitchFlicker 0.15s ease-in-out 2',
              }} />
            )}

            {/* Top gradient line */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${project.color}, #06b6d4, transparent)`,
              zIndex: 3,
            }} />

            {/* Content */}
            <div style={{
              padding: '2rem',
              position: 'relative',
              zIndex: 1,
              opacity: glitching ? 0.3 : 1,
              transition: 'opacity 0.15s',
            }}>
              {/* Project visual: image or ID placeholder */}
              <div style={{
                width: '100%',
                height: '200px',
                background: `linear-gradient(135deg, ${project.color}10, ${project.color}05)`,
                border: `1px solid ${project.color}20`,
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '12px',
                    }}
                  />
                ) : (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${project.color}05 10px, ${project.color}05 20px)`,
                    }} />
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      color: `${project.color}30`,
                      letterSpacing: '0.1em',
                    }}>
                      {project.id}
                    </span>
                  </>
                )}
              </div>

              <h3 style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: '0.75rem',
              }}>
                {project.title}
              </h3>

              <p style={{ color: '#cbd5e1', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                {project.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {project.tech.map((tech) => (
                  <span key={tech} style={{
                    padding: '0.35rem 0.8rem',
                    background: `${project.color}10`,
                    border: `1px solid ${project.color}30`,
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    color: '#a5b4fc',
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: '0.05em',
                  }}>
                    {tech}
                  </span>
                ))}
              </div>

              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '0.7rem 1.5rem',
                    background: `linear-gradient(135deg, ${project.color}, ${project.color}cc)`,
                    borderRadius: '8px',
                    color: 'white',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: `0 0 20px ${project.color}30`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 30px ${project.color}50`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 20px ${project.color}30`; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Ver Proyecto →
                </a>
              )}
            </div>

            {/* Bottom HUD decorations */}
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8].map((h, i) => (
                  <div key={i} style={{ width: '3px', height: `${h * 20}px`, background: `${project.color}60`, borderRadius: '1px' }} />
                ))}
              </div>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', color: '#475569', letterSpacing: '0.1em' }}>
                SYS.OK
              </span>
            </div>
          </div>

          {/* RIGHT: Info panel */}
          <div style={{
            background: 'rgba(10, 10, 26, 0.8)',
            border: '1px solid rgba(30, 41, 59, 0.4)',
            borderRadius: '12px',
            padding: '1.25rem',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)' }} />

            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Datos de la misión
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '8px' }}>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>
                  ESTADO
                </p>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', color: project.status === 'ACTIVO' ? '#22c55e' : '#a78bfa' }}>
                  {project.status}
                </p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '8px' }}>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>
                  AÑO
                </p>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {project.year}
                </p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '8px' }}>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>
                  TECNOLOGÍAS
                </p>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', color: '#22d3ee' }}>
                  {project.tech.length}-stack
                </p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '8px' }}>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>
                  ID MISION
                </p>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {project.id}
                </p>
              </div>
            </div>

            {/* Mini signal bars */}
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '8px' }}>
              <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: '#64748b', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                SEÑAL
              </p>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '20px' }}>
                {[0.3, 0.5, 0.7, 0.9, 1.0].map((h, i) => (
                  <div key={i} style={{
                    width: '4px',
                    height: `${h * 100}%`,
                    background: i < 3 ? '#22c55e' : '#475569',
                    borderRadius: '1px',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes glitchFlicker {
          0%, 100% { opacity: 1; transform: translateX(0); }
          25% { opacity: 0.8; transform: translateX(-2px); }
          50% { opacity: 0.4; transform: translateX(3px); }
          75% { opacity: 0.9; transform: translateX(-1px); }
        }
      `}</style>
    </section>
  );
}
