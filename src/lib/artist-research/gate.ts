export class ResearchGate {
  private inFlight = 0;
  private hits = new Map<string, number[]>();

  constructor(
    private readonly options: {
      maxConcurrent: number;
      windowMs: number;
      maxPerWindow: number;
      now?: () => number;
    },
  ) {}

  tryEnter(key: string): { ok: true; leave: () => void } | { ok: false; retryAfterMs: number; reason: 'concurrent' | 'window' } {
    const now = this.options.now?.() ?? Date.now();
    const recent = (this.hits.get(key) ?? []).filter((stamp) => now - stamp < this.options.windowMs);
    if (recent.length >= this.options.maxPerWindow) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterMs: Math.max(1, this.options.windowMs - (now - recent[0])), reason: 'window' };
    }
    if (this.inFlight >= this.options.maxConcurrent) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterMs: 1000, reason: 'concurrent' };
    }
    recent.push(now);
    this.hits.set(key, recent);
    this.inFlight += 1;
    let left = false;
    return {
      ok: true,
      leave: () => {
        if (left) return;
        left = true;
        this.inFlight -= 1;
      },
    };
  }
}
