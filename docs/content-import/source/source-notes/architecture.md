# Italian Learning Website — Exercise Engine Architecture

## 1. Project Overview
This repository powers a custom, software-driven Italian language learning platform featuring an automated exercise engine. The system relies on a local file architecture and JSON master-sentence storage, completely bypassing external online LLM APIs during runtime execution.

The corpus is structured around a **2,000-sentence target roadmap** split across four core tenses (*Indicativo Presente*, *Passato Prossimo*, *Imperfetto*, and *Futuro Semplice*), supported by a centralized verb database.

---

## 2. File & Directory Layout
```text
src/
├── content/
│   ├── verbs.json                # Centralized verb metadata, tiers, auxiliaries, and stems
│   └── sentences/
│       ├── indicativo-presente.json  # Module 1 (Batches 1–6)
│       ├── passato-prossimo.json     # Module 2 (Batches 7–12)
│       ├── imperfetto.json           # Module 3 (Batches 13–16)
│       └── futuro-semplice.json      # Module 4 (Batches 17–20)