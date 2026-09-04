import mongoose from 'mongoose';
import neo4j from 'neo4j-driver';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const testLiveConnectivity = async () => {
  console.log('====================================================');
  console.log('       IDEAFORGE LIVE CONNECTIVITY DIAGNOSTIC       ');
  console.log('====================================================\n');

  // 1. Test Neo4j
  console.log('1. Testing Neo4j Connection...');
  const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neo4jUser = process.env.NEO4J_USERNAME || 'neo4j';
  const neo4jPass = process.env.NEO4J_PASSWORD || 'IDEAFORGE123';

  let neo4jStatus = 'FAILED';
  let neo4jDetails = '';
  try {
    const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPass));
    await driver.verifyConnectivity();
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    const res = await session.run('MATCH (n) RETURN count(n) as total');
    const count = res.records[0].get('total').toNumber();
    await session.close();
    await driver.close();
    neo4jStatus = 'CONNECTED';
    neo4jDetails = `Successfully connected. Total graph nodes: ${count}`;
  } catch (err: any) {
    neo4jDetails = `Error: ${err.message}`;
  }
  console.log(`   Neo4j Status: [${neo4jStatus}] -> ${neo4jDetails}\n`);

  // 2. Test Gemini API
  console.log('2. Testing Gemini API Key / Provider Configuration...');
  let geminiStatus = 'NOT CONFIGURED';
  let geminiDetails = '';
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey && geminiApiKey.length > 5) {
    geminiStatus = 'CONFIGURED';
    geminiDetails = `Key present (length: ${geminiApiKey.length}), Model: ${process.env.AI_MODEL || 'gemini-1.5-flash'}`;
  } else {
    geminiDetails = 'GEMINI_API_KEY is missing or empty in .env';
  }
  console.log(`   Gemini Status: [${geminiStatus}] -> ${geminiDetails}\n`);

  // 3. Test MongoDB DNS & Connection
  console.log('3. Testing MongoDB Atlas Connectivity...');
  let mongoStatus = 'FAILED';
  let mongoDetails = '';
  const mongoUri = process.env.MONGODB_URI || '';

  // Try setting public Google DNS
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch (e) {}

  try {
    console.log('   Attempting Mongoose connection (timeout: 6000ms)...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 6000 });
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const collectionNames = collections?.map(c => c.name).join(', ') || 'none';
    mongoStatus = 'CONNECTED';
    mongoDetails = `Successfully connected to database "${mongoose.connection.db?.databaseName}". Collections: [${collectionNames}]`;
    await mongoose.disconnect();
  } catch (err: any) {
    mongoDetails = `Failure reason: ${err.name}: ${err.message}`;
    if (err.message.includes('whitelist') || err.name === 'MongooseServerSelectionError') {
      mongoDetails += '\n   [NOTE: This usually indicates IP Whitelist or network firewall blocking port 27017 to Atlas]';
    }
  }
  console.log(`   MongoDB Status: [${mongoStatus}] -> ${mongoDetails}\n`);

  console.log('====================================================');
  console.log('                  SUMMARY MATRIX                    ');
  console.log('====================================================');
  console.log(`   Neo4j:   ${neo4jStatus}`);
  console.log(`   Gemini:  ${geminiStatus}`);
  console.log(`   MongoDB: ${mongoStatus}`);
  console.log('====================================================\n');
};

testLiveConnectivity().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
