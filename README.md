# EliteCode

<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/72e04930-5725-47b9-835d-2a935601305f" />

EliteCode is an open-source, offline LeetCode-style workspace you run locally. It includes a browser workbench, persistent progress, file-based problem packs, and a local Python judge.

The bundled starter catalog is based on NeetCode 150: 150 problems with 300,000+ visible and hidden test cases. EliteCode can load additional packs, so it is not limited to that catalog.

## Quick Start

```bash
npm install
npm run install:backend
npm run dev
```

Open `http://127.0.0.1:5173`.

## Scripts

```bash
npm run dev
npm run build
npm test
npm run test:e2e
npm run validate:problems
npm run audit:cases
npm run audit:edge
```

## Adding Problems

Add a folder under `problems/<slug>/` with a `problem.json` file. Add `checker.py` when a problem needs custom validation.

Validate packs with:

```bash
npm run validate:problems
```

## Notes

The Python runner is designed for personal offline use. It is not a hardened sandbox for untrusted multi-user execution.
