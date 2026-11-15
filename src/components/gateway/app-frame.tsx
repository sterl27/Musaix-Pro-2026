'use client';

import { usePathname } from 'next/navigation';
import { GlobalPlayer } from '@/components/audio/global-player';
import { isQuietRoute } from '@/lib/auth/paths';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const quiet = isQuietRoute(pathname);
  return (
    <>
      <div className={quiet ? undefined : 'audio-route-content'}>{children}</div>
      {quiet ? null : <GlobalPlayer />}
    </>
  );
}
