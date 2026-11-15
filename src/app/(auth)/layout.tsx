import { GatewayFrame } from '@/components/gateway/shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatewayFrame>
      <div className="auth-wrap">{children}</div>
    </GatewayFrame>
  );
}
