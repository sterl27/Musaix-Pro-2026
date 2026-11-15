import { ImageResponse } from 'next/og';

export const alt = 'Musaix Pro. AI is the instrument, never the hand.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          color: '#f6f1ea',
          padding: '72px'
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: '#ffb26f' }}>MUSAIX PRO</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, lineHeight: 0.95, maxWidth: 900 }}>
          <span>AI is the instrument.</span>
          <span style={{ color: '#ffb26f' }}>Never the hand.</span>
        </div>
        <div style={{ fontSize: 28, color: '#b3a79c' }}>The brief comes first. Artists write it. AI stays locked.</div>
      </div>
    ),
    { ...size }
  );
}
