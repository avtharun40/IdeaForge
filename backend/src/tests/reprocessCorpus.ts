import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Paper from '../models/Paper.js';
import { processPaper } from '../services/paperProcessingService.js';
import { buildPaperGraph } from '../services/graphBuilderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const reprocessCorpus = async () => {
  console.log('====================================================');
  console.log('     REPROCESSING 5-PAPER CORPUS WITH NEW LOGIC     ');
  console.log('====================================================\n');

  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 6000 });

  const papers = await Paper.find({});
  console.log(`Found ${papers.length} papers in MongoDB to update.`);

  for (const paper of papers) {
    console.log(`\n--- Reprocessing: "${paper.title}" (${paper._id}) ---`);
    console.log(`    Previous Year: ${paper.year}, Authors: ${paper.authors.map(a => a.name).join(', ')}`);
    
    // Run the improved PDF, Year, Author, Title extraction pipeline
    await processPaper(String(paper._id));

    // Reload updated paper
    const updated = await Paper.findById(paper._id);
    console.log(`    Updated Title: "${updated?.title}"`);
    console.log(`    Updated Year: ${updated?.year}`);
    console.log(`    Updated Authors: ${updated?.authors.map(a => a.name).join(', ')}`);

    // Ensure Neo4j has updated paper metadata
    await buildPaperGraph(String(paper._id));
    console.log(`    Synchronized Knowledge Graph in Neo4j.`);
  }

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('          CORPUS REPROCESSING COMPLETE              ');
  console.log('====================================================\n');
};

reprocessCorpus().catch(err => {
  console.error('Reprocessing error:', err);
  process.exit(1);
});
