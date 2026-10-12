import { RULES, MISSING } from './rules.js';
export const SEV = { high: 3, medium: 2, low: 1 };

/** Split text into clauses (paragraphs / numbered sections / sentences >1). */
export function splitClauses(text) {
  const t = String(text).replace(/\r\n?/g, '\n');
  const out = []; let pos = 0;
  for (const block of t.split(/\n\s*\n|\n(?=\s*(?:\d+(?:\.\d+)*[.)]|\([a-z]\)|Section\s+\d)\s)/)) {
    const start = t.indexOf(block, pos); pos = start + block.length;
    if (block.trim()) out.push({ text: block.trim(), start, end: pos });
  }
  return out;
}

/** Analyse a contract. Pure, deterministic, no network. */
export function analyze(text, { rules = RULES, missing = MISSING } = {}) {
  const clauses = splitClauses(text);
  const findings = [];
  clauses.forEach((c, i) => {
    for (const r of rules) {
      for (const re of r.patterns) {
        const m = c.text.match(re);
        if (m) { findings.push({ rule: r.id, title: r.title, severity: r.severity, category: r.category, why: r.why, fix: r.fix, clause: i + 1, excerpt: c.text.slice(0, 400), match: m[0] }); break; }
      }
    }
  });
  for (const r of missing) if (!r.present.some((re) => re.test(text)))
    findings.push({ rule: r.id, title: r.title, severity: r.severity, category: r.category, why: r.why, fix: r.fix, clause: null, excerpt: null, match: null });
  findings.sort((a, b) => SEV[b.severity] - SEV[a.severity] || (a.clause ?? 1e9) - (b.clause ?? 1e9));
  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => counts[f.severity]++);
  const raw = counts.high * 15 + counts.medium * 7 + counts.low * 3;
  const score = Math.min(100, raw);
  const grade = score >= 60 ? 'High risk' : score >= 30 ? 'Review carefully' : score > 0 ? 'Minor issues' : 'No flags';
  return { clauses: clauses.length, findings, counts, score, grade };
}

export const normalize = (t) => String(t).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Canonical JSON (sorted keys) so the receipt hash is reproducible. */
export function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

export const ENGINE_VERSION = 'clauselens-1.0.0';

/** Review receipt: binds exact document + ruleset version + findings. Anyone can re-verify offline. */
export async function receipt(text, result, at = new Date().toISOString()) {
  const docHash = await sha256(normalize(text));
  const findings = result.findings.map((f) => ({ rule: f.rule, clause: f.clause, severity: f.severity }));
  const body = { engine: ENGINE_VERSION, docSha256: docHash, findings, score: result.score, reviewedAt: at };
  return { ...body, receiptSha256: await sha256(canon(body)) };
}

/** Verify a receipt against a document: re-runs the analysis and recomputes both hashes. */
export async function verify(text, rc) {
  const r = analyze(text);
  const again = await receipt(text, r, rc.reviewedAt);
  const { receiptSha256, ...body } = rc;
  const selfHash = await sha256(canon(body));
  return { docMatches: again.docSha256 === rc.docSha256, receiptMatches: selfHash === receiptSha256 && (again.docSha256 !== rc.docSha256 || again.receiptSha256 === receiptSha256), engineMatches: rc.engine === ENGINE_VERSION };
}
