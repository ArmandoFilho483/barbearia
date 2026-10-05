'use client';
import { money } from '@/lib/scheduler';
import { ServiceItem } from '@/types';

interface ServicesGridProps {
  services: Record<string, ServiceItem>;
  onSelectService: (serviceId: string) => void;
}

export default function ServicesGrid({ services, onSelectService }: ServicesGridProps) {
  const serviceList = Object.values(services);

  return (
    <section className="section services" id="servicos">
      <div className="section-head">
        <div>
          <div className="eyebrow">Menu da cadeira</div>
          <h2>Serviços essenciais.</h2>
        </div>
        <p className="section-intro">
          Tempo reservado exclusivamente para você. Sem fila, sem correria e com o acabamento que faz diferença.
        </p>
      </div>
      <div className="service-grid" id="publicServices">
        {serviceList.map((s, idx) => {
          const hasImage = typeof s.image === 'string' && s.image.startsWith('data:image/');
          return (
            <article
              key={s.id}
              className={`service-card ${hasImage ? 'has-photo' : ''}`}
            >
              <div className="service-num">0{idx + 1}</div>
              {hasImage && (
                <img
                  className="service-photo"
                  src={s.image}
                  alt={`Foto do serviço ${s.name}`}
                  loading="lazy"
                />
              )}
              <h3>{s.name}</h3>
              <p>{s.description || 'Atendimento pontual com produtos selecionados.'}</p>
              <div className="service-meta">
                <span>{s.duration} min</span>
                <span>{money(s.price)}</span>
              </div>
              <button
                className="btn btn-dark"
                style={{ marginTop: '16px' }}
                onClick={() => onSelectService(s.id)}
              >
                Reservar este
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
