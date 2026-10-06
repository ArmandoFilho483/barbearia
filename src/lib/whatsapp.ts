import { AppSettings, Booking } from '@/types';
import { cleanPhone, formatDateNumeric, formatPhone, money, whatsappPhone } from './scheduler';

export function confirmationMessage(booking: Booking, settings: AppSettings): string {
  return `✅ Seu agendamento foi confirmado com sucesso!\n\n📍 Informações 👇\n\n📅 Data: ${formatDateNumeric(booking.date)}\n🕙 Hora: ${booking.time}\n✂️ Serviço: ${booking.serviceName}\n💈 Profissional: ${settings.professional}\n💰 Valor: ${money(booking.price)} Reais\nObs: ${settings.confirmationObs}`;
}

export function ownerMessage(booking: Booking): string {
  return `🔔 Novo agendamento confirmado!\n\n👤 Cliente: ${booking.name}\n📱 WhatsApp: ${formatPhone(booking.phone)}\n✂️ Serviço: ${booking.serviceName}\n📅 Data: ${formatDateNumeric(booking.date)}\n🕙 Hora: ${booking.time}\n💰 Valor: ${money(booking.price)}\n📝 Preferências: ${booking.notes || 'não informadas'}`;
}

export function reminderMessage(booking: Booking, settings: AppSettings): string {
  return `⏰ Lembrete do meu agendamento — ${settings.brand}\n\n📅 Data: ${formatDateNumeric(booking.date)}\n🕙 Hora: ${booking.time}\n✂️ Serviço: ${booking.serviceName}\n💈 Profissional: ${settings.professional}\n💰 Valor: ${money(booking.price)} Reais\n📍 Endereço: ${settings.address}\nObs: ${settings.confirmationObs}\n\n✅ Agendamento confirmado.`;
}

export function whatsappMessage(booking: Booking, type: 'confirmed' | 'cancelled', settings: AppSettings): string {
  const greeting = `Olá, ${booking.name.split(' ')[0]}!`;
  if (type === 'cancelled') {
    return `${greeting}\n\nSeu agendamento na ${settings.brand} foi cancelado.\n\n✂ Serviço: ${booking.serviceName}\n📅 Data: ${formatDateNumeric(booking.date)}\n🕒 Horário: ${booking.time}\n\nSe quiser marcar um novo horário, estamos à disposição.`;
  }
  return confirmationMessage(booking, settings);
}

export function openWhatsapp(phone: string, message: string): boolean {
  const n = whatsappPhone(phone);
  if (n.length < 12) return false;
  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }
  return true;
}

export async function sendEvolutionWhatsApp(phone: string, messageText: string, settings: AppSettings): Promise<boolean> {
  if (!settings.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstance) {
    throw new Error('Evolution API não configurada');
  }
  const rawNum = cleanPhone(phone);
  const number = rawNum.startsWith('55') ? rawNum : `55${rawNum}`;
  const url = `${settings.evolutionApiUrl}/message/sendText/${encodeURIComponent(settings.evolutionInstance)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout para tolerar despertar completo de servidor gratuito

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: settings.evolutionApiKey
      },
      body: JSON.stringify({
        number: number,
        text: messageText,
        textMessage: {
          text: messageText
        },
        delay: 1200,
        linkPreview: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Erro HTTP ${res.status}: ${errBody || res.statusText}`);
    }
    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Falha no disparo da Evolution API:', err);
    throw err;
  }
}

export async function deliverBookingMessages(booking: Booking, settings: AppSettings) {
  const result = { client: false, owner: false, automatic: false, error: null as string | null };
  const ownerPhone = cleanPhone(settings.whatsapp);
  const clientPhone = cleanPhone(booking.phone);

  if (settings.autoSendWhatsApp && settings.evolutionApiUrl && settings.evolutionApiKey && settings.evolutionInstance) {
    try {
      const promises = [];
      if (ownerPhone) {
        promises.push(sendEvolutionWhatsApp(ownerPhone, ownerMessage(booking), settings).then(() => { result.owner = true; }));
      }
      if (clientPhone) {
        promises.push(sendEvolutionWhatsApp(clientPhone, confirmationMessage(booking, settings), settings).then(() => { result.client = true; }));
      }
      await Promise.all(promises);
      result.automatic = true;
      return result;
    } catch (err: any) {
      result.error = err?.message || 'Servidor demorou a responder ou está indisponível';
      console.warn('Falha no envio automático, preparando contingência manual.', err);
    }
  }

  // Contingência Manual
  if (ownerPhone) {
    result.owner = openWhatsapp(ownerPhone, ownerMessage(booking));
  }
  return result;
}
