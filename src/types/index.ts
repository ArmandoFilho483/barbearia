export type DayKey = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export interface SchedulePeriod {
  start: string;
  end: string;
}

export interface DaySchedule {
  closed: boolean;
  periods: SchedulePeriod[];
}

export interface ServiceItem {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  image?: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  notes?: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  confirmedAt?: string;
  updatedAt?: string;
  notifiedClient?: boolean;
  notifiedOwner?: boolean;
  lgpdConsent?: boolean;
}

export interface ScheduleBlock {
  id: string;
  startDate: string;
  endDate: string;
  time: string;
  duration: number;
  date?: string;
}

export interface AppSettings {
  brand: string;
  professional: string;
  address: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  confirmationObs: string;
  morningOpen: string;
  morningClose: string;
  afternoonOpen: string;
  afternoonClose: string;
  weeklyHours: Record<DayKey, DaySchedule>;
  interval: number;
  adminPassword?: string;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  autoSendWhatsApp: boolean;
}

export interface AppData {
  settings: AppSettings;
  services: Record<string, ServiceItem>;
  bookings: Record<string, Booking>;
  blocks: Record<string, ScheduleBlock>;
}

export interface TimeSlot {
  time: string;
  busy: boolean;
}
