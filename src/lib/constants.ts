import { AppData, DayKey } from '@/types';

export const ADMIN_PASSWORD = 'barbearia2026';
export const STORAGE_KEY = 'emanuelSousaBarbeariaDataV2';

export const WEEK_DAYS: { key: DayKey; label: string }[] = [
  { key: '0', label: 'Domingo' },
  { key: '1', label: 'Segunda-feira' },
  { key: '2', label: 'Terça-feira' },
  { key: '3', label: 'Quarta-feira' },
  { key: '4', label: 'Quinta-feira' },
  { key: '5', label: 'Sexta-feira' },
  { key: '6', label: 'Sábado' }
];

export const DEFAULT_WEEKLY_HOURS = Object.fromEntries(
  WEEK_DAYS.map(day => [
    day.key,
    {
      closed: day.key === '0' || day.key === '1',
      periods: [
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '19:00' }
      ]
    }
  ])
) as Record<DayKey, { closed: boolean; periods: { start: string; end: string }[] }>;

export const defaultData: AppData = {
  settings: {
    brand: 'Barbearia Emanuel Sousa',
    professional: 'Emanuel Pereira De Sousa',
    address: 'Rua do Estilo, 126 — Centro',
    hours: 'Ter–Sáb · 09h às 19h',
    whatsapp: '558591839556',
    instagram: '',
    confirmationObs: 'chegar 10 min antes do horário se não pode perder o seu horário!',
    morningOpen: '09:00',
    morningClose: '12:00',
    afternoonOpen: '13:00',
    afternoonClose: '19:00',
    weeklyHours: DEFAULT_WEEKLY_HOURS,
    interval: 30,
    adminPassword: 'barbearia2026',
    evolutionApiUrl: 'https://evolution-api-latest-delk.onrender.com',
    evolutionApiKey: 'Barbearia2026Api',
    evolutionInstance: 'Barbearia',
    autoSendWhatsApp: true
  },
  services: {
    corte: { id: 'corte', name: 'Corte masculino', duration: 40, price: 40, description: 'Tesoura, máquina e acabamento.' },
    combo: { id: 'combo', name: 'Corte + barba', duration: 60, price: 60, description: 'Experiência completa, do fio ao contorno.' },
    barba: { id: 'barba', name: 'Barba', duration: 30, price: 30, description: 'Desenho, toalha quente e finalização.' }
  },
  bookings: {},
  blocks: {}
};
