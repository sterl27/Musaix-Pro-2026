"use client";

import { useMemo, useState } from "react";

const nodes = [
  { id: "intent", label: "Intent", group: "intake", x: 40, y: 52, status: "complete" },
  { id: "context", label: "Context", group: "memory", x: 205, y: 52, status: "complete" },
  { id: "plan", label: "Plan", group: "reason", x: 370, y: 52, status: "complete" },
  { id: "route", label: "Route", group: "reason", x: 535, y: 52, status: "active" },
  { id: "tools", label: "Tools", group: "execute", x: 700, y: 52, status: "queued" },
  { id: "verify", label: "Verify", group: "verify", x: 865, y: 52, status: "queued" },
  { id: "memory", label: "Memory", group: "memory", x: 1030, y: 52, status: "queued" },
];

const edges = nodes.slice(0, -1).map((node, index) => ({
  from: node,
  to: nodes[index + 1],
}));

const runs = [
  { id: "run-8f21", task: "Analyze stereo field", model: "auto", tools: 4, latency: "8.4s", status: "running" },
  { id: "run-8f20", task: "Generate mastering brief", model: "reasoning", tools: 3, latency: "12.1s", status: "complete" },
  { id: "run-8f19", task: "Index artist memory", model: "fast", tools: 2, latency: "2.8s", status: "complete" },
  { id: "run-8f18", task: "Render preview master", model: "local", tools: 5, latency: "31.6s", status: "failed" },
];

const health = [
  { name: "Hermes API", value: 99.98, state: "Live" },
  { name: "Audio worker", value: 98.7, state: "Live" },
  { name: "Supabase", value: 99.99, state: "Live" },
  { name: "OpenRouter", value: 99.4, state: "Degraded" },
];

const telemetry = [42, 48, 44, 57, 54, 66, 61, 73, 69, 78, 75, 84, 81, 88, 86, 92];

function Sparkline({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 220},${60 - (value / 100) * 52}`)
    .join(" ");

  return (
    <svg viewBox="0 0 220 60" role="img" aria-label="Execution throughput trend" className="h-16 w-full">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot status-${status}`} aria-hidden="true" />;
}

export default function ArchitecturePage() {
  const [selectedNode, setSelectedNode] = useState(nodes[3]);
  const [windowSize, setWindowSize] = useState("15m");

  const metrics = useMemo(
    () => [
      { label: "Active runs", value: "12", delta: "+3" },
      { label: "Tool success", value: "98.6%", delta: "+0.8" },
      { label: "Median latency", value: "8.4s", delta: "−1.2" },
      { label: "Cost / run", value: "$0.041", delta: "−7%" },
    ],
    [],
  );

  return (
    <main className="observatory-shell">
      <header className="observatory-header">
        <div>
          <p className="eyebrow">MUSAIX PRO / HERMES</p>
          <h1>Execution Observatory</h1>
          <p className="subtitle">Perception → reasoning → action → verification → adaptation</p>
        </div>
        <div className="header-actions">
          <div className="live-indicator"><span /> LIVE</div>
          <select value={windowSize} onChange={(event) => setWindowSize(event.target.value)} aria-label="Time window">
            <option value="15m">Last 15 min</option>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
          </select>
        </div>
      </header>

      <section className="metric-grid" aria-label="Execution metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.delta}</small>
          </article>
        ))}
      </section>

      <section className="primary-grid">
        <article className="panel graph-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CURRENT RUN</p>
              <h2>Hermes task graph</h2>
            </div>
            <span className="run-id">run-8f21</span>
          </div>

          <div className="graph-scroll" tabIndex={0} aria-label="Scrollable execution pipeline">
            <svg viewBox="0 0 1150 150" className="pipeline-graph" role="img" aria-label="Hermes execution nodes from intent through memory">
              {edges.map(({ from, to }) => (
                <line key={`${from.id}-${to.id}`} x1={from.x + 54} y1={from.y + 22} x2={to.x} y2={to.y + 22} className={`edge edge-${from.status}`} />
              ))}
              {nodes.map((node) => (
                <g
                  key={node.id}
                  className={`node node-${node.status} ${selectedNode.id === node.id ? "node-selected" : ""}`}
                  onClick={() => setSelectedNode(node)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedNode(node);
                  }}
                  aria-label={`${node.label}, ${node.status}`}
                >
                  <rect x={node.x} y={node.y} width="108" height="44" rx="8" />
                  <circle cx={node.x + 17} cy={node.y + 22} r="4" />
                  <text x={node.x + 31} y={node.y + 27}>{node.label}</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="node-inspector">
            <div>
              <span className="inspector-label">Selected stage</span>
              <strong>{selectedNode.label}</strong>
            </div>
            <div>
              <span className="inspector-label">Domain</span>
              <strong>{selectedNode.group}</strong>
            </div>
            <div>
              <span className="inspector-label">State</span>
              <strong className={`text-${selectedNode.status}`}>{selectedNode.status}</strong>
            </div>
            <div>
              <span className="inspector-label">Policy</span>
              <strong>{selectedNode.id === "tools" ? "Approval gated" : "Safe auto"}</strong>
            </div>
          </div>
        </article>

        <article className="panel throughput-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">THROUGHPUT</p>
              <h2>Execution load</h2>
            </div>
            <strong>92%</strong>
          </div>
          <div className="sparkline"><Sparkline values={telemetry} /></div>
          <dl className="compact-stats">
            <div><dt>Queued</dt><dd>7</dd></div>
            <div><dt>Running</dt><dd>12</dd></div>
            <div><dt>Blocked</dt><dd>2</dd></div>
            <div><dt>Completed</dt><dd>148</dd></div>
          </dl>
        </article>
      </section>

      <section className="secondary-grid">
        <article className="panel runs-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TRACE STREAM</p>
              <h2>Recent executions</h2>
            </div>
            <button type="button">View all</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Status</th><th>Task</th><th>Model</th><th>Tools</th><th>Latency</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td><StatusDot status={run.status} /><span className="sr-only">{run.status}</span></td>
                    <td><strong>{run.task}</strong><small>{run.id}</small></td>
                    <td>{run.model}</td>
                    <td>{run.tools}</td>
                    <td>{run.latency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel health-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SYSTEMS</p>
              <h2>Service health</h2>
            </div>
          </div>
          <div className="health-list">
            {health.map((service) => (
              <div className="health-row" key={service.name}>
                <div><strong>{service.name}</strong><small>{service.state}</small></div>
                <div className="health-track" aria-label={`${service.name} ${service.value}% healthy`}><span style={{ width: `${service.value}%` }} /></div>
                <b>{service.value}%</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(body) { background: #05070c; }
        .observatory-shell { min-height: 100vh; padding: 28px; color: rgba(255,255,255,.92); background: radial-gradient(circle at 80% -10%, rgba(123,47,255,.12), transparent 34%), #05070c; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .observatory-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; max-width: 1480px; margin: 0 auto 24px; }
        h1 { margin: 4px 0 6px; font-family: Arial, Helvetica, sans-serif; font-size: clamp(2rem, 4vw, 4.5rem); letter-spacing: -.055em; line-height: .95; }
        h2 { margin: 3px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 1.05rem; letter-spacing: -.02em; }
        .eyebrow { margin: 0; color: #00ffc8; font-size: .68rem; letter-spacing: .18em; }
        .subtitle { margin: 0; color: rgba(255,255,255,.42); font-size: .78rem; }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .header-actions select, .panel-heading button { border: 1px solid rgba(255,255,255,.09); background: #0d1017; color: rgba(255,255,255,.7); border-radius: 7px; padding: 9px 11px; font: inherit; font-size: .72rem; }
        .live-indicator { display: flex; align-items: center; gap: 7px; border: 1px solid rgba(0,255,200,.18); background: rgba(0,255,200,.06); color: #00ffc8; border-radius: 999px; padding: 8px 11px; font-size: .68rem; }
        .live-indicator span { width: 6px; height: 6px; border-radius: 50%; background: #00ffc8; box-shadow: 0 0 10px #00ffc8; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; max-width: 1480px; margin: 0 auto 10px; }
        .metric-card, .panel { border: 1px solid rgba(255,255,255,.075); background: rgba(13,16,23,.88); border-radius: 12px; }
        .metric-card { position: relative; padding: 16px; overflow: hidden; }
        .metric-card::after { content: ""; position: absolute; inset: auto 0 0; height: 2px; background: linear-gradient(90deg, #00ffc8, transparent); opacity: .65; }
        .metric-card span { display: block; color: rgba(255,255,255,.38); font-size: .67rem; text-transform: uppercase; letter-spacing: .11em; }
        .metric-card strong { display: block; margin-top: 10px; font-size: 1.55rem; }
        .metric-card small { position: absolute; right: 15px; bottom: 18px; color: #00ffc8; }
        .primary-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr); gap: 10px; max-width: 1480px; margin: 0 auto 10px; }
        .secondary-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 10px; max-width: 1480px; margin: 0 auto; }
        .panel { padding: 18px; min-width: 0; }
        .panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .run-id { color: rgba(255,255,255,.3); font-size: .68rem; }
        .graph-scroll { overflow-x: auto; border: 1px solid rgba(255,255,255,.055); border-radius: 9px; background: #080b11; }
        .pipeline-graph { min-width: 1020px; width: 100%; height: 150px; }
        .edge { stroke: rgba(255,255,255,.12); stroke-width: 1.5; }
        .edge-complete { stroke: #00ffc8; }
        .edge-active { stroke: #ff6b00; stroke-dasharray: 5 5; }
        .node { cursor: pointer; outline: none; }
        .node rect { fill: #111620; stroke: rgba(255,255,255,.1); }
        .node circle { fill: rgba(255,255,255,.25); }
        .node text { fill: rgba(255,255,255,.62); font-size: 12px; font-family: inherit; }
        .node-complete rect { stroke: rgba(0,255,200,.35); }
        .node-complete circle { fill: #00ffc8; }
        .node-active rect { stroke: #ff6b00; fill: rgba(255,107,0,.07); }
        .node-active circle { fill: #ff6b00; }
        .node-selected rect { stroke-width: 2; }
        .node:focus rect { stroke: #fff; }
        .node-inspector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
        .node-inspector > div { background: rgba(255,255,255,.025); border-radius: 7px; padding: 10px; }
        .inspector-label { display: block; color: rgba(255,255,255,.3); font-size: .62rem; margin-bottom: 6px; text-transform: uppercase; }
        .node-inspector strong { font-size: .72rem; text-transform: capitalize; }
        .text-active { color: #ff6b00; }
        .text-complete { color: #00ffc8; }
        .sparkline { color: #00ffc8; margin: 12px 0 8px; }
        .compact-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 0; }
        .compact-stats div { padding: 10px; border: 1px solid rgba(255,255,255,.055); border-radius: 7px; }
        .compact-stats dt { color: rgba(255,255,255,.35); font-size: .63rem; }
        .compact-stats dd { margin: 6px 0 0; font-size: 1rem; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 620px; }
        th { color: rgba(255,255,255,.3); font-size: .62rem; font-weight: 500; text-transform: uppercase; letter-spacing: .09em; text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,255,255,.07); }
        td { padding: 11px 8px; color: rgba(255,255,255,.58); font-size: .72rem; border-bottom: 1px solid rgba(255,255,255,.045); }
        td strong { display: block; color: rgba(255,255,255,.82); }
        td small { display: block; color: rgba(255,255,255,.27); margin-top: 3px; }
        .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.3); }
        .status-running { background: #ff6b00; box-shadow: 0 0 9px rgba(255,107,0,.6); }
        .status-complete { background: #00ffc8; }
        .status-failed { background: #ef4444; }
        .health-list { display: grid; gap: 14px; }
        .health-row { display: grid; grid-template-columns: 120px 1fr 55px; align-items: center; gap: 10px; }
        .health-row strong, .health-row small { display: block; font-size: .68rem; }
        .health-row small { color: rgba(255,255,255,.3); margin-top: 3px; }
        .health-row b { font-size: .65rem; color: rgba(255,255,255,.48); text-align: right; }
        .health-track { height: 5px; background: rgba(255,255,255,.06); border-radius: 999px; overflow: hidden; }
        .health-track span { display: block; height: 100%; background: #00ffc8; border-radius: inherit; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (max-width: 900px) {
          .observatory-shell { padding: 18px; }
          .observatory-header { align-items: flex-start; flex-direction: column; }
          .metric-grid { grid-template-columns: repeat(2, 1fr); }
          .primary-grid, .secondary-grid { grid-template-columns: 1fr; }
          .node-inspector { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .observatory-shell { padding: 12px; }
          .metric-grid { grid-template-columns: 1fr 1fr; }
          .metric-card { padding: 13px; }
          .metric-card strong { font-size: 1.2rem; }
          .header-actions { width: 100%; justify-content: space-between; }
          .node-inspector { grid-template-columns: 1fr 1fr; }
          .health-row { grid-template-columns: 105px 1fr; }
          .health-row b { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
        }
      `}</style>
    </main>
  );
}
