import { useState, useEffect, useRef } from 'react';
import portfolio from '../data/portfolio.json';

function getLevelBadge(level: number): { label: string; color: string } {
  if (level >= 90) return { label: 'MAESTRO', color: '#f59e0b' };
  if (level >= 80) return { label: 'EXPERTO', color: '#22c55e' };
  if (level >= 70) return { label: 'AVANZADO', color: '#06b6d4' };
  if (level >= 60) return { label: 'INTERMEDIO', color: '#8b5cf6' };
  return { label: 'APRENDIZ', color: '#64748b' };
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

export default function Skills() {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('frontend');
  const [animatedLevels, setAnimatedLevels] = useState<Record<string, number>>({});
  const ref = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const skillCategories = portfolio.skills.categories;
    const activeCat = skillCategories.find((c) => c.id === activeTab);
    if (!activeCat) return;

    const newLevels: Record<string, number> = {};
    activeCat.skills.forEach((skill) => { newLevels[skill.name] = 0; });
    setAnimatedLevels(newLevels);

    const timers = activeCat.skills.map((skill, i) =>
      setTimeout(() => {
        setAnimatedLevels((prev) => ({ ...prev, [skill.name]: skill.level }));
      }, 100 + i * 80)
    );

    return () => timers.forEach(clearTimeout);
  }, [activeTab, visible]);

  const skillCategories = portfolio.skills.categories;

  return (
    <section
      id="skills"
      ref={ref}
      aria-label="Habilidades"
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
        maxWidth: '950px',
        width: '100%',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', letterSpacing: '0.3em', color: '#22d3ee', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Habilidades
          </p>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, color: '#e2e8f0' }}>
            {portfolio.skillsHeading}
          </h2>
        </div>

        {/* RPG-style category tabs */}
        <div role="tablist" aria-label="Categorias de habilidades" style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '2rem',
          justifyContent: isMobile ? 'flex-start' : 'center',
          padding: '0.5rem',
          background: 'rgba(10, 10, 26, 0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(30, 41, 59, 0.4)',
          ...(isMobile ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } : {}),
        }}>
          {skillCategories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${cat.id}`}
                onClick={() => setActiveTab(cat.id)}
                style={{
                  padding: '0.65rem 1.3rem',
                  background: isActive ? `${cat.color}20` : 'transparent',
                  border: `1px solid ${isActive ? `${cat.color}60` : 'transparent'}`,
                  borderRadius: '8px',
                  color: isActive ? cat.color : '#64748b',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Skill panels */}
        {skillCategories.map((cat) => (
          <div
            key={cat.id}
            id={`panel-${cat.id}`}
            role="tabpanel"
            aria-labelledby={cat.id}
            hidden={activeTab !== cat.id}
            style={{
              display: activeTab === cat.id ? 'grid' : 'none',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: isMobile ? '0.75rem' : '1rem',
            }}
          >
            {cat.skills.map((skill, i) => {
              const badge = getLevelBadge(skill.level);
              const animLevel = animatedLevels[skill.name] ?? 0;
              return (
                <div
                  key={skill.name}
                  style={{
                    padding: '1.1rem 1.25rem',
                    background: 'rgba(15, 15, 42, 0.8)',
                    border: '1px solid rgba(30, 41, 59, 0.5)',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${i * 60}ms`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${cat.color}50`;
                    e.currentTarget.style.boxShadow = `0 0 20px ${cat.color}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.5)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Header row: icon + name + level badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${cat.color}15`,
                        border: `1px solid ${cat.color}30`,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontFamily: "'Orbitron', sans-serif",
                        color: cat.color,
                        overflow: 'hidden',
                      }}>
                        {skill.image ? (
                          <img src={skill.image} alt={skill.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          skill.icon
                        )}
                      </span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', color: '#e2e8f0' }}>
                        {skill.name}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '0.5rem',
                      color: badge.color,
                      background: `${badge.color}15`,
                      border: `1px solid ${badge.color}30`,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      letterSpacing: '0.1em',
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* EXP bar with shimmer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      flex: 1,
                      height: '6px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${animLevel}%`,
                        background: `linear-gradient(90deg, ${cat.color}, ${cat.color}cc)`,
                        borderRadius: '3px',
                        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                      }}>
                        {/* Shimmer effect */}
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          animation: 'shimmer 2s infinite',
                        }} />
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '0.65rem',
                      color: '#22d3ee',
                      minWidth: '2.5rem',
                      textAlign: 'right',
                    }}>
                      {skill.level}%
                    </span>
                  </div>

                  {/* XP label */}
                  <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', color: '#475569', letterSpacing: '0.1em' }}>
                      EXP: {skill.xp}
                    </span>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.5rem', color: '#475569', letterSpacing: '0.1em' }}>
                      LV.{Math.floor(skill.level / 10)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
