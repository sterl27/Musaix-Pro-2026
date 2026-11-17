'use client';

import { usePathname } from 'next/navigation';
import { GlobalPlayer } from '@/components/audio/global-player';
import { hidesGlobalPlayer } from '@/lib/auth/paths';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const quiet = hidesGlobalPlayer(pathname);
  return (
    <>
      <div className={quiet ? undefined : 'audio-route-content'}>{children}</div>
      {quiet ? null : <GlobalPlayer />}
    </>
  );
}
