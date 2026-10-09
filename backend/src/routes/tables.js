const express = require('express');

module.exports = function tablesRouter(engine) {
  const router = express.Router();

  // List all tables
  router.get('/', (req, res) => {
    res.json({ tables: engine.listTables() });
  });

  // Create a table
  router.post('/', (req, res, next) => {
    try {
      const { name, partitionKey, sortKey, billingMode, rcu, wcu } = req.body;
      const table = engine.createTable({ name, partitionKey, sortKey, billingMode, rcu, wcu });
      res.status(201).json(table.toSummaryJSON());
    } catch (err) {
      next(err);
    }
  });

  // Get a single table's details
  router.get('/:name', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.name);
      res.json(table.toSummaryJSON());
    } catch (err) {
      next(err);
    }
  });

  // Delete a table
  router.delete('/:name', (req, res, next) => {
    try {
      engine.deleteTable(req.params.name);
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  // Cost & Capacity Advisor (enhancement)
  router.get('/:name/advisor', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.name);
      res.json(table.costAdvisor());
    } catch (err) {
      next(err);
    }
  });

  // Simulated DynamoDB Streams (TTL expiry events)
  router.get('/:name/stream', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.name);
      res.json({ events: table.streamEvents });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
