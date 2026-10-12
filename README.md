# 🔎 ClauseLens

**A private contract clause risk checker that runs entirely in your browser, with verifiable review receipts.**

**Live demo:** https://northstar-trustrail.github.io/clauselens/ · **Video (≤3 min):** https://northstar-trustrail.github.io/clauselens/video/clauselens-demo.mp4

Built for the **BLI Legal Tech Hackathon 2** (LegalTech & RegTech track).

## Why
Freelancers, small businesses and students sign contracts they can't afford to have a lawyer review. Most AI "contract review" tools ask you to upload a confidential document to someone else's server. ClauseLens takes the opposite approach:

* **Nothing leaves the tab.** It is a static page with a strict CSP and makes no network calls once loaded.
* **Explainable.** Every flag shows the exact matched words, why they matter, and a suggested redline.
* **Verifiable.** Each review issues a SHA-256 **receipt** that binds the exact document text, the engine version and the findings. Anyone holding the document can re-verify the receipt offline. If one comma in the contract or one field in the receipt changes, verification fails. A lawyer, client or counterparty can prove *which* version was reviewed and *what* was flagged without sharing the document.

## What it flags
Automatic renewal · one-sided amendment rights · uncapped liability · broad indemnity · one-sided consequential-damages waivers · overbroad IP assignment · non-competes · mandatory arbitration · class-action and jury waivers · one-sided termination for convenience · long payment terms · liquidated damages · free assignment · perpetual confidentiality · sale/sharing of personal data · collection of **minors' data** · distant exclusive venue. It also flags *missing* liability-cap, governing-law and termination clauses.

Each finding gets a severity (high/medium/low). The page shows a 0–100 risk score and lets you download `receipt.json` and `report.md`.

## Run it
```bash
git clone https://github.com/northstar-trustrail/clauselens && cd clauselens
python3 -m http.server 8000   # open http://localhost:8000
npm test                      # Node ≥ 20, zero dependencies
```

## Use the engine in code
```js
import { analyze, receipt, verify } from './src/engine.js';
const r = analyze(text);              // { findings, counts, score, grade }
const rc = await receipt(text, r);    // { docSha256, receiptSha256, ... }
await verify(text, rc);               // { docMatches, receiptMatches, engineMatches }
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limits
ClauseLens is a pattern-based issue spotter, **not legal advice**. It can miss risks phrased in unusual ways and may flag clauses that are fine in context. Use it to decide what to ask a lawyer about.

## License
MIT © 2026 Northstar Trustrail
