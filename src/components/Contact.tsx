import { useState, useEffect, useRef } from 'react';
import portfolio from '../data/portfolio.json';

export default function Contact() {
  const [visible, setVisible] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formState);
  };

  return (
    <section
      id="contact"
      ref={ref}
      aria-label="Contacto"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6rem 2rem',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '600px', width: '100%', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', letterSpacing: '0.3em', color: '#22d3ee', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Contacto
          </p>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, color: '#e2e8f0', marginBottom: '1rem' }}>
            {portfolio.contact.heading}
          </h2>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            {portfolio.contact.description}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em', color: '#cbd5e1', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {portfolio.contact.formLabels.name}
              </label>
              <input id="name" type="text" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} placeholder={portfolio.contact.formLabels.namePlaceholder} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(21, 21, 48, 0.6)', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(30, 41, 59, 0.5)'; }} />
            </div>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em', color: '#cbd5e1', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {portfolio.contact.formLabels.email}
              </label>
              <input id="email" type="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} placeholder={portfolio.contact.formLabels.emailPlaceholder} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(21, 21, 48, 0.6)', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(30, 41, 59, 0.5)'; }} />
            </div>
            <div>
              <label htmlFor="message" style={{ display: 'block', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em', color: '#cbd5e1', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {portfolio.contact.formLabels.message}
              </label>
              <textarea id="message" value={formState.message} onChange={(e) => setFormState({ ...formState, message: e.target.value })} placeholder={portfolio.contact.formLabels.messagePlaceholder} rows={5} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(21, 21, 48, 0.6)', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.3s ease', resize: 'vertical', minHeight: '120px' }} onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(30, 41, 59, 0.5)'; }} />
            </div>
            <button type="submit" style={{ padding: '1rem 2rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', borderRadius: '8px', fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)', marginTop: '0.5rem' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(124, 58, 237, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              {portfolio.contact.formLabels.submit}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '3rem' }}>
          {portfolio.social.map((social) => (
            <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" style={{ padding: '0.6rem 1.2rem', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem', textDecoration: 'none', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.5)'; e.currentTarget.style.color = '#cbd5e1'; }}>
              {social.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
