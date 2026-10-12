# ClauseLens architecture

```
 contract text ──► splitClauses() ──► rule engine (src/rules.js: 18 pattern rules + 3 missing-clause rules)
                                          │
                                          ▼
                         findings (severity, why, suggested redline) ──► score 0–100 + grade
                                          │
 normalize(text) ─SHA-256─► docSha256 ────┤
                                          ▼
          receipt = {engine, docSha256, findings[rule,clause,severity], score, reviewedAt}
          receiptSha256 = SHA-256(canonical JSON(receipt))
```

* **No server.** The app is static HTML + ES modules served from GitHub Pages. A Content-Security-Policy (`default-src 'self'`) stops the page from sending text anywhere. Hashing uses WebCrypto.
* **Deterministic.** The same document and engine version always produce the same findings and hashes. `verify()` re-runs the analysis and recomputes both hashes. It detects an edited document (`docMatches=false`) or an edited receipt (`receiptMatches=false`).
* **Same code in Node and the browser.** `src/engine.js` has no DOM dependencies, and `node --test` runs the same module the page uses.
* **Extensible.** A rule is a plain object (`patterns`, `why`, `fix`). Firms can add their own playbook rules without touching the engine.

## Roadmap (not built)
* Anchor `receiptSha256` on-chain (an EAS attestation, or a Chainlink CRE workflow that writes the hash) for a public, timestamped proof-of-review that reveals nothing about the contract.
* Optional local-LLM (WebGPU) explanations that keep the no-upload guarantee.
* Jurisdiction packs (for example non-compete rules by US state, GDPR/COPPA privacy packs).
