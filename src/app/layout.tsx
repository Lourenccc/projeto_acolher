import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Acolher · Gestão de Consultórios (demonstração)',
    template: '%s · Acolher (demonstração)',
  },
  description: 'Interface de demonstração de um sistema de gestão de consultórios para psicólogos. Dados fictícios.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#277a73',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
