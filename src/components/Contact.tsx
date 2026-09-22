import { useState, useEffect, useRef } from 'react';
import portfolio from '../data/portfolio.json';

export default function Contact() {
  const [visible, setVisible] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(`https://formspree.io/f/${portfolio.contact.formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (res.ok) {
        setStatus('sent');
        setFormState({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const whatsappUrl = `https://wa.me/${portfolio.contact.whatsapp.phone}?text=${encodeURIComponent(portfolio.contact.whatsapp.message)}`;

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
        padding: '6rem 1.5rem',
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

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>&#10003;</div>
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#10b981', marginBottom: '0.5rem' }}>Mensaje Enviado</p>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Te responderé pronto</p>
            <button onClick={() => setStatus('idle')} style={{ marginTop: '1.5rem', padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid rgba(100, 116, 139, 0.4)', borderRadius: '8px', color: '#94a3b8', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              Enviar otro
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="name" style={{ display: 'block', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em', color: '#cbd5e1', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  {portfolio.contact.formLabels.name}
                </label>
                <input id="name" type="text" name="name" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} placeholder={portfolio.contact.formLabels.namePlaceholder} required style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(21, 21, 48, 0.6)', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(30, 41, 59, 0.5)'; }} />
              </div>
              <div>
                <label htmlFor="email" style={{ display: 'block', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em', color: '#cbd5e1', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  {portfolio.contact.formLabels.email}
                </label>
                <input id="email" type="email" name="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} placeholder={portfolio.contact.formLabels.emailPlaceholder} required style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(21, 21, 48, 0.6)', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(30, 41, 59, 0.5)'; }} />
              </div>
              <div>
                <label htmlFor="message" style={{ display: 'block', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em', color: '#cbd5e1', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  {portfolio.contact.formLabels.message}
                </label>
                <textarea id="message" name="message" value={formState.message} onChange={(e) => setFormState({ ...formState, message: e.target.value })} placeholder={portfolio.contact.formLabels.messagePlaceholder} rows={5} required style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(21, 21, 48, 0.6)', border: '1px solid rgba(30, 41, 59, 0.5)', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.3s ease', resize: 'vertical', minHeight: '120px' }} onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(30, 41, 59, 0.5)'; }} />
              </div>

              {status === 'error' && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', fontFamily: "'Orbitron', sans-serif" }}>Error al enviar. Intenta de nuevo.</p>
              )}

              <button type="submit" disabled={status === 'sending'} style={{ padding: '1rem 2rem', background: status === 'sending' ? '#475569' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', borderRadius: '8px', fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', letterSpacing: '0.05em', cursor: status === 'sending' ? 'wait' : 'pointer', transition: 'all 0.3s ease', boxShadow: status === 'sending' ? 'none' : '0 0 20px rgba(124, 58, 237, 0.3)', marginTop: '0.5rem' }} onMouseEnter={(e) => { if (status !== 'sending') { e.currentTarget.style.boxShadow = '0 0 30px rgba(124, 58, 237, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }} onMouseLeave={(e) => { if (status !== 'sending') { e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.3)'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                {status === 'sending' ? 'ENVIANDO...' : portfolio.contact.formLabels.submit}
              </button>
            </div>
          </form>
        )}

        {/* WhatsApp button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            marginTop: '1.5rem',
            padding: '0.85rem 1.5rem',
            background: 'rgba(37, 211, 102, 0.1)',
            border: '1px solid rgba(37, 211, 102, 0.3)',
            borderRadius: '8px',
            color: '#25d366',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.85rem',
            letterSpacing: '0.05em',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)'; e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)'; e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
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
