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
    notes: '',
    lgpdConsent: false
  });
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLgpdModal, setShowLgpdModal] = useState(false);

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
      if (!draft.lgpdConsent) {
        alert('É necessário concordar com o termo de tratamento de dados (LGPD) para prosseguir.');
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
      confirmedAt: now,
      lgpdConsent: draft.lgpdConsent
    };

    // Salva imediatamente para travar o horário e liberar o cliente
    onBookingConfirmed(newBooking);
    setConfirmedBooking(newBooking);
    setStep(5);
    setIsSubmitting(false);

    // Dispara a entrega de mensagens em segundo plano
    deliverBookingMessages(newBooking, data.settings).then(delivery => {
      setDeliveryResult(delivery);
    });
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

                <div className="field full" style={{ marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', cursor: 'pointer', fontSize: '.84rem' }}>
                    <input
                      type="checkbox"
                      style={{ marginTop: '3px' }}
                      checked={draft.lgpdConsent}
                      onChange={e => setDraft(d => ({ ...d, lgpdConsent: e.target.checked }))}
                    />
                    <span>
                      Concordo com o armazenamento do meu nome e telefone para fins exclusivos de confirmação e lembrete deste agendamento, conforme a{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowLgpdModal(true); }}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--sage)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
                      >
                        Lei Geral de Proteção de Dados (LGPD)
                      </button>.
                    </span>
                  </label>
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
                reservado com sucesso.
              </p>

              <div
                style={{
                  maxWidth: '560px',
                  margin: '18px auto',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'rgba(36, 88, 166, 0.09)',
                  border: '1px solid rgba(36, 88, 166, 0.25)',
                  textAlign: 'left',
                  color: 'var(--ink)'
                }}
              >
                <strong style={{ display: 'block', fontSize: '.95rem', color: 'var(--sage)', marginBottom: '5px' }}>
                  📱 Envio do Comprovante no WhatsApp
                </strong>
                <p style={{ margin: 0, fontSize: '.86rem', lineHeight: '1.5' }}>
                  Nosso sistema de envio é <b>100% automático</b>. Como nosso servidor processa com alta segurança, <b>sua mensagem de confirmação chegará no seu WhatsApp em até 2 minutos</b>. Fique atento às suas notificações!
                </p>
              </div>

              <div className="whatsapp-bubble">
                {confirmationMessage(confirmedBooking, data.settings)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '24px' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(confirmationMessage(confirmedBooking, data.settings));
                    alert('Mensagem copiada para a área de transferência!');
                  }}
                >
                  Copiar detalhes
                </button>
                <button
                  className="btn btn-dark"
                  onClick={() => {
                    onClose();
                    onOpenClientView(confirmedBooking.phone);
                  }}
                >
                  Ver meus agendamentos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLgpdModal && (
        <div className="overlay open" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: '580px', padding: '24px' }}>
            <div className="modal-head">
              <h2>Privacidade e Proteção de Dados (LGPD)</h2>
              <button className="icon-btn" onClick={() => setShowLgpdModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px 0', fontSize: '.88rem', lineHeight: '1.6', color: 'var(--muted)' }}>
              <p>Em conformidade com a Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais):</p>
              <ul>
                <li><b>Finalidade:</b> Seus dados (nome e WhatsApp) são coletados exclusivamente para a reserva de horário, identificação na barbearia e envio de lembretes.</li>
                <li><b>Segurança:</b> Seus dados não são vendidos, compartilhados ou utilizados para envio de spams ou propagandas não solicitadas.</li>
                <li><b>Direito ao Esquecimento:</b> Você pode solicitar a qualquer momento a exclusão definitiva do seu cadastro diretamente com a barbearia.</li>
              </ul>
            </div>
            <button className="btn btn-dark" style={{ width: '100%' }} onClick={() => setShowLgpdModal(false)}>
              Entendi e fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
