import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, receipt, verify, splitClauses, canon } from '../src/engine.js';
import { RULES } from '../src/rules.js';
const read = (f) => fs.readFileSync(new URL('../samples/' + f, import.meta.url), 'utf8');
const ids = (r) => new Set(r.findings.map((f) => f.rule));

test('splits numbered clauses', () => { assert.equal(splitClauses(read('saas.txt')).length, 8); });
test('SaaS sample flags expected risks', () => {
  const s = ids(analyze(read('saas.txt')));
  for (const id of ['auto-renewal','unilateral-amendment','termination-convenience-one-sided','data-sale','broad-indemnity','consequential-one-sided','forced-arbitration','class-waiver','missing-liability-cap'])
    assert.ok(s.has(id), id);
  assert.ok(!s.has('missing-governing-law'));
});
test('contractor sample flags expected risks', () => {
  const s = ids(analyze(read('contractor.txt')));
  for (const id of ['long-payment','ip-overreach','non-compete','perpetual-confidentiality','unlimited-liability','liquidated-damages','termination-convenience-one-sided','governing-law-foreign','jury-waiver']) assert.ok(s.has(id), id);
});
test('fair mutual NDA is clean', () => { const r = analyze(read('fair-nda.txt')); assert.equal(r.findings.length, 0); assert.equal(r.grade, 'No flags'); });
test('every rule has a fix and a pattern', () => { for (const r of RULES) { assert.ok(r.fix && r.why && r.patterns.length, r.id); } });
test('findings sorted high first', () => { const f = analyze(read('contractor.txt')).findings; for (let i = 1; i < f.length; i++) assert.ok({high:3,medium:2,low:1}[f[i-1].severity] >= {high:3,medium:2,low:1}[f[i].severity]); });
test('score bounded 0..100', () => { const r = analyze(read('saas.txt') + read('contractor.txt')); assert.ok(r.score <= 100 && r.score > 60); });
test('canonical JSON is key-order independent', () => { assert.equal(canon({b:1,a:[{d:2,c:3}]}), canon({a:[{c:3,d:2}],b:1})); });
test('receipt verifies and detects tampering', async () => {
  const t = read('saas.txt'); const rc = await receipt(t, analyze(t), '2026-10-12T00:00:00Z');
  assert.match(rc.receiptSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(await verify(t, rc), { docMatches: true, receiptMatches: true, engineMatches: true });
  assert.deepEqual(await verify(t + '\n\nWhitespace-only change   ', rc).then(v=>v.docMatches), false);
  assert.equal((await verify(t.replace('ninety (90)', 'thirty (30)'), rc)).docMatches, false);
  assert.equal((await verify(t, { ...rc, score: 1 })).receiptMatches, false);
});
test('normalisation ignores CRLF and trailing spaces', async () => {
  const t = read('fair-nda.txt'); const rc = await receipt(t, analyze(t), 'x');
  assert.ok((await verify(t.replace(/\n/g, '\r\n') + '   ', rc)).docMatches);
});
