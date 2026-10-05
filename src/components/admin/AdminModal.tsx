'use client';
import { useState, useMemo } from 'react';
import { AppData, Booking, DayKey, ScheduleBlock, ServiceItem } from '@/types';
import { ADMIN_PASSWORD, WEEK_DAYS } from '@/lib/constants';
import {
  addDaysISO,
  cleanPhone,
  formatDate,
  formatDateNumeric,
  formatPhone,
  money,
  todayISO,
  uid
} from '@/lib/scheduler';
import { makeFinancialPdf } from '@/lib/pdf';
import { openWhatsapp, whatsappMessage } from '@/lib/whatsapp';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
}

export default function AdminModal({
  isOpen,
  onClose,
  data,
  onUpdateData
}: AdminModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState<'dashboard' | 'agenda' | 'clients' | 'services' | 'finance' | 'config'>('dashboard');

  // Filtros Financeiros
  const [finStart, setFinStart] = useState(todayISO().slice(0, 8) + '01');
  const [finEnd, setFinEnd] = useState(todayISO());

  // Novo bloqueio
  const [blockStart, setBlockStart] = useState(todayISO());
  const [blockEnd, setBlockEnd] = useState(todayISO());
  const [blockTime, setBlockTime] = useState('12:00');
  const [blockDuration, setBlockDuration] = useState(60);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validPassword = data.settings.adminPassword || ADMIN_PASSWORD;
    if (password === validPassword) {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Senha incorreta. Tente novamente.');
    }
  };

  const handleStatusChange = (booking: Booking, newStatus: Booking['status']) => {
    const updatedBookings = {
      ...data.bookings,
      [booking.id]: {
        ...booking,
        status: newStatus,
        updatedAt: new Date().toISOString()
      }
    };
    onUpdateData({ ...data, bookings: updatedBookings });

    if (newStatus === 'confirmed') {
      openWhatsapp(booking.phone, whatsappMessage(booking, 'confirmed', data.settings));
    } else if (newStatus === 'cancelled') {
      openWhatsapp(booking.phone, whatsappMessage(booking, 'cancelled', data.settings));
    }
  };

  const handleDeleteBooking = (id: string) => {
    if (!confirm('Deseja excluir este agendamento definitivamente?')) return;
    const { [id]: _, ...rest } = data.bookings;
    onUpdateData({ ...data, bookings: rest });
  };

  const handleAddBlock = () => {
    if (!blockStart || !blockEnd || !blockTime) {
      alert('Informe o período e o horário para o bloqueio');
      return;
    }
    const id = uid();
    const newBlock: ScheduleBlock = {
      id,
      startDate: blockStart,
      endDate: blockEnd,
      time: blockTime,
      duration: blockDuration
    };
    onUpdateData({ ...data, blocks: { ...data.blocks, [id]: newBlock } });
    alert('Horário bloqueado com sucesso');
  };

  const handleDeleteBlock = (id: string) => {
    const { [id]: _, ...rest } = data.blocks;
    onUpdateData({ ...data, blocks: rest });
  };

  // Cálculos do Dashboard
  const activeBookings = Object.values(data.bookings).filter(b => b.status !== 'cancelled');
  const todayBookings = Object.values(data.bookings).filter(b => b.date === todayISO());
  const completedMonth = Object.values(data.bookings).filter(
    b => b.status === 'completed' && b.date.startsWith(todayISO().slice(0, 7))
  );
  const totalRevenueMonth = completedMonth.reduce((acc, b) => acc + Number(b.price || 0), 0);

  // Relatório financeiro
  const financialFiltered = Object.values(data.bookings).filter(
    b => b.status === 'completed' && b.date >= finStart && b.date <= finEnd
  );
  const finTotal = financialFiltered.reduce((acc, b) => acc + Number(b.price || 0), 0);

  const handleDownloadPdf = () => {
    const blob = makeFinancialPdf(financialFiltered, finStart, finEnd, data.settings.brand);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${finStart}-a-${finEnd}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Gestão de clientes únicos
  const clientsMap: Record<string, { name: string; phone: string; count: number; lastDate: string }> = {};
  Object.values(data.bookings).forEach(b => {
    const key = cleanPhone(b.phone);
    if (!clientsMap[key]) {
      clientsMap[key] = { name: b.name, phone: b.phone, count: 0, lastDate: b.date };
    }
    clientsMap[key].count++;
    if (b.date > clientsMap[key].lastDate) {
      clientsMap[key].lastDate = b.date;
    }
  });

  return (
    <div className="overlay open" role="dialog" aria-modal="true">
      {!isAuthenticated ? (
        <div className="modal" style={{ width: 'min(430px, 100%)' }}>
          <div className="modal-head">
            <h2>Acesso restrito</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              ×
            </button>
          </div>
          <form className="admin-login" onSubmit={handleLogin}>
            <div className="brand-mark logo-image" />
            <h2>Área do Barbeiro</h2>
            <p>Gerencie seus atendimentos, horários e financeiro.</p>
            <input
              type="password"
              className="input"
              placeholder="Senha de acesso"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {errorMsg && <div className="error">{errorMsg}</div>}
            <button
              type="submit"
              className="btn btn-dark"
              style={{ width: '100%', marginTop: '16px' }}
            >
              Entrar no painel
            </button>
          </form>
        </div>
      ) : (
        <div className="admin-shell">
          <aside className="admin-side">
            <div className="brand">
              <span className="brand-mark logo-image" />
              <span>{data.settings.brand}</span>
            </div>
            <nav className="admin-menu">
              <button
                className={view === 'dashboard' ? 'active' : ''}
                onClick={() => setView('dashboard')}
              >
                📊 <span>Visão geral</span>
              </button>
              <button
                className={view === 'agenda' ? 'active' : ''}
                onClick={() => setView('agenda')}
              >
                📅 <span>Agenda</span>
              </button>
              <button
                className={view === 'clients' ? 'active' : ''}
                onClick={() => setView('clients')}
              >
                👥 <span>Clientes</span>
              </button>
              <button
                className={view === 'services' ? 'active' : ''}
                onClick={() => setView('services')}
              >
                ✂️ <span>Serviços</span>
              </button>
              <button
                className={view === 'finance' ? 'active' : ''}
                onClick={() => setView('finance')}
              >
                💰 <span>Financeiro</span>
              </button>
              <button
                className={view === 'config' ? 'active' : ''}
                onClick={() => setView('config')}
              >
                ⚙️ <span>Configurações</span>
              </button>
            </nav>
            <button className="btn btn-ghost logout" onClick={onClose}>
              Sair do painel
            </button>
          </aside>

          <main className="admin-main">
            <div className="admin-top">
              <h2>
                {view === 'dashboard' && 'Visão geral'}
                {view === 'agenda' && 'Controle de Agenda'}
                {view === 'clients' && 'Histórico de Clientes'}
                {view === 'services' && 'Cardápio de Serviços'}
                {view === 'finance' && 'Fechamento Financeiro'}
                {view === 'config' && 'Configurações e WhatsApp'}
              </h2>
              <button className="icon-btn" onClick={onClose} aria-label="Fechar">
                ×
              </button>
            </div>

            {view === 'dashboard' && (
              <>
                <div className="metric-grid">
                  <div className="metric">
                    <small>Agendamentos hoje</small>
                    <strong>{todayBookings.length}</strong>
                  </div>
                  <div className="metric">
                    <small>Ativos na fila</small>
                    <strong>{activeBookings.length}</strong>
                  </div>
                  <div className="metric">
                    <small>Concluídos no mês</small>
                    <strong>{completedMonth.length}</strong>
                  </div>
                  <div className="metric">
                    <small>Faturamento do mês</small>
                    <strong>{money(totalRevenueMonth)}</strong>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>Atendimentos de hoje ({formatDateNumeric(todayISO())})</h3>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Serviço</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayBookings.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="empty">
                              Nenhum atendimento marcado para hoje.
                            </td>
                          </tr>
                        ) : (
                          todayBookings.map(b => (
                            <tr key={b.id}>
                              <td><b>{b.time}</b></td>
                              <td>
                                {b.name}<br />
                                <small style={{ color: 'var(--muted)' }}>{formatPhone(b.phone)}</small>
                              </td>
                              <td>{b.serviceName} ({money(b.price)})</td>
                              <td><span className={`status ${b.status}`}>{b.status}</span></td>
                              <td>
                                <div className="table-actions">
                                  {b.status === 'confirmed' && (
                                    <button
                                      className="mini ok"
                                      onClick={() => handleStatusChange(b, 'completed')}
                                    >
                                      Concluir
                                    </button>
                                  )}
                                  {b.status !== 'cancelled' && (
                                    <button
                                      className="mini no"
                                      onClick={() => handleStatusChange(b, 'cancelled')}
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                  <button
                                    className="mini"
                                    onClick={() => handleDeleteBooking(b.id)}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {view === 'clients' && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Base de Clientes Cadastrados</h3>
                  <span className="status">Conformidade LGPD</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>WhatsApp</th>
                        <th>Atendimentos</th>
                        <th>Última Visita</th>
                        <th>Privacidade (LGPD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(clientsMap).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty">Nenhum cliente registrado ainda.</td>
                        </tr>
                      ) : (
                        Object.entries(clientsMap).map(([rawPhone, c]) => (
                          <tr key={rawPhone}>
                            <td><b>{c.name}</b></td>
                            <td>{formatPhone(c.phone)}</td>
                            <td>{c.count} visita(s)</td>
                            <td>{formatDateNumeric(c.lastDate)}</td>
                            <td>
                              <button
                                className="mini no"
                                onClick={() => {
                                  if (!confirm(`Excluir definitivamente todos os dados e histórico de ${c.name}? Essa ação atende ao Direito ao Esquecimento da LGPD.`)) return;
                                  const updatedBookings = { ...data.bookings };
                                  Object.keys(updatedBookings).forEach(id => {
                                    if (cleanPhone(updatedBookings[id].phone) === rawPhone) {
                                      delete updatedBookings[id];
                                    }
                                  });
                                  onUpdateData({ ...data, bookings: updatedBookings });
                                  alert('Dados do cliente excluídos permanentemente.');
                                }}
                              >
                                Excluir dados (LGPD)
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'agenda' && (
              <>
                <div className="panel">
                  <div className="panel-head">
                    <h3>Bloquear horário específico (Pausa / Férias / Almoço)</h3>
                  </div>
                  <div style={{ padding: '18px' }} className="form-grid">
                    <div className="field">
                      <label>Data início</label>
                      <input
                        className="input"
                        type="date"
                        value={blockStart}
                        onChange={e => setBlockStart(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Data fim</label>
                      <input
                        className="input"
                        type="date"
                        value={blockEnd}
                        onChange={e => setBlockEnd(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Horário</label>
                      <input
                        className="input"
                        type="time"
                        value={blockTime}
                        onChange={e => setBlockTime(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Duração (minutos)</label>
                      <input
                        className="input"
                        type="number"
                        step="15"
                        value={blockDuration}
                        onChange={e => setBlockDuration(Number(e.target.value))}
                      />
                    </div>
                    <div className="field full">
                      <button className="btn btn-dark" onClick={handleAddBlock}>
                        Adicionar bloqueio de horário
                      </button>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>Bloqueios ativos</h3>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Período</th>
                          <th>Hora</th>
                          <th>Duração</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(data.blocks).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="empty">
                              Nenhum bloqueio cadastrado.
                            </td>
                          </tr>
                        ) : (
                          Object.values(data.blocks).map(bl => (
                            <tr key={bl.id}>
                              <td>{formatDateNumeric(bl.startDate || bl.date || '')} a {formatDateNumeric(bl.endDate || bl.date || '')}</td>
                              <td>{bl.time}</td>
                              <td>{bl.duration} min</td>
                              <td>
                                <button className="mini no" onClick={() => handleDeleteBlock(bl.id)}>
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {view === 'finance' && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Faturamento e Relatório</h3>
                  <button className="btn btn-copper" onClick={handleDownloadPdf}>
                    Baixar Relatório em PDF
                  </button>
                </div>
                <div className="finance-filter">
                  <div className="field">
                    <label>Data inicial</label>
                    <input
                      className="input"
                      type="date"
                      value={finStart}
                      onChange={e => setFinStart(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Data final</label>
                    <input
                      className="input"
                      type="date"
                      value={finEnd}
                      onChange={e => setFinEnd(e.target.value)}
                    />
                  </div>
                  <div style={{ paddingBottom: '10px' }}>
                    <small>Faturamento no período</small>
                    <strong style={{ display: 'block', fontSize: '1.4rem' }}>{money(finTotal)}</strong>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Cliente</th>
                        <th>Serviço</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty">
                            Nenhum atendimento concluído neste período.
                          </td>
                        </tr>
                      ) : (
                        financialFiltered.map(b => (
                          <tr key={b.id}>
                            <td>{formatDateNumeric(b.date)}</td>
                            <td>{b.time}</td>
                            <td>{b.name}</td>
                            <td>{b.serviceName}</td>
                            <td><b>{money(b.price)}</b></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'config' && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Segurança e Senha de Acesso</h3>
                </div>
                <div style={{ padding: '18px' }} className="form-grid">
                  <div className="field full">
                    <label>Senha do Painel Administrativo</label>
                    <input
                      className="input"
                      type="password"
                      value={data.settings.adminPassword || ADMIN_PASSWORD}
                      onChange={e =>
                        onUpdateData({
                          ...data,
                          settings: { ...data.settings, adminPassword: e.target.value.trim() }
                        })
                      }
                      placeholder="Defina uma senha segura"
                    />
                    <small style={{ color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                      Essa é a senha que você usa para entrar neste painel de gestão.
                    </small>
                  </div>
                </div>

                <div className="panel-head" style={{ borderTop: '1px solid var(--line)' }}>
                  <h3>Automação de WhatsApp (Evolution API)</h3>
                  <span className="status">100% Automático</span>
                </div>
                <div style={{ padding: '18px' }} className="form-grid">
                  <div className="field full">
                    <label>URL da Evolution API</label>
                    <input
                      className="input"
                      value={data.settings.evolutionApiUrl || ''}
                      onChange={e =>
                        onUpdateData({
                          ...data,
                          settings: { ...data.settings, evolutionApiUrl: e.target.value.trim() }
                        })
                      }
                      placeholder="https://sua-evolution-api.onrender.com"
                    />
                  </div>
                  <div className="field">
                    <label>Nome da Instância</label>
                    <input
                      className="input"
                      value={data.settings.evolutionInstance || ''}
                      onChange={e =>
                        onUpdateData({
                          ...data,
                          settings: { ...data.settings, evolutionInstance: e.target.value.trim() }
                        })
                      }
                      placeholder="Barbearia"
                    />
                  </div>
                  <div className="field">
                    <label>Chave de API (apikey)</label>
                    <input
                      className="input"
                      type="password"
                      value={data.settings.evolutionApiKey || ''}
                      onChange={e =>
                        onUpdateData({
                          ...data,
                          settings: { ...data.settings, evolutionApiKey: e.target.value.trim() }
                        })
                      }
                      placeholder="Sua Chave API"
                    />
                  </div>
                  <div className="field full">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={data.settings.autoSendWhatsApp}
                        onChange={e =>
                          onUpdateData({
                            ...data,
                            settings: { ...data.settings, autoSendWhatsApp: e.target.checked }
                          })
                        }
                      />
                      Ativar envio 100% automático (sem precisar abrir o app do WhatsApp)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
