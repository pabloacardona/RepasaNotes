// Topic matching: decides when two free-text topics ("Desarrollo web", "desarrollo Web", "HTML y CSS", "Web development")
// are the same subject, so one subject never shows up twice in "Puntaje por tema" or in the conquest map.
// Pure functions, no I/O: the server uses them to file a new note under a topic that already exists, and to merge the
// topics that were already saved as separate rows.
//
// Two topics are the same subject when any rule below holds (cheapest first):
//   1. Same words after cleaning: lower case, no accents or punctuation, no filler words ("de", "curso", "introducción"),
//      plural stripped, short aliases expanded (js -> javascript).
//   2. One is contained in the other: "Desarrollo web" is inside "Desarrollo web frontend".
//   3. They share a concept cluster: "HTML", "CSS", "React" and "Node.js" all belong to web development, "SQL" and
//      "Normalización" to databases. The cluster only fires on topics that are plainly inside it.
//   4. Near-identical spelling (typos): edit distance of at most ~14% of the length.
//   5. Word overlap: Jaccard similarity of 0.6 or more.

const STOP = new Set(
  (
    "a al ante con contra de del desde e el en entre la las lo los o para por sobre un una unos unas y " +
    "tema temas apunte apuntes nota notas curso cursos clase clases unidad modulo capitulo parte " +
    "introduccion intro basico basica basicos avanzado avanzada avanzados fundamentos fundamental conceptos concepto " +
    "general generales generalidades resumen repaso guia manual estudio estudiar sobre " +
    "desarrollo desarrollador desarrolladores development developer dev programacion programming " +
    "the of and to in for with"
  ).split(" "),
);

const ALIAS: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  nodejs: "node",
  reactjs: "react",
  vuejs: "vue",
  nextjs: "next",
  bd: "base",
  db: "base",
  databases: "base",
  database: "base",
  bases: "base",
  datos: "dato",
  ai: "ia",
  ml: "machine",
  frontend: "frontend",
  "front": "frontend",
  "back": "backend",
  website: "web",
  websites: "web",
  internet: "web",
  www: "web",
  pagina: "web",
  paginas: "web",
  sitio: "web",
  sitios: "web",
};

// A topic that is plainly inside one of these families belongs to it.
const CLUSTERS: Record<string, Set<string>> = {
  web: new Set(
    "web html css sass scss javascript typescript react vue angular svelte next node express frontend backend fullstack http https dom tailwind bootstrap responsive spa ssr api rest graphql php laravel django flask wordpress".split(" "),
  ),
  db: new Set("base dato sql mysql postgres postgresql sqlite mongodb nosql normalizacion relacional redis orm".split(" ")),
  ia: new Set("ia inteligencia artificial machine learning aprendizaje automatico neuronal neural deep llm".split(" ")),
  redes: new Set("red redes tcp ip dns udp router routing protocolo protocolos osi lan wan wifi".split(" ")),
};

function stem(w: string) {
  if (w.length > 5 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** Cleaned content words of a topic, in order. */
export function topicTokens(topic: string): string[] {
  const words = topic
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const out: string[] = [];
  for (const raw of words) {
    const aliased = ALIAS[raw] ?? raw;
    if (STOP.has(aliased)) continue;
    const t = ALIAS[stem(aliased)] ?? stem(aliased);
    if (t && !STOP.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

/** The topic as typed, only cleaned (case, accents, punctuation): used to catch typos before filler words are dropped. */
function plain(topic: string) {
  return topic.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();
}

function clusterOf(tokens: string[]): string | null {
  if (tokens.length === 0) return null;
  let best: string | null = null;
  let bestHits = 0;
  for (const [name, set] of Object.entries(CLUSTERS)) {
    const hits = tokens.filter((t) => set.has(t)).length;
    // Every word of the topic must belong to the family: "Historia de la web" is not web development.
    if (hits === tokens.length && hits > bestHits) {
      best = name;
      bestHits = hits;
    }
  }
  return best;
}

function distance(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** true when both topics name the same subject. */
export function sameTopic(a: string, b: string): boolean {
  const ta = topicTokens(a);
  const tb = topicTokens(b);
  if (ta.length === 0 || tb.length === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  const ja = ta.join(" ");
  const jb = tb.join(" ");
  if (ja === jb) return true;

  const sa = new Set(ta);
  const sb = new Set(tb);
  const shared = ta.filter((t) => sb.has(t)).length;
  // One inside the other. Needs two shared words: a lone "historia" would otherwise glue "Historia de Colombia" and
  // "Historia universal" together. Single-word families ("web", "sql") are handled by the cluster rule below.
  const small = sa.size <= sb.size ? ta : tb;
  if (shared === small.length && small.length >= 2) return true;

  const ca = clusterOf(ta);
  if (ca && ca === clusterOf(tb)) return true;

  for (const [x, y] of [[ja, jb], [plain(a), plain(b)]]) {
    const longest = Math.max(x.length, y.length);
    if (longest >= 5 && distance(x, y) <= Math.floor(longest * 0.14)) return true;
  }

  return shared / (sa.size + sb.size - shared) >= 0.6;
}

/**
 * Groups topics that are the same subject and names each group after its most used spelling (ties: the shortest).
 * `topics` can repeat: the repeats are the weight. Returns a function that maps any topic to its group name.
 */
export function buildTopicResolver(topics: string[]): (topic: string) => string {
  const counts = new Map<string, number>();
  for (const raw of topics) {
    const t = raw.trim();
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const names = [...counts.keys()];
  const parent = names.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (find(i) !== find(j) && sameTopic(names[i], names[j])) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, string[]>();
  names.forEach((n, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), n]));

  // Spelling variants that differ only by case or accents are one spelling for counting.
  const canonical = new Map<string, string>();
  for (const members of groups.values()) {
    const best = [...members].sort((x, y) => (counts.get(y)! - counts.get(x)!) || x.length - y.length || x.localeCompare(y))[0];
    for (const m of members) canonical.set(m, best);
  }
  return (topic: string) => {
    const t = topic.trim();
    const direct = canonical.get(t);
    if (direct) return direct;
    // Not in the list the resolver was built from: file it under the group it matches, if any.
    for (const [name, to] of canonical) if (sameTopic(name, t)) return to;
    return t;
  };
}

/** The topic a new note should be saved under: an existing one when it is the same subject, else what was typed. */
export function resolveNewTopic(typed: string, existing: string[]): string {
  const t = typed.trim();
  const matches = existing.filter((e) => sameTopic(e, t));
  if (matches.length === 0) return t;
  return buildTopicResolver(existing)(matches[0]);
}
