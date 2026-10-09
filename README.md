# DynamoSim — Amazon DynamoDB Simulator

**Course:** BCSE355L / Cloud Architecture Design — Digital Assignment 3 (AWS Service Simulation & Enhancement)
**AWS service simulated:** Amazon DynamoDB
**Stack:** React (Vite) · Node.js / Express · CSS

A full-stack web app that simulates the core mechanics of Amazon DynamoDB — tables, partition/sort keys, PutItem / GetItem / UpdateItem / DeleteItem, Query, Scan, and read/write capacity accounting — plus a meaningful enhancement beyond basic simulation.

## What's simulated (core functionality)

- **Create / delete tables** with a required partition key and optional sort key, just like `CreateTable` / `DeleteTable`.
- **PutItem, GetItem, UpdateItem, DeleteItem** — full item CRUD, enforced primary-key schema.
- **Query** — fetch all items for a partition key, with sort-key conditions (`=`, `begins_with`, `between`, `>`, `>=`, `<`, `<=`) — DynamoDB's efficient access pattern.
- **Scan** — read the whole table, same trade-off as real DynamoDB (shown for comparison against Query).
- **Two capacity modes**: On-Demand and Provisioned. Provisioned mode genuinely enforces its RCU/WCU-per-second limit server-side and returns a real `ProvisionedThroughputExceededException` (HTTP 429) once exceeded — not just a label.
- **RCU/WCU accounting** using the same formulas AWS publishes (1 WCU ≈ 1 KB write, 1 RCU ≈ 4 KB strongly-consistent read).

## Enhancement beyond basic simulation

1. **TTL (Time To Live) auto-expiry.** Items can carry a `ttl` attribute (Unix epoch seconds). A background sweeper on the server automatically deletes expired items — mirroring real DynamoDB TTL — and emits each deletion as a **simulated DynamoDB Stream** `REMOVE` event, visible live in the "Stream (TTL events)" tab. (Accelerated to seconds instead of DynamoDB's real up-to-48h window, purely so it's demonstrable in a live walkthrough.)
2. **Capacity & Cost Advisor.** For any table, projects its observed read/write traffic to a monthly volume and estimates cost under *both* billing modes side by side, then recommends the cheaper one — a decision-support layer similar in spirit to AWS Cost Explorer's rightsizing recommendations.

Both are implemented in `backend/src/db/engine.js` (`sweepExpired()` and `costAdvisor()`) and surfaced in the UI via the **Capacity & Cost Advisor** and **Stream (TTL events)** tabs on each table.

## Project structure

```
dynamodb-simulator/
├── backend/            Express API + simulation engine
│   └── src/
│       ├── db/engine.js      Core DynamoDB simulation (tables, items, capacity, TTL)
│       ├── routes/           REST routes (tables, items)
│       └── server.js         App entry point, seeds a demo table
└── frontend/            React (Vite) SPA
    └── src/
        ├── components/        Sidebar, Dashboard, TableView, items table,
        │                      query panel, capacity meter, cost advisor,
        │                      stream panel, about/concepts page, modals
        ├── context/            Toast notifications
        ├── api.js              REST client
        └── styles/             CSS (no UI framework)
```

## Running locally

Two terminals, backend first:

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
npm install
npm start

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. A demo `Users` table is pre-seeded, including one item with a short TTL so you can watch the TTL enhancement fire shortly after startup.

## Deploying & submitting (per the assignment brief)

The assignment requires a deployed, accessible link and a GitHub repo. At a high level:

1. Push this folder to a new GitHub repository (`git init && git add . && git commit -m "DA3: DynamoDB simulator" && git remote add origin <your-repo-url> && git push -u origin main`).
2. Deploy the `backend/` as a Node web service (e.g. Render, Railway, Fly.io) and the `frontend/` as a static site (e.g. Vercel, Netlify, GitHub Pages) with `VITE_API_BASE_URL` set to the deployed backend's URL — or deploy both together on a single Node host that serves the built frontend from Express.
3. Share the GitHub repo link and the deployed link per the submission form, after faculty approval, as stated in the assignment PDF.

## Rubric alignment

| Criterion | How it's addressed |
|---|---|
| Understanding of AWS Service (2) | "How DynamoDB works" panel in-app + this README explain purpose, keys, capacity modes, TTL, Streams |
| Core Functionality / Simulation (3) | Table CRUD, item CRUD, Query, Scan, RCU/WCU accounting, throttling |
| Enhancement / Tweak (2) | TTL auto-expiry + simulated Streams, and the Capacity & Cost Advisor |
| UI/UX & Working Website (1) | Dashboard, sidebar navigation, tabs, modals, toasts, responsive layout |
| Deployment & GitHub Submission (1) | Up to you to push & deploy using the steps above |
| Demonstration & Explanation (1) | Use the in-app "How DynamoDB works" panel and this README as talking points |
