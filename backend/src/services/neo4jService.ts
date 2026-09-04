import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

/**
 * Initializes and retrieves the shared Neo4j driver connection.
 */
export const getNeo4jDriver = (): Driver => {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error('Neo4j credentials are not fully configured in backend/.env.');
  }

  // Create single driver instance
  driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return driver;
};

/**
 * Verifies connectivity to the Neo4j cluster.
 */
export const verifyConnection = async (): Promise<boolean> => {
  try {
    const drv = getNeo4jDriver();
    await drv.verifyConnectivity();
    console.log('[Neo4j] Connectivity check succeeded.');
    return true;
  } catch (err) {
    console.error('[Neo4j] Connectivity check failed:', err);
    return false;
  }
};

let mockHandler: ((cypher: string, params: any) => Promise<any>) | null = null;

/**
 * Configure a mock query execution handler (useful for testing in ESM environments).
 */
export const setMockQueryHandler = (handler: typeof mockHandler) => {
  mockHandler = handler;
};

/**
 * Runs a Cypher query inside a new autocommit transaction session.
 */
export const runQuery = async (cypher: string, params: any = {}): Promise<any> => {
  if (mockHandler) {
    return await mockHandler(cypher, params);
  }
  const drv = getNeo4jDriver();
  const session = drv.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  try {
    const result = await session.run(cypher, params);
    return result;
  } finally {
    await session.close();
  }
};

/**
 * Runs a transactional sequence within an explicit session transaction block.
 * Automatically commits if successful, rolls back on error.
 */
export const runTransaction = async <T>(
  callback: (tx: any) => Promise<T>
): Promise<T> => {
  const drv = getNeo4jDriver();
  const session = drv.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  const tx = session.beginTransaction();
  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (err) {
    console.error('[Neo4j] Transaction error. Rolling back changes...', err);
    await tx.rollback();
    throw err;
  } finally {
    await session.close();
  }
};

/**
 * Creates unique constraints for primary node identifiers if they don't already exist.
 */
export const initializeConstraints = async (): Promise<void> => {
  console.log('[Neo4j] Initializing unique constraints...');
  const constraints = [
    'CREATE CONSTRAINT paper_id_unique IF NOT EXISTS FOR (p:Paper) REQUIRE p.paper_id IS UNIQUE',
    'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:ResearchEntity) REQUIRE e.entity_id IS UNIQUE',
    'CREATE CONSTRAINT claim_id_unique IF NOT EXISTS FOR (c:Claim) REQUIRE c.claim_id IS UNIQUE',
    'CREATE CONSTRAINT limitation_id_unique IF NOT EXISTS FOR (l:Limitation) REQUIRE l.limitation_id IS UNIQUE',
    'CREATE CONSTRAINT future_work_id_unique IF NOT EXISTS FOR (f:FutureWork) REQUIRE f.future_work_id IS UNIQUE'
  ];

  for (const cypher of constraints) {
    try {
      await runQuery(cypher);
    } catch (err: any) {
      console.warn(`[Neo4j] Constraint setup warning: ${err.message}`);
    }
  }
  console.log('[Neo4j] Constraint setup completed.');
};

/**
 * Closes the Neo4j driver connection.
 */
export const close = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    driver = null;
    console.log('[Neo4j] Driver connection closed.');
  }
};
