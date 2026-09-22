import { useState, useEffect } from 'react';
import portfolio from '../data/portfolio.json';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = portfolio.navigation.map((item) => item.href.substring(1));
      for (const section of [...sections].reverse()) {
        const el = document.getElementById(section);
        if (el && el.getBoundingClientRect().top <= 200) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      role="navigation"
      aria-label="Navegacion principal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(10, 10, 26, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(124, 58, 237, 0.2)' : 'none',
      }}
    >
      <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', padding: 0, margin: 0 }}>
        {portfolio.navigation.map((item) => {
          const isActive = activeSection === item.href.substring(1);
          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  color: isActive ? '#a78bfa' : '#cbd5e1',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.85rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s ease',
                  textDecoration: 'none',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? '#a78bfa' : '#cbd5e1'; }}
              >
                {item.label}
                {isActive && (
                  <span style={{ position: 'absolute', bottom: '-8px', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', borderRadius: '1px' }} />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
