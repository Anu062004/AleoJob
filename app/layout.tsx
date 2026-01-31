import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { WalletProvider } from '@/components/WalletProvider';
import { ConditionalBackground } from '@/components/ConditionalBackground';

export const metadata: Metadata = {
  title: 'AleoJob - Find Talent. Find Work. Build Reputation.',
  description: 'Privacy-preserving job marketplace built on Aleo blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <WalletProvider>
          <ConditionalBackground />
          <Header />
          <main className="relative">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}


