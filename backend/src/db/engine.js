/**
 * DynamoDB Simulation Engine
 * ---------------------------------
 * In-memory simulation of core Amazon DynamoDB concepts:
 *  - Tables with a Partition Key (and optional Sort Key)
 *  - PutItem / GetItem / UpdateItem / DeleteItem
 *  - Query (by partition key, optional sort key condition)
 *  - Scan (full table read)
 *  - Capacity Units (RCU / WCU) consumption accounting
 *  - Two billing / capacity modes: ON_DEMAND and PROVISIONED
 *  - Throttling simulation when PROVISIONED capacity is exceeded
 *
 * ENHANCEMENT (beyond basic simulation):
 *  - TTL (Time To Live): items can carry a `ttl` attribute (unix seconds).
 *    A background sweeper automatically deletes expired items, mirroring
 *    real DynamoDB TTL behaviour, and records each expiry as a "stream
 *    event" (loosely modeled after DynamoDB Streams) that the UI can show.
 *  - Capacity & Cost Advisor: the engine tracks consumed RCU/WCU over time
 *    and estimates monthly cost under both billing modes, recommending the
 *    cheaper one for the table's observed traffic pattern.
 */

const { v4: uuidv4 } = require('uuid');

// Rough, illustrative AWS pricing constants (us-east-1, on-demand mode),
// used only to power the educational "Cost Advisor" enhancement.
const PRICING = {
  onDemand: {
    writeRequestUnitPer1M: 1.25, // USD per 1,000,000 WCU (on-demand)
    readRequestUnitPer1M: 0.25,  // USD per 1,000,000 RCU (on-demand)
  },
  provisioned: {
    wcuHour: 0.00065, // USD per provisioned WCU-hour
    rcuHour: 0.00013, // USD per provisioned RCU-hour
  },
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function itemSizeBytes(item) {
  return Buffer.byteLength(JSON.stringify(item), 'utf8');
}

function calcWCU(item) {
  // 1 WCU = up to 1 KB per write, rounded up
  return Math.max(1, Math.ceil(itemSizeBytes(item) / 1024));
}

function calcRCU(item, consistent = false) {
  // 1 RCU = up to 4KB strongly consistent read; eventually consistent reads
  // use half that (rounded up to nearest 0.5), matching real DynamoDB math.
  const units = itemSizeBytes(item) / 4096;
  const rounded = Math.max(1, Math.ceil(units));
  return consistent ? rounded : Math.max(0.5, rounded / 2);
}

class ThrottledError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProvisionedThroughputExceededException';
    this.statusCode = 429;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationException';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ResourceNotFoundException';
    this.statusCode = 404;
  }
}

class ConditionalCheckFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConditionalCheckFailedException';
    this.statusCode = 409;
  }
}

class Table {
  constructor({ name, partitionKey, sortKey, billingMode, rcu, wcu }) {
    this.name = name;
    this.partitionKey = partitionKey;
    this.sortKey = sortKey || null;
    this.billingMode = billingMode === 'PROVISIONED' ? 'PROVISIONED' : 'ON_DEMAND';
    this.provisionedThroughput = {
      readCapacityUnits: rcu ? Number(rcu) : 5,
      writeCapacityUnits: wcu ? Number(wcu) : 5,
    };
    this.items = new Map(); // key -> item
    this.createdAt = new Date().toISOString();
    this.status = 'ACTIVE';

    // Rolling 1-second capacity window, for throttling simulation.
    this._window = { second: nowSeconds(), consumedRCU: 0, consumedWCU: 0 };

    this.metrics = {
      totalReads: 0,
      totalWrites: 0,
      totalDeletes: 0,
      consumedRCU: 0,
      consumedWCU: 0,
      throttledRequests: 0,
      ttlExpirations: 0,
      history: [], // { t, consumedRCU, consumedWCU } samples for charting
    };

    this.streamEvents = []; // simulated DynamoDB Streams records (TTL deletes etc.)
  }

  _key(pk, sk) {
    return this.sortKey ? `${pk}#${sk}` : `${pk}`;
  }

  _rollWindow() {
    const sec = nowSeconds();
    if (sec !== this._window.second) {
      this._window = { second: sec, consumedRCU: 0, consumedWCU: 0 };
    }
  }

  _recordHistory() {
    this.metrics.history.push({
      t: Date.now(),
      consumedRCU: this.metrics.consumedRCU,
      consumedWCU: this.metrics.consumedWCU,
    });
    if (this.metrics.history.length > 60) this.metrics.history.shift();
  }

  _chargeWrite(units) {
    this._rollWindow();
    if (this.billingMode === 'PROVISIONED') {
      if (this._window.consumedWCU + units > this.provisionedThroughput.writeCapacityUnits) {
        this.metrics.throttledRequests += 1;
        throw new ThrottledError(
          `Write throttled: table "${this.name}" exceeded provisioned WCU (${this.provisionedThroughput.writeCapacityUnits}/s). ` +
          `Consider switching to ON_DEMAND or raising provisioned WCU.`
        );
      }
      this._window.consumedWCU += units;
    }
    this.metrics.totalWrites += 1;
    this.metrics.consumedWCU += units;
    this._recordHistory();
  }

  _chargeRead(units) {
    this._rollWindow();
    if (this.billingMode === 'PROVISIONED') {
      if (this._window.consumedRCU + units > this.provisionedThroughput.readCapacityUnits) {
        this.metrics.throttledRequests += 1;
        throw new ThrottledError(
          `Read throttled: table "${this.name}" exceeded provisioned RCU (${this.provisionedThroughput.readCapacityUnits}/s). ` +
          `Consider switching to ON_DEMAND or raising provisioned RCU.`
        );
      }
      this._window.consumedRCU += units;
    }
    this.metrics.totalReads += 1;
    this.metrics.consumedRCU += units;
    this._recordHistory();
  }

  putItem(item) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ValidationError('Item must be a JSON object.');
    }
    const pk = item[this.partitionKey];
    if (pk === undefined || pk === null || pk === '') {
      throw new ValidationError(`Item is missing required partition key "${this.partitionKey}".`);
    }
    let sk;
    if (this.sortKey) {
      sk = item[this.sortKey];
      if (sk === undefined || sk === null || sk === '') {
        throw new ValidationError(`Item is missing required sort key "${this.sortKey}".`);
      }
    }
    const key = this._key(pk, sk);
    const wcu = calcWCU(item);
    this._chargeWrite(wcu);

    const stored = {
      ...item,
      _id: this.items.get(key)?._id || uuidv4(),
      _createdAt: this.items.get(key)?._createdAt || new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    };
    this.items.set(key, stored);
    return { item: stored, consumedWCU: wcu };
  }

  getItem(pk, sk) {
    const key = this._key(pk, sk);
    const item = this.items.get(key);
    const rcu = item ? calcRCU(item) : 0.5;
    this._chargeRead(rcu);
    return { item: item || null, consumedRCU: rcu };
  }

  deleteItem(pk, sk) {
    const key = this._key(pk, sk);
    const existed = this.items.delete(key);
    this.metrics.totalDeletes += 1;
    if (!existed) {
      throw new NotFoundError('Item not found.');
    }
    return { deleted: true };
  }

  query(pk, skCondition) {
    // skCondition: { op: 'eq'|'begins_with'|'between'|'gt'|'lt'|'gte'|'lte', value, value2 }
    const results = [];
    let totalRCU = 0;
    for (const item of this.items.values()) {
      if (item[this.partitionKey] !== pk) continue;
      if (this.sortKey && skCondition && skCondition.value !== undefined && skCondition.value !== '') {
        const skVal = item[this.sortKey];
        const match = this._matchSortKey(skVal, skCondition);
        if (!match) continue;
      }
      const rcu = calcRCU(item);
      totalRCU += rcu;
      results.push(item);
    }
    this._chargeRead(Math.max(0.5, totalRCU));
    return { items: results, consumedRCU: Math.max(0.5, totalRCU) };
  }

  _matchSortKey(skVal, cond) {
    const { op, value, value2 } = cond;
    switch (op) {
      case 'begins_with':
        return String(skVal).startsWith(String(value));
      case 'gt':
        return skVal > value;
      case 'gte':
        return skVal >= value;
      case 'lt':
        return skVal < value;
      case 'lte':
        return skVal <= value;
      case 'between':
        return skVal >= value && skVal <= value2;
      case 'eq':
      default:
        return String(skVal) === String(value);
    }
  }

  scan() {
    const items = Array.from(this.items.values());
    let totalRCU = 0;
    for (const item of items) totalRCU += calcRCU(item);
    this._chargeRead(Math.max(0.5, totalRCU));
    return { items, consumedRCU: Math.max(0.5, totalRCU) };
  }

  /** Sweep expired TTL items. Called periodically by the engine. */
  sweepExpired() {
    const now = nowSeconds();
    const removed = [];
    for (const [key, item] of this.items.entries()) {
      if (typeof item.ttl === 'number' && item.ttl <= now) {
        this.items.delete(key);
        this.metrics.ttlExpirations += 1;
        const record = {
          eventId: uuidv4(),
          eventName: 'REMOVE',
          reason: 'TTL_EXPIRY',
          table: this.name,
          keys: { [this.partitionKey]: item[this.partitionKey], ...(this.sortKey ? { [this.sortKey]: item[this.sortKey] } : {}) },
          oldImage: item,
          timestamp: new Date().toISOString(),
        };
        this.streamEvents.unshift(record);
        removed.push(record);
      }
    }
    if (this.streamEvents.length > 50) this.streamEvents.length = 50;
    return removed;
  }

  /** Cost Advisor enhancement: estimate monthly cost under both modes. */
  costAdvisor() {
    // Extrapolate observed totals to a monthly figure using a simple
    // "requests so far vs. time elapsed since table creation" rate.
    const elapsedSec = Math.max(1, (Date.now() - new Date(this.createdAt).getTime()) / 1000);
    const secondsPerMonth = 30 * 24 * 3600;
    const projectedWCU = (this.metrics.consumedWCU / elapsedSec) * secondsPerMonth;
    const projectedRCU = (this.metrics.consumedRCU / elapsedSec) * secondsPerMonth;

    const onDemandCost =
      (projectedWCU / 1_000_000) * PRICING.onDemand.writeRequestUnitPer1M +
      (projectedRCU / 1_000_000) * PRICING.onDemand.readRequestUnitPer1M;

    const provisionedCost =
      this.provisionedThroughput.writeCapacityUnits * PRICING.provisioned.wcuHour * 24 * 30 +
      this.provisionedThroughput.readCapacityUnits * PRICING.provisioned.rcuHour * 24 * 30;

    const recommendation = onDemandCost <= provisionedCost ? 'ON_DEMAND' : 'PROVISIONED';

    return {
      projectedMonthlyWCU: Math.round(projectedWCU),
      projectedMonthlyRCU: Math.round(projectedRCU),
      estimatedOnDemandMonthlyCostUSD: Number(onDemandCost.toFixed(4)),
      estimatedProvisionedMonthlyCostUSD: Number(provisionedCost.toFixed(4)),
      currentMode: this.billingMode,
      recommendation,
      potentialSavingsUSD: Number(Math.abs(onDemandCost - provisionedCost).toFixed(4)),
    };
  }

  toSummaryJSON() {
    return {
      name: this.name,
      partitionKey: this.partitionKey,
      sortKey: this.sortKey,
      billingMode: this.billingMode,
      provisionedThroughput: this.provisionedThroughput,
      itemCount: this.items.size,
      createdAt: this.createdAt,
      status: this.status,
      metrics: this.metrics,
    };
  }
}

class DynamoSimEngine {
  constructor() {
    this.tables = new Map();
    this._sweeperHandle = null;
  }

  startTTLSweeper(intervalMs = 2000) {
    if (this._sweeperHandle) return;
    this._sweeperHandle = setInterval(() => {
      for (const table of this.tables.values()) {
        table.sweepExpired();
      }
    }, intervalMs);
    if (this._sweeperHandle.unref) this._sweeperHandle.unref();
  }

  createTable({ name, partitionKey, sortKey, billingMode, rcu, wcu }) {
    if (!name || !partitionKey) {
      throw new ValidationError('Table name and partitionKey are required.');
    }
    if (this.tables.has(name)) {
      throw new ValidationError(`Table "${name}" already exists.`);
    }
    const table = new Table({ name, partitionKey, sortKey, billingMode, rcu, wcu });
    this.tables.set(name, table);
    return table;
  }

  deleteTable(name) {
    if (!this.tables.has(name)) throw new NotFoundError(`Table "${name}" does not exist.`);
    this.tables.delete(name);
    return { deleted: true };
  }

  listTables() {
    return Array.from(this.tables.values()).map((t) => t.toSummaryJSON());
  }

  getTable(name) {
    const table = this.tables.get(name);
    if (!table) throw new NotFoundError(`Table "${name}" does not exist.`);
    return table;
  }
}

module.exports = {
  DynamoSimEngine,
  ThrottledError,
  ValidationError,
  NotFoundError,
  ConditionalCheckFailedError,
};
