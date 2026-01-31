'use client';

import { usePathname } from 'next/navigation';
import { AnimatedBackground } from './AnimatedBackground';

export function ConditionalBackground() {
  const pathname = usePathname();
  
  // Only show animated background on non-landing pages
  if (pathname === '/') {
    return null;
  }
  
  return <AnimatedBackground />;
}




