# DynamoSim — Frontend

React (Vite) single-page app for the DynamoDB Simulator. See the project root `README.md` for the full picture (what this simulates, the enhancement, and run instructions for both frontend and backend together).

## Quick start

```bash
npm install
npm run dev
```

Runs at http://localhost:5173 and proxies `/api/*` calls to the backend at http://localhost:4000 (see `vite.config.js`). Start the backend first (see `../backend/README.md`).

## Production build

```bash
npm run build
npm run preview
```

If the backend is deployed separately (different host), copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to its public URL before building.
