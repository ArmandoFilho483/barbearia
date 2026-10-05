'use client';
import { cleanPhone } from '@/lib/scheduler';
import { openWhatsapp } from '@/lib/whatsapp';
import { AppSettings } from '@/types';

interface HeroProps {
  settings: AppSettings;
  onOpenBooking: () => void;
  nextAvailableText: string;
}

export default function Hero({ settings, onOpenBooking, nextAvailableText }: HeroProps) {
  const handleWhatsapp = () => {
    const n = cleanPhone(settings.whatsapp);
    if (!n) {
      alert('WhatsApp ainda não configurado no painel');
      return;
    }
    openWhatsapp(n, `Olá, gostaria de saber mais sobre a ${settings.brand}!`);
  };

  return (
    <section className="hero" id="inicio">
      <div>
        <div className="eyebrow">Desde 2020 · Estilo, precisão e confiança.</div>
        <h1>
          Seu estilo,<br />
          <em>nossa marca.</em>
        </h1>
        <p className="hero-copy">
          Escolha o serviço, encontre um horário livre e confirme em poucos passos. Um atendimento por vez, com técnica, memória e cuidado.
        </p>
        <div className="hero-actions">
          <button className="btn btn-copper" onClick={onOpenBooking}>
            Escolher meu horário →
          </button>
          <button className="btn btn-ghost" onClick={handleWhatsapp}>
            Falar no WhatsApp
          </button>
        </div>
        <div className="hero-note">
          <span /> Agenda atualizada em tempo real • sem ligações
        </div>
      </div>
      <div className="portrait" aria-label="Logomarca da Barbearia Emanuel Sousa">
        <div className="portrait-logo logo-image" role="img" aria-label="Barbearia Emanuel Sousa, desde 2020" />
        <div className="portrait-card">
          <div>
            <small>Próxima disponibilidade</small>
            <strong id="nextAvailability">{nextAvailableText}</strong>
          </div>
          <span className="open-pill">● Agenda aberta</span>
        </div>
      </div>
    </section>
  );
}
