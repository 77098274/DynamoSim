const express = require('express');
const cors = require('cors');
const { DynamoSimEngine } = require('./db/engine');
const tablesRouter = require('./routes/tables');
const itemsRouter = require('./routes/items');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const engine = new DynamoSimEngine();
engine.startTTLSweeper(2000); // sweep every 2s (accelerated for classroom demo purposes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DynamoDB Simulator API', time: new Date().toISOString() });
});

app.use('/api/tables', tablesRouter(engine));
app.use('/api/tables', itemsRouter(engine));

// Seed a demo table so the UI is never empty on first load.
try {
  const demo = engine.createTable({
    name: 'Users',
    partitionKey: 'userId',
    sortKey: 'createdAt',
    billingMode: 'ON_DEMAND',
  });
  demo.putItem({
    userId: 'u-1001',
    createdAt: new Date().toISOString(),
    name: 'Amit Kumar',
    email: 'amit@example.com',
    role: 'admin',
  });
  demo.putItem({
    userId: 'u-1002',
    createdAt: new Date().toISOString(),
    name: 'Demo Session',
    email: 'demo@example.com',
    role: 'guest',
    ttl: Math.floor(Date.now() / 1000) + 90, // expires in 90s to showcase TTL enhancement
  });
} catch (e) {
  // ignore seeding errors
}

// Centralized error handler -> maps simulator errors to AWS-like JSON errors
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    __type: err.name || 'InternalServerError',
    message: err.message || 'Unexpected error',
  });
});

app.listen(PORT, () => {
  console.log(`DynamoDB Simulator API listening on http://localhost:${PORT}`);
});
