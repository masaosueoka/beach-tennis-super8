import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beach Tennis Super 8',
  description: 'Gerenciador de torneios Super 8 e circuitos de Beach Tennis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
