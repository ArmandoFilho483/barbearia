import { AppData, ScheduleBlock, TimeSlot } from '@/types';

export const money = (n: number) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const cleanPhone = (v?: string) => (v || '').replace(/\D/g, '');

export const phoneKey = (v?: string) => {
  const n = cleanPhone(v);
  return n.startsWith('55') && n.length >= 12 ? n.slice(2) : n;
};

export const whatsappPhone = (v?: string) => {
  const n = cleanPhone(v);
  return n.startsWith('55') ? n : `55${n}`;
};

export const formatPhone = (v?: string) => {
  const n = phoneKey(v);
  return n.length === 11
    ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
    : n.length === 10
    ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
    : cleanPhone(v);
};

export const maskPhone = (value: string) => {
  const n = phoneKey(value).slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
};

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });

export const formatDateNumeric = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');

export const addDaysISO = (date: string, days: number) => {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function timeToMinutes(time: string): number {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export function blockAppliesOnDate(block: ScheduleBlock, date: string): boolean {
  const start = block.startDate || block.date;
  const end = block.endDate || block.date || start;
  return Boolean(start && end && date >= start && date <= end);
}

export function scheduleForDate(date: string, data: AppData) {
  const dayIndex = String(new Date(date + 'T12:00:00').getDay()) as any;
  const dayKey = (dayIndex in data.settings.weeklyHours ? dayIndex : '1') as keyof typeof data.settings.weeklyHours;
  const schedule = data.settings.weeklyHours[dayKey];
  if (!schedule) return { closed: false, periods: [] };
  return schedule;
}

export function getSlots(date: string, duration: number, data: AppData): TimeSlot[] {
  const step = Number(data.settings.interval) || 30;
  const slotDuration = Math.max(1, Number(duration) || step);
  const booked = Object.values(data.bookings).filter(
    b => b.date === date && b.status !== 'cancelled'
  );
  const blocks = Object.values(data.blocks).filter(b => blockAppliesOnDate(b, date));
  const schedule = scheduleForDate(date, data);
  if (schedule.closed) return [];

  const periods = schedule.periods || [];
  const slots: TimeSlot[] = [];

  periods.forEach((period: any) => {
    if (!period) return;
    const start = Array.isArray(period) ? period[0] : period.start;
    const end = Array.isArray(period) ? period[1] : period.end;
    if (!start || !end) return;

    const periodStart = timeToMinutes(start);
    const periodEnd = timeToMinutes(end);

    for (let current = periodStart; current + slotDuration <= periodEnd; current += step) {
      const hh = String(Math.floor(current / 60)).padStart(2, '0');
      const mm = String(current % 60).padStart(2, '0');
      const time = `${hh}:${mm}`;
      const endCurrent = current + slotDuration;

      const isBooked = booked.some(b => {
        const startB = timeToMinutes(b.time);
        const endB = startB + (Number(b.duration) || step);
        return intervalsOverlap(current, endCurrent, startB, endB);
      });

      const isBlocked = blocks.some(bl => {
        const startBl = timeToMinutes(bl.time);
        const endBl = startBl + (Number(bl.duration) || step);
        return intervalsOverlap(current, endCurrent, startBl, endBl);
      });

      const now = new Date();
      const isPast =
        date === todayISO() &&
        current <= now.getHours() * 60 + now.getMinutes();

      slots.push({ time, busy: isBooked || isBlocked || isPast });
    }
  });

  return slots;
}
