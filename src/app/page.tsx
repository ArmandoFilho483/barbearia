'use client';
import { useState, useEffect } from 'react';
import { AppData, Booking } from '@/types';
import { loadStoredData, saveStoredData } from '@/lib/storage';
import { subscribeToAppData } from '@/lib/firebase';
import { getSlots, todayISO } from '@/lib/scheduler';

import SplashScreen from '@/components/layout/SplashScreen';
import Topbar from '@/components/layout/Topbar';
import Hero from '@/components/layout/Hero';
import ServicesGrid from '@/components/layout/ServicesGrid';
import ExperienceAndLocation from '@/components/layout/ExperienceAndLocation';
import Footer from '@/components/layout/Footer';
import BookingWizardModal from '@/components/booking/BookingWizardModal';
import ClientBookingsModal from '@/components/client/ClientBookingsModal';
import AdminModal from '@/components/admin/AdminModal';

export default function HomePage() {
  const [data, setData] = useState<AppData | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [clientSearchPhone, setClientSearchPhone] = useState<string>('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    // 1. Carrega dados do cache local imediatamente
    setData(loadStoredData());

    // 2. Conecta em tempo real ao Firebase para escutar novas reservas ou alterações
    const unsubscribe = subscribeToAppData(remoteData => {
      setData(remoteData);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateData = (newData: AppData) => {
    setData(newData);
    saveStoredData(newData);
  };

  const handleBookingConfirmed = (newBooking: Booking) => {
    if (!data) return;
    const updated = {
      ...data,
      bookings: {
        ...data.bookings,
        [newBooking.id]: newBooking
      }
    };
    handleUpdateData(updated);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!data) return;
    const booking = data.bookings[bookingId];
    if (!booking) return;
    const updated = {
      ...data,
      bookings: {
        ...data.bookings,
        [bookingId]: {
          ...booking,
          status: 'cancelled' as const,
          updatedAt: new Date().toISOString()
        }
      }
    };
    handleUpdateData(updated);
  };

  if (!data) return null;

  // Próxima disponibilidade
  const today = todayISO();
  const firstService = Object.values(data.services)[0];
  const slotsToday = firstService ? getSlots(today, firstService.duration, data) : [];
  const nextSlot = slotsToday.find(s => !s.busy);
  const nextAvailableText = nextSlot ? `Hoje, ${nextSlot.time}` : 'Consulte datas disponíveis';

  return (
    <>
      <SplashScreen />
      <Topbar
        settings={data.settings}
        onOpenBooking={() => {
          setSelectedServiceId('');
          setIsBookingOpen(true);
        }}
        onOpenClient={() => {
          setClientSearchPhone('');
          setIsClientOpen(true);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />
      <main>
        <Hero
          settings={data.settings}
          nextAvailableText={nextAvailableText}
          onOpenBooking={() => {
            setSelectedServiceId('');
            setIsBookingOpen(true);
          }}
        />
        <ServicesGrid
          services={data.services}
          onSelectService={serviceId => {
            setSelectedServiceId(serviceId);
            setIsBookingOpen(true);
          }}
        />
        <ExperienceAndLocation
          settings={data.settings}
          onOpenBooking={() => {
            setSelectedServiceId('');
            setIsBookingOpen(true);
          }}
        />
      </main>
      <Footer settings={data.settings} />

      <BookingWizardModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        data={data}
        initialServiceId={selectedServiceId}
        onBookingConfirmed={handleBookingConfirmed}
        onOpenClientView={phone => {
          setClientSearchPhone(phone);
          setIsClientOpen(true);
        }}
      />

      <ClientBookingsModal
        isOpen={isClientOpen}
        onClose={() => setIsClientOpen(false)}
        data={data}
        initialPhone={clientSearchPhone}
        onCancelBooking={handleCancelBooking}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        data={data}
        onUpdateData={handleUpdateData}
      />
    </>
  );
}
