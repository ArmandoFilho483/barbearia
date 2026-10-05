'use client';
import { AppSettings } from '@/types';
import { cleanPhone } from '@/lib/scheduler';

interface TopbarProps {
  settings: AppSettings;
  onOpenBooking: () => void;
  onOpenClient: () => void;
  onOpenAdmin: () => void;
}

export default function Topbar({
  settings,
  onOpenBooking,
  onOpenClient,
  onOpenAdmin
}: TopbarProps) {
  const instagramHandle = (v?: string) => {
    const t = String(v || '').trim();
    if (!t) return '';
    return t
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .replace(/\/.*$/, '')
      .trim();
  };

  const insta = instagramHandle(settings.instagram);

  return (
    <header className="topbar">
      <a className="brand" href="#inicio">
        <span className="brand-mark logo-image" aria-hidden="true" />
        <span data-brand>{settings.brand}</span>
      </a>
      {insta && (
        <a
          className="insta-btn"
          id="instagramLink"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://instagram.com/${insta}`}
          aria-label="Instagram da empresa"
          title={`@${insta}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
          </svg>
        </a>
      )}
      <nav className="desktop-nav" aria-label="Navegação principal">
        <a href="#servicos">Serviços</a>
        <a href="#experiencia">Experiência</a>
        <a href="#local">Onde estamos</a>
      </nav>
      <div className="header-actions">
        <button className="btn btn-ghost" onClick={onOpenClient}>
          Meus horários
        </button>
        <button className="btn btn-dark" onClick={onOpenBooking}>
          Agendar
        </button>
        <button
          className="icon-btn"
          onClick={onOpenAdmin}
          aria-label="Área administrativa"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
