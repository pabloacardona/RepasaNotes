import { Fragment, type ReactNode } from "react";

// Renders question / option / explanation text. Supported syntax:
//   ```lang ... ```        a code block with simple syntax colours
//   ```chart {json} ```    a chart: {"type":"bar"|"line"|"pie","title":"","labels":[..],"values":[..]}
//   `code`                 inline code
// Plain text stays plain. A chart or code fence that does not parse falls back to text, so a bad AI output never breaks the page.

type Part = { kind: "text" | "code" | "chart"; body: string; lang?: string };

function split(src: string): Part[] {
  const parts: Part[] = [];
  const re = /```([\w+#-]*)[ \t]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) parts.push({ kind: "text", body: src.slice(last, m.index) });
    const lang = m[1].toLowerCase();
    parts.push({ kind: lang === "chart" ? "chart" : "code", lang, body: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push({ kind: "text", body: src.slice(last) });
  return parts;
}

export function RichText({ text, className = "", compact = false, inlineOnly = false }: { text: string; className?: string; compact?: boolean; inlineOnly?: boolean }) {
  if (inlineOnly) return <span className={className}>{inline(text.replace(/```[\w+#-]*[ \t]*\n?/g, "`").replace(/\n`/g, "`"))}</span>;
  const parts = split(text);
  if (parts.length === 1 && parts[0].kind === "text") return <span className={className}>{inline(parts[0].body)}</span>;
  return (
    <div className={`space-y-2 ${className}`}>
      {parts.map((p, i) => {
        if (p.kind === "code") return <CodeBlock key={i} code={p.body} lang={p.lang} compact={compact} />;
        if (p.kind === "chart") {
          const spec = parseChart(p.body);
          return spec ? <Chart key={i} spec={spec} compact={compact} /> : <CodeBlock key={i} code={p.body} lang="json" compact={compact} />;
        }
        return p.body.trim() ? <p key={i}>{inline(p.body.trim())}</p> : null;
      })}
    </div>
  );
}

function inline(s: string): ReactNode {
  return s.split(/(`[^`\n]+`)/g).map((seg, i) =>
    seg.length > 2 && seg.startsWith("`") && seg.endsWith("`") ? (
      <code key={i} className="rt-inline">
        {seg.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{seg}</Fragment>
    ),
  );
}

// ---------- Code ----------

const KEYWORDS = new Set(
  (
    "abstract as async await break case catch class const continue def default defer del do elif else enum except export extends " +
    "False final finally fn for from func function go if implements import in instanceof interface is lambda let match mod new None " +
    "not null nil of or package pass private protected pub public raise return self static struct super switch this throw trait True " +
    "true false try type typeof undefined use var void while with yield SELECT FROM WHERE INSERT UPDATE DELETE JOIN ON GROUP BY ORDER " +
    "INTO VALUES CREATE TABLE AND OR NOT NULL AS LIMIT HAVING"
  ).split(" "),
);

type Tok = { t: "c" | "s" | "n" | "k" | "f" | "p" | "x"; v: string };

function tokenize(code: string, lang: string): Tok[] {
  const hash = /^(py|python|sh|bash|shell|yaml|yml|rb|ruby|r)$/.test(lang);
  const re = new RegExp(
    [
      hash ? "(#[^\\n]*)" : "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|--[^\\n]*)",
      "(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)",
      "(\\b\\d[\\d_.]*(?:e[+-]?\\d+)?\\b)",
      "([A-Za-z_$][\\w$]*)(?=\\s*\\()",
      "([A-Za-z_$][\\w$]*)",
      "([{}()[\\];,.:<>=+\\-*/%!&|^~?]+)",
    ].join("|"),
    "g",
  );
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: "x", v: code.slice(last, m.index) });
    const v = m[0];
    if (m[1]) out.push({ t: "c", v });
    else if (m[2]) out.push({ t: "s", v });
    else if (m[3]) out.push({ t: "n", v });
    else if (m[4]) out.push({ t: KEYWORDS.has(v) ? "k" : "f", v });
    else if (m[5]) out.push({ t: KEYWORDS.has(v) ? "k" : "x", v });
    else out.push({ t: "p", v });
    last = m.index + v.length;
  }
  if (last < code.length) out.push({ t: "x", v: code.slice(last) });
  return out;
}

function CodeBlock({ code, lang = "", compact }: { code: string; lang?: string; compact?: boolean }) {
  return (
    <figure className={`rt-code ${compact ? "rt-code-compact" : ""}`}>
      {lang && <figcaption className="rt-lang">{lang}</figcaption>}
      <pre tabIndex={0}>
        <code>
          {tokenize(code, lang).map((tk, i) => (
            <span key={i} className={tk.t === "x" ? undefined : `tok-${tk.t}`}>
              {tk.v}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

// ---------- Charts ----------

type ChartSpec = { type: "bar" | "line" | "pie"; title?: string; labels: string[]; values: number[] };

function parseChart(src: string): ChartSpec | null {
  try {
    const j = JSON.parse(src);
    const type = j?.type === "line" || j?.type === "pie" ? j.type : "bar";
    const labels: string[] = Array.isArray(j?.labels) ? j.labels.map(String).slice(0, 12) : [];
    const values: number[] = Array.isArray(j?.values) ? j.values.map(Number).slice(0, 12) : [];
    if (labels.length < 1 || labels.length !== values.length || values.some((v) => !Number.isFinite(v))) return null;
    return { type, title: typeof j.title === "string" ? j.title.slice(0, 80) : undefined, labels, values };
  } catch {
    return null;
  }
}

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

function Chart({ spec, compact }: { spec: ChartSpec; compact?: boolean }) {
  const { type, labels, values, title } = spec;
  return (
    <figure className="rt-chart" role="img" aria-label={`${title ?? "Gráfico"}: ${labels.map((l, i) => `${l} ${values[i]}`).join(", ")}`}>
      {title && <figcaption className="rt-chart-title">{title}</figcaption>}
      {type === "pie" ? <Pie labels={labels} values={values} /> : <Axes type={type} labels={labels} values={values} compact={compact} />}
    </figure>
  );
}

function Axes({ type, labels, values, compact }: { type: "bar" | "line"; labels: string[]; values: number[]; compact?: boolean }) {
  const W = 320;
  const H = compact ? 130 : 160;
  const L = 30;
  const B = 24;
  const T = 10;
  const max = Math.max(...values, 0) || 1;
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const y = (v: number) => T + (1 - (v - min) / span) * (H - T - B);
  const step = (W - L - 6) / values.length;
  const x = (i: number) => L + step * (i + 0.5);
  const ticks = [min, min + span / 2, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rt-svg" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - 4} y1={y(t)} y2={y(t)} className="rt-grid" />
          <text x={L - 4} y={y(t) + 3} textAnchor="end" className="rt-axis">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      {type === "bar" ? (
        values.map((v, i) => (
          <rect key={i} x={x(i) - step * 0.3} width={step * 0.6} y={Math.min(y(v), y(0))} height={Math.abs(y(v) - y(0)) || 1} rx={3} fill={PALETTE[i % PALETTE.length]} />
        ))
      ) : (
        <>
          <polyline fill="none" stroke="var(--chart-1)" strokeWidth={2.5} strokeLinejoin="round" points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          {values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="var(--chart-1)" />
          ))}
        </>
      )}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="rt-axis">
          {l.length > 9 ? `${l.slice(0, 8)}…` : l}
        </text>
      ))}
    </svg>
  );
}

function Pie({ labels, values }: { labels: string[]; values: number[] }) {
  const data = values.map((v) => Math.max(v, 0));
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const R = 54;
  const slices = data.map((v, i) => {
    const before = data.slice(0, i).reduce((a, b) => a + b, 0);
    const a0 = (before / total) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((before + v) / total) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number) => `${60 + R * Math.cos(a)} ${60 + R * Math.sin(a)}`;
    const d = v / total >= 0.999 ? `M60 ${60 - R} A${R} ${R} 0 1 1 59.9 ${60 - R} Z` : `M60 60 L${p(a0)} A${R} ${R} 0 ${large} 1 ${p(a1)} Z`;
    return <path key={i} d={d} fill={PALETTE[i % PALETTE.length]} stroke="var(--bg)" strokeWidth={1.5} />;
  });
  return (
    <div className="rt-pie">
      <svg viewBox="0 0 120 120" className="rt-pie-svg">
        {slices}
      </svg>
      <ul className="rt-legend">
        {labels.map((l, i) => (
          <li key={i}>
            <span style={{ background: PALETTE[i % PALETTE.length] }} />
            {l} <b>{Math.round((data[i] / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
