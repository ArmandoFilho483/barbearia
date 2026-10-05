'use client';
import { AppSettings } from '@/types';

interface ExperienceAndLocationProps {
  settings: AppSettings;
  onOpenBooking: () => void;
}

export default function ExperienceAndLocation({
  settings,
  onOpenBooking
}: ExperienceAndLocationProps) {
  return (
    <section className="section" id="experiencia">
      <div className="section-head">
        <div>
          <div className="eyebrow">Experiência {settings.brand}</div>
          <h2>
            Ele lembra<br />
            do seu corte.
          </h2>
        </div>
        <p className="section-intro">
          Seu histórico e suas preferências ficam organizados para que cada retorno seja mais simples e consistente.
        </p>
      </div>
      <div className="experience-grid">
        <article className="feature">
          <div className="feature-icon">◷</div>
          <h3>Agendamento direto</h3>
          <p>Serviço, data, horário e confirmação em um fluxo curto, exibindo somente vagas disponíveis.</p>
        </article>
        <article className="feature">
          <div className="feature-icon">✦</div>
          <h3>Preferências registradas</h3>
          <p>Máquina, tesoura, degradê e observações do último atendimento ficam no histórico do cliente.</p>
        </article>
        <article className="feature">
          <div className="feature-icon">↻</div>
          <h3>Retorno sem esforço</h3>
          <p>Acesse seus horários pelo telefone, consulte visitas anteriores e agende novamente.</p>
        </article>
        <article className="feature">
          <div className="feature-icon">✓</div>
          <h3>Confirmação clara</h3>
          <p>Veja o resumo antes de confirmar e receba notificações automáticas diretamente no seu WhatsApp.</p>
        </article>
      </div>
      <div className="location-strip" id="local">
        <div>
          <small>Onde estamos</small>
          <strong id="addressText">{settings.address}</strong>
        </div>
        <div>
          <small>Horário</small>
          <b id="hoursText">{settings.hours}</b>
        </div>
        <button className="btn btn-light" onClick={onOpenBooking}>
          Reservar cadeira
        </button>
      </div>
    </section>
  );
}
