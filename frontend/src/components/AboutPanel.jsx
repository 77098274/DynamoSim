export default function AboutPanel() {
  return (
    <div className="about-panel">
      <h1>How Amazon DynamoDB works</h1>
      <p className="about-panel__lede">
        This reference explains the real AWS service this app simulates — useful context for understanding the
        app's design and for the project demonstration.
      </p>

      <section>
        <h2>What is DynamoDB?</h2>
        <p>
          Amazon DynamoDB is a fully managed, serverless NoSQL key-value and document database. Unlike relational
          databases, it has no fixed schema beyond its primary key — each item (row) can carry different attributes.
          It automatically scales storage and throughput and is designed for single-digit millisecond latency at any
          scale.
        </p>
      </section>

      <section>
        <h2>Tables, items &amp; primary keys</h2>
        <p>
          Data lives in <strong>tables</strong>. Each table has a <strong>primary key</strong> that uniquely
          identifies every item:
        </p>
        <ul>
          <li>
            <strong>Partition key only</strong> (simple primary key) — DynamoDB hashes this value to decide which
            internal storage partition holds the item. All items must have a unique partition key value.
          </li>
          <li>
            <strong>Partition key + sort key</strong> (composite primary key) — items sharing a partition key are
            grouped together and stored sorted by the sort key, enabling efficient range queries (e.g. all orders for
            one customer, sorted by date).
          </li>
        </ul>
        <p>This app's "Create table" form mirrors this exactly: a required partition key and an optional sort key.</p>
      </section>

      <section>
        <h2>Core operations simulated here</h2>
        <ul>
          <li><strong>PutItem</strong> — insert or fully replace an item.</li>
          <li><strong>GetItem</strong> — fetch one item by its exact primary key.</li>
          <li><strong>UpdateItem</strong> — merge new attribute values into an existing item.</li>
          <li><strong>DeleteItem</strong> — remove one item by key.</li>
          <li><strong>Query</strong> — fetch all items sharing a partition key, optionally filtered by a sort-key condition (equals, begins_with, between, comparisons) — the efficient, recommended access pattern.</li>
          <li><strong>Scan</strong> — read every item in the table; simple but less efficient at scale, same trade-off as in real DynamoDB.</li>
        </ul>
      </section>

      <section>
        <h2>Capacity modes &amp; throughput</h2>
        <p>
          DynamoDB bills in one of two modes, both reproduced here:
        </p>
        <ul>
          <li>
            <strong>On-demand</strong> — pay per request, scales instantly, no capacity planning. Good for
            unpredictable traffic.
          </li>
          <li>
            <strong>Provisioned</strong> — you reserve fixed Read/Write Capacity Units (RCU/WCU) per second. Exceeding
            them causes <em>throttling</em> (<code>ProvisionedThroughputExceededException</code>) — this app actually
            enforces that per-second limit and will return HTTP 429 once you exceed it, just like real DynamoDB.
          </li>
        </ul>
        <p>
          Capacity math: 1 WCU covers one write of up to 1&nbsp;KB; 1 RCU covers one strongly-consistent read of up to
          4&nbsp;KB (eventually-consistent reads cost half as much) — the same formulas AWS publishes.
        </p>
      </section>

      <section>
        <h2>Enhancement: TTL (Time To Live) + Capacity &amp; Cost Advisor</h2>
        <p>
          Real DynamoDB supports attaching a <code>ttl</code> attribute (a Unix epoch timestamp) to an item; AWS then
          automatically deletes it after expiry, at no extra write cost. This app implements the same idea with a
          background sweeper (accelerated to seconds instead of DynamoDB's up-to-48h window, purely for classroom
          demo purposes), and surfaces expirations as simulated <strong>DynamoDB Stream</strong> events — exactly the
          pattern real applications use to react to expiring data (e.g. session cleanup, cache invalidation).
        </p>
        <p>
          On top of that, the <strong>Capacity &amp; Cost Advisor</strong> panel projects a table's observed
          read/write traffic to a monthly volume and estimates cost under both billing modes, recommending the
          cheaper one — going beyond basic simulation into a decision-support tool, similar in spirit to AWS Cost
          Explorer recommendations.
        </p>
      </section>

      <section>
        <h2>Typical use cases</h2>
        <p>
          Session stores, shopping carts, leaderboards/gaming state, IoT device state, and any workload needing
          predictable low-latency access by key at massive scale.
        </p>
      </section>
    </div>
  );
}
