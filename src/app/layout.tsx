import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Barbearia Emanuel Sousa — Agendamento',
  description: 'Agendamento online da Barbearia Emanuel Sousa — estilo, precisão e confiança.',
  themeColor: '#15120f'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
