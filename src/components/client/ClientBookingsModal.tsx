'use client';
import { useState, useMemo } from 'react';
import { AppData, Booking } from '@/types';
import {
  cleanPhone,
  formatDate,
  formatPhone,
  maskPhone,
  money,
  phoneKey
} from '@/lib/scheduler';
import { openWhatsapp, whatsappMessage } from '@/lib/whatsapp';

interface ClientBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  initialPhone?: string;
  onCancelBooking: (bookingId: string) => void;
}

export default function ClientBookingsModal({
  isOpen,
  onClose,
  data,
  initialPhone = '',
  onCancelBooking
}: ClientBookingsModalProps) {
  const [phone, setPhone] = useState(initialPhone);

  const bookings = useMemo(() => {
    const key = phoneKey(phone);
    if (key.length < 10) return [];
    return Object.values(data.bookings)
      .filter(b => phoneKey(b.phone) === key)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [phone, data.bookings]);

  if (!isOpen) return null;

  const handleCancel = (booking: Booking) => {
    if (!confirm(`Deseja realmente cancelar seu horário de ${formatDate(booking.date)} às ${booking.time}?`)) {
      return;
    }
    onCancelBooking(booking.id);
    // Notifica o barbeiro do cancelamento via WhatsApp
    const msg = `Olá, gostaria de avisar que precisei cancelar meu agendamento de ${booking.serviceName} no dia ${formatDate(booking.date)} às ${booking.time}.`;
    openWhatsapp(data.settings.whatsapp, msg);
  };

  const statusLabel = (s: Booking['status']) => {
    switch (s) {
      case 'confirmed':
        return <span className="status confirmed">Confirmado</span>;
      case 'cancelled':
        return <span className="status cancelled">Cancelado</span>;
      case 'completed':
        return <span className="status">Concluído</span>;
      default:
        return <span className="status">Pendente</span>;
    }
  };

  return (
    <div className="overlay open" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <h2>Meus agendamentos</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="client-search">
            <input
              className="input"
              placeholder="Digite seu WhatsApp com DDD..."
              value={phone}
              onChange={e => setPhone(maskPhone(e.target.value))}
            />
          </div>

          {phoneKey(phone).length >= 10 && bookings.length > 0 && (
            <div className="client-profile">
              <div>
                <small>Cliente identificado</small>
                <strong>{bookings[0].name}</strong>
                <p>{formatPhone(bookings[0].phone)}</p>
              </div>
              <div className="client-count">
                <small>Visitas</small>
                <b>{bookings.length}</b>
              </div>
            </div>
          )}

          <div className="booking-list">
            {phoneKey(phone).length < 10 ? (
              <div className="empty">Digite seu número acima para localizar seus horários.</div>
            ) : bookings.length === 0 ? (
              <div className="empty">Nenhum agendamento encontrado para este número.</div>
            ) : (
              bookings.map(b => (
                <div key={b.id} className="booking-item">
                  <div className="date-box">
                    <strong>{b.time}</strong>
                    <small>{formatDate(b.date)}</small>
                  </div>
                  <div>
                    <h4>{b.serviceName}</h4>
                    <p>
                      {money(b.price)} • {b.duration} min
                    </p>
                    <div style={{ marginTop: '5px' }}>{statusLabel(b.status)}</div>
                  </div>
                  <div className="booking-actions">
                    {b.status === 'confirmed' && (
                      <button
                        className="mini no"
                        onClick={() => handleCancel(b)}
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      className="mini whatsapp"
                      onClick={() => openWhatsapp(data.settings.whatsapp, whatsappMessage(b, 'confirmed', data.settings))}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
