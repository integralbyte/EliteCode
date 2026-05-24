# EliteCode

![EliteCode banner](./EliteCode%20Banner.jpeg)

EliteCode is a local-first coding practice app for solving algorithm problems offline. It includes a React editor UI, a FastAPI backend, SQLite progress storage, file-based problem packs, and a local Python judge.

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
```

## Adding Problems

Add a folder under `problems/<slug>/` with a `problem.json` file. Add `checker.py` when a problem needs custom validation.

Validate packs with:

```bash
npm run validate:problems
```

## Notes

The Python runner is designed for personal offline use. It is not a hardened sandbox for untrusted multi-user execution.
