const express = require('express');

module.exports = function itemsRouter(engine) {
  const router = express.Router();

  // Scan (list all items in a table)
  router.get('/:tableName/items', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.tableName);
      const result = table.scan();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // PutItem (create or overwrite)
  router.post('/:tableName/items', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.tableName);
      const result = table.putItem(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GetItem by key (pk required, sk optional via query string)
  router.get('/:tableName/items/get', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.tableName);
      const { pk, sk } = req.query;
      const result = table.getItem(pk, sk);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // UpdateItem (partial merge, re-uses putItem semantics)
  router.put('/:tableName/items', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.tableName);
      const { pk, sk } = req.query;
      const existing = table.getItem(pk, sk).item || {};
      const merged = { ...existing, ...req.body };
      const result = table.putItem(merged);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // DeleteItem
  router.delete('/:tableName/items', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.tableName);
      const { pk, sk } = req.query;
      const result = table.deleteItem(pk, sk);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Query (by partition key + optional sort key condition)
  router.post('/:tableName/query', (req, res, next) => {
    try {
      const table = engine.getTable(req.params.tableName);
      const { pk, skCondition } = req.body;
      const result = table.query(pk, skCondition);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
