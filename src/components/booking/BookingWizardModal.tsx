'use client';
import { useState, useMemo } from 'react';
import { AppData, Booking } from '@/types';
import {
  addDaysISO,
  cleanPhone,
  formatDate,
  formatPhone,
  getSlots,
  maskPhone,
  money,
  phoneKey,
  todayISO,
  uid
} from '@/lib/scheduler';
import {
  confirmationMessage,
  deliverBookingMessages,
  openWhatsapp,
  reminderMessage
} from '@/lib/whatsapp';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onBookingConfirmed: (newBooking: Booking) => void;
  initialServiceId?: string;
  onOpenClientView: (phone: string) => void;
}

export default function BookingWizardModal({
  isOpen,
  onClose,
  data,
  onBookingConfirmed,
  initialServiceId = '',
  onOpenClientView
}: BookingWizardModalProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({
    serviceId: initialServiceId || Object.keys(data.services)[0] || '',
    date: todayISO(),
    time: '',
    name: '',
    phone: '',
    notes: ''
  });
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Slots disponíveis para a data e serviço selecionados
  const selectedService = data.services[draft.serviceId];
  const availableSlots = useMemo(() => {
    if (!draft.date || !selectedService) return [];
    return getSlots(draft.date, selectedService.duration, data);
  }, [draft.date, draft.serviceId, data]);

  // Histórico de cliente recorrente pelo telefone digitado
  const returningClient = useMemo(() => {
    const key = phoneKey(draft.phone);
    if (key.length < 10) return null;
    const history = Object.values(data.bookings)
      .filter(b => phoneKey(b.phone) === key)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return history[0] || null;
  }, [draft.phone, data.bookings]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1) {
      if (!draft.serviceId) {
        alert('Escolha um serviço para continuar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!draft.date) {
        alert('Escolha a data do agendamento.');
        return;
      }
      if (!draft.time) {
        alert('Escolha um horário disponível para continuar.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!draft.name.trim() || cleanPhone(draft.phone).length < 10) {
        alert('Informe seu nome e um WhatsApp válido para confirmar.');
        return;
      }
      setStep(4);
    }
  };

  const handleConfirm = async () => {
    if (!selectedService) return;
    const currentSlots = getSlots(draft.date, selectedService.duration, data);
    const slot = currentSlots.find(s => s.time === draft.time);
    if (!slot || slot.busy) {
      alert('Este horário não está mais disponível. Por favor, escolha outro.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    const id = uid();
    const now = new Date().toISOString();
    const newBooking: Booking = {
      id,
      serviceId: draft.serviceId,
      serviceName: selectedService.name,
      date: draft.date,
      time: draft.time,
      name: draft.name.trim(),
      phone: cleanPhone(draft.phone),
      notes: draft.notes.trim(),
      duration: selectedService.duration,
      price: Number(selectedService.price),
      status: 'confirmed',
      createdAt: now,
      confirmedAt: now
    };

    const delivery = await deliverBookingMessages(newBooking, data.settings);
    newBooking.notifiedClient = delivery.client;
    newBooking.notifiedOwner = delivery.owner;

    setConfirmedBooking(newBooking);
    setDeliveryResult(delivery);
    onBookingConfirmed(newBooking);
    setIsSubmitting(false);
    setStep(5);
  };

  return (
    <div className="overlay open" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <h2>Agendar horário</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">
          {step < 5 && (
            <div className="steps">
              {[1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                />
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="wizard">
              <div className="step-label">Passo 1 de 4 · Escolha o serviço</div>
              <h3>Qual atendimento você procura hoje?</h3>
              <div className="choice-grid">
                {Object.values(data.services).map(s => {
                  const isSelected = draft.serviceId === s.id;
                  const hasPhoto = typeof s.image === 'string' && s.image.startsWith('data:image/');
                  return (
                    <button
                      key={s.id}
                      className={`choice ${isSelected ? 'selected' : ''}`}
                      onClick={() => setDraft(d => ({ ...d, serviceId: s.id }))}
                    >
                      {hasPhoto && (
                        <img
                          className="choice-photo"
                          src={s.image}
                          alt={s.name}
                          loading="lazy"
                        />
                      )}
                      <strong>{s.name}</strong>
                      <small>{s.duration} min • {s.description || 'Atendimento com horário marcado.'}</small>
                      <span className="price">{money(s.price)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="wizard-actions">
                <span />
                <button className="btn btn-dark" onClick={handleNext}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard">
              <div className="step-label">Passo 2 de 4 · Data e horário</div>
              <h3>Quando você quer ser atendido?</h3>
              <div className="form-grid">
                <div className="field">
                  <label>Data</label>
                  <input
                    className="input"
                    type="date"
                    min={todayISO()}
                    max={addDaysISO(todayISO(), 30)}
                    value={draft.date}
                    onChange={e => setDraft(d => ({ ...d, date: e.target.value, time: '' }))}
                  />
                </div>
                <div className="field">
                  <label>Serviço escolhido</label>
                  <div
                    style={{
                      padding: '13px 14px',
                      background: 'rgba(255,255,255,.55)',
                      borderRadius: '13px',
                      border: '1px solid var(--line)',
                      fontWeight: 700
                    }}
                  >
                    {selectedService?.name} ({selectedService?.duration} min)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '22px' }}>
                <label style={{ fontSize: '.78rem', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                  Horários disponíveis
                </label>
                {availableSlots.length === 0 ? (
                  <div className="empty">Nenhum horário livre nesta data. Tente outro dia.</div>
                ) : (
                  <div className="time-grid">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={slot.busy}
                        className={`time-slot ${draft.time === slot.time ? 'selected' : ''}`}
                        onClick={() => setDraft(d => ({ ...d, time: slot.time }))}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="wizard-actions">
                <button className="btn btn-ghost" onClick={() => setStep(1)}>
                  ← Voltar
                </button>
                <button className="btn btn-dark" onClick={handleNext}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard">
              <div className="step-label">Passo 3 de 4 · Seus dados</div>
              <h3>Para quem devemos reservar?</h3>
              <div className="form-grid">
                <div className="field">
                  <label>Nome completo</label>
                  <input
                    className="input"
                    placeholder="Seu nome"
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>WhatsApp com DDD</label>
                  <input
                    className="input"
                    placeholder="(11) 99999-9999"
                    value={draft.phone}
                    onChange={e => setDraft(d => ({ ...d, phone: maskPhone(e.target.value) }))}
                  />
                </div>
                <div className="field full">
                  <label>Preferências ou observações do corte</label>
                  <textarea
                    className="input"
                    placeholder="Ex.: degradê navalhado, aparar apenas o topo, desenhar a barba..."
                    value={draft.notes}
                    onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  />
                </div>

                {returningClient && (
                  <div className="returning-client">
                    <div>
                      <strong>Bem-vindo de volta!</strong>
                      <p>
                        Seu último corte foi <b>{returningClient.serviceName}</b> em{' '}
                        {formatDate(returningClient.date)}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mini ok"
                      onClick={() =>
                        setDraft(d => ({
                          ...d,
                          name: returningClient.name,
                          notes: returningClient.notes || d.notes
                        }))
                      }
                    >
                      Usar dados anteriores
                    </button>
                  </div>
                )}
              </div>

              <div className="wizard-actions">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>
                  ← Voltar
                </button>
                <button className="btn btn-dark" onClick={handleNext}>
                  Revisar resumo →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard">
              <div className="step-label">Passo 4 de 4 · Confirmação final</div>
              <h3>Tudo certo para a sua cadeira?</h3>
              <div className="summary-card">
                <div className="summary-item">
                  <small>Serviço</small>
                  <strong>{selectedService?.name}</strong>
                </div>
                <div className="summary-item">
                  <small>Data e hora</small>
                  <strong>
                    {formatDate(draft.date)}, às {draft.time}
                  </strong>
                </div>
                <div className="summary-item">
                  <small>Cliente</small>
                  <strong>{draft.name}</strong>
                  <span style={{ fontSize: '.84rem', color: '#cebdaa' }}>
                    {draft.phone}
                  </span>
                </div>
                <div className="summary-item">
                  <small>Valor estimado</small>
                  <strong>{money(selectedService?.price || 0)}</strong>
                </div>
                {draft.notes && (
                  <div className="summary-item" style={{ gridColumn: '1/-1' }}>
                    <small>Observações</small>
                    <p style={{ margin: '4px 0 0', color: '#cebdaa', fontSize: '.86rem' }}>
                      {draft.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="wizard-actions">
                <button className="btn btn-ghost" onClick={() => setStep(3)}>
                  ← Corrigir dados
                </button>
                <button
                  className="btn btn-copper"
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                >
                  {isSubmitting ? 'Confirmando...' : 'Confirmar agendamento'}
                </button>
              </div>
            </div>
          )}

          {step === 5 && confirmedBooking && (
            <div className="success-view">
              <div className="success-icon">✓</div>
              <h3>Agendamento confirmado!</h3>
              <p>
                Horário de{' '}
                <b>
                  {formatDate(confirmedBooking.date)}, às {confirmedBooking.time}
                </b>{' '}
                reservado. Sua confirmação está no padrão abaixo.
              </p>

              <p id="deliveryStatus" style={{ maxWidth: '570px', margin: '8px auto 0', color: 'var(--muted)', fontSize: '.84rem' }}>
                {deliveryResult?.automatic && deliveryResult.owner && deliveryResult.client ? (
                  <span>
                    ✅ <b>Confirmações enviadas automaticamente!</b> Tanto o barbeiro quanto você já receberam os detalhes no WhatsApp.
                  </span>
                ) : deliveryResult?.automatic && deliveryResult.owner ? (
                  <span>
                    ✅ Aviso enviado ao barbeiro automaticamente pelo WhatsApp. Você também pode salvar o lembrete abaixo.
                  </span>
                ) : deliveryResult?.error ? (
                  <span style={{ color: 'var(--copper)' }}>
                    ⚠️ O servidor de envio automático demorou ou está indisponível. Utilize os botões abaixo para enviar manualmente.
                  </span>
                ) : (
                  <span>
                    ✅ Aviso ao proprietário aberto no WhatsApp — toque em Enviar. Depois, salve o lembrete no seu WhatsApp.
                  </span>
                )}
              </p>

              <div className="whatsapp-bubble">
                {confirmationMessage(confirmedBooking, data.settings)}
              </div>

              <p style={{ maxWidth: '570px', margin: '14px auto 0', color: 'var(--muted)', fontSize: '.84rem' }}>
                Toque em <b>Salvar lembrete no meu WhatsApp</b>: seu WhatsApp abre no seu próprio número com o lembrete pronto — é só tocar em <b>Enviar</b> para confirmar.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '24px' }}>
                <button
                  className="btn btn-copper"
                  onClick={() => openWhatsapp(data.settings.whatsapp, confirmationMessage(confirmedBooking, data.settings))}
                >
                  Reabrir aviso ao proprietário
                </button>
                <button
                  className="btn btn-dark"
                  onClick={() => openWhatsapp(confirmedBooking.phone, reminderMessage(confirmedBooking, data.settings))}
                >
                  Salvar lembrete no meu WhatsApp
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(confirmationMessage(confirmedBooking, data.settings));
                    alert('Mensagem copiada para a área de transferência!');
                  }}
                >
                  Copiar mensagem
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    onClose();
                    onOpenClientView(confirmedBooking.phone);
                  }}
                >
                  Ver meu agendamento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
