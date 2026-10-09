# DynamoSim — Backend

Express API implementing the DynamoDB simulation engine. See the project root `README.md` for the full picture.

## Quick start

```bash
npm install
npm start
```

Runs at http://localhost:4000. A demo `Users` table is seeded automatically on boot (including one item with a short TTL, so you can watch the TTL enhancement fire within ~90 seconds of starting the server).

## API summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/tables` | List tables |
| POST | `/api/tables` | Create table `{ name, partitionKey, sortKey?, billingMode, rcu?, wcu? }` |
| GET | `/api/tables/:name` | Table details + metrics |
| DELETE | `/api/tables/:name` | Delete table |
| GET | `/api/tables/:name/advisor` | Capacity & Cost Advisor (enhancement) |
| GET | `/api/tables/:name/stream` | Simulated DynamoDB Stream (TTL REMOVE events) |
| GET | `/api/tables/:name/items` | Scan all items |
| POST | `/api/tables/:name/items` | PutItem |
| GET | `/api/tables/:name/items/get?pk=&sk=` | GetItem |
| PUT | `/api/tables/:name/items?pk=&sk=` | UpdateItem (merge) |
| DELETE | `/api/tables/:name/items?pk=&sk=` | DeleteItem |
| POST | `/api/tables/:name/query` | Query `{ pk, skCondition? }` |

Errors mirror AWS SDK shape: `{ "__type": "ProvisionedThroughputExceededException", "message": "..." }`.
