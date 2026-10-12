import { analyze, receipt, verify } from './src/engine.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let last = null;
setInterval(() => { const n = performance.getEntriesByType('resource').filter((e) => !e.name.startsWith(location.origin)).length; $('net').textContent = `${n} third-party requests · CSP blocks all others`; }, 1000);
$('sample').onchange = async (e) => { if (!e.target.value) return; $('doc').value = await (await fetch(`samples/${e.target.value}.txt`)).text(); run(); };
$('file').onchange = async (e) => { const f = e.target.files[0]; if (f) { $('doc').value = await f.text(); run(); } };
$('go').onclick = run;
async function run() {
  const text = $('doc').value; if (!text.trim()) return;
  const r = analyze(text); const rc = await receipt(text, r); last = rc;
  const col = r.score >= 60 ? 'var(--h)' : r.score >= 30 ? 'var(--md)' : 'var(--ok)';
  $('out').innerHTML = `<div class="score"><div class="big" style="color:${col}">${r.score}</div><div><b>${r.grade}</b><br><span class="m">${r.clauses} clauses · ${r.counts.high} high · ${r.counts.medium} medium · ${r.counts.low} low</span></div></div>
  ${r.findings.map((f) => `<div class="f ${f.severity}"><span class="sev ${f.severity}">${f.severity}</span><b>${esc(f.title)}</b> <span class="m">${f.clause ? '· clause ' + f.clause : '· missing'} · ${esc(f.category)}</span>
   ${f.excerpt ? `<div class="ex">${esc(f.excerpt).replace(esc(f.match), `<mark>${esc(f.match)}</mark>`)}</div>` : ''}
   <div>${esc(f.why)}</div><div class="fix">✎ Suggested redline: ${esc(f.fix)}</div></div>`).join('') || '<p class="ok">No risky patterns found.</p>'}
  <h3>Review receipt</h3><pre class="rc">${esc(JSON.stringify(rc, null, 2))}</pre>
  <div class="row"><button id="dl">Download receipt.json</button><button id="dlr">Download report.md</button></div>`;
  $('dl').onclick = () => save('clauselens-receipt.json', JSON.stringify(rc, null, 2));
  $('dlr').onclick = () => save('clauselens-report.md', `# ClauseLens report\nScore ${r.score} (${r.grade})\nDocument SHA-256: ${rc.docSha256}\nReceipt SHA-256: ${rc.receiptSha256}\n\n` + r.findings.map((f) => `- **[${f.severity}] ${f.title}** (${f.clause ? 'clause ' + f.clause : 'missing'}): ${f.why}\n  - Redline: ${f.fix}`).join('\n'));
}
function save(name, data) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data])); a.download = name; a.click(); }
$('rcfile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const rc = JSON.parse(await f.text()); const v = await verify($('doc').value, rc);
  $('vres').innerHTML = v.docMatches && v.receiptMatches ? '<span class="ok">✔ Receipt matches this exact document and findings.</span>' : `<span class="bad">✖ Mismatch: document ${v.docMatches ? 'ok' : 'CHANGED'}, receipt ${v.receiptMatches ? 'ok' : 'ALTERED'}${v.engineMatches ? '' : ', different engine version'}</span>`; };
window.__clauselens = { verify, get last() { return last; } };
