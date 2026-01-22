import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { WalletProvider } from '@/components/WalletProvider';

export const metadata: Metadata = {
  title: 'AleoJob - Private Jobs. Real Reputation. Zero Doxxing.',
  description: 'Privacy-preserving job marketplace built on Aleo blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <WalletProvider>
          <AnimatedBackground />
          <Header />
          <main className="relative">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}


