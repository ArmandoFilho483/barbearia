'use client';
import { AppSettings } from '@/types';

export default function Footer({ settings }: { settings: AppSettings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="brand">
        <span className="brand-mark logo-image" aria-hidden="true" />
        <span data-brand>{settings.brand}</span>
      </div>
      <small>
        Estilo • Precisão • Confiança. Atendimento individual com hora marcada. © {year}.
      </small>
    </footer>
  );
}
