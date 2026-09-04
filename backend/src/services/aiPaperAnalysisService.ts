import Paper, { IPaperSections } from '../models/Paper.js';
import { getAIProvider } from './ai/aiProvider.js';
import { buildPaperGraph } from './graphBuilderService.js';

/**
 * Orchestrates structured AI analysis for a processed research paper.
 * Concatenates academic sections, feeds the provider, and updates Mongoose documents statefully.
 * 
 * @param paperId The MongoDB ID of the target paper.
 * @param force Force analysis even if the paper is already analyzed.
 */
export const analyzePaper = async (paperId: string, force = false): Promise<void> => {
  const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
  const providerName = process.env.AI_PROVIDER || 'gemini';
  const version = '1.0.0';

  try {
    // 1. Fetch paper record
    const paper = await Paper.findById(paperId);
    if (!paper) {
      console.error(`[AI] Error: Paper record not found for ID ${paperId}`);
      return;
    }

    // Cost Control Check: Skip if already successfully analyzed (unless forced)
    if (!force && paper.aiAnalysis?.status === 'ready' && paper.aiAnalysis?.version === version && paper.processingStage === 'completed') {
      console.log(`[AI] Paper "${paper.title}" (${paperId}) already analyzed. Skipping to control cost.`);
      return;
    }

    console.log(`[AI] Starting analysis for paper "${paper.title}" (${paperId})`);

    // Initialize or update aiAnalysis status statefully
    paper.status = 'processing';
    paper.processingStage = 'analyzing';
    paper.processingProgress = 60;
    paper.processingMessage = 'Analyzing paper with Gemini deep learning...';
    paper.aiAnalysis = {
      status: 'processing',
      provider: providerName,
      model: modelName,
      version: version,
      analyzedAt: null,
      error: null,
      result: null
    };
    await paper.save();

    // 3. Build prioritized analysis context from extracted sections
    let contextText = '';
    if (paper.sections) {
      const prioritizedKeys: (keyof IPaperSections)[] = [
        'abstract',
        'introduction',
        'methodology',
        'results',
        'discussion',
        'conclusion',
        'limitations',
        'futureWork',
        'references'
      ];

      prioritizedKeys.forEach(key => {
        const text = paper.sections?.[key];
        if (text) {
          contextText += `=== SECTION: ${key.toUpperCase()} ===\n${text}\n\n`;
        }
      });
    }

    // Fallback: If sections are empty, concatenate paper text chunks
    if (contextText.trim().length === 0 && paper.chunks && paper.chunks.length > 0) {
      contextText = paper.chunks.map(c => `=== CHUNK ${c.chunkIndex} ===\n${c.text}`).join('\n\n');
    }

    // Safety Context Window Limit: Truncate context to ~200,000 characters if excessive
    if (contextText.length > 200000) {
      console.log(`[AI] Context size (${contextText.length} chars) exceeds 200k limit. Truncating context...`);
      contextText = contextText.substring(0, 200000) + '\n\n... [truncated due to context limits]';
    }

    // 4. Retrieve configured AI provider and invoke analysis
    const aiProvider = getAIProvider();
    const analysisResult = await aiProvider.analyzePaper({
      title: paper.title,
      abstract: paper.abstract || '',
      contextText
    });

    // Check if paper still exists before updating
    const existsAfterAI = await Paper.exists({ _id: paperId });
    if (!existsAfterAI) {
      console.log(`[AI] Paper ${paperId} was deleted during Gemini analysis. Aborting.`);
      return;
    }

    // 5. Schema validation check & persistence to MongoDB
    paper.aiAnalysis.result = analysisResult;
    paper.aiAnalysis.status = 'ready';
    paper.aiAnalysis.analyzedAt = new Date();
    paper.aiAnalysis.error = null;

    // Synchronize top-level metadata fields authoritatively with Gemini analysis
    if (analysisResult.concepts && analysisResult.concepts.length > 0) {
      paper.concepts = analysisResult.concepts.map(c => ({ name: c.name, description: c.description || '' }));
    }
    if (analysisResult.methods && analysisResult.methods.length > 0) {
      paper.methods = analysisResult.methods.map(m => ({ name: m.name, description: m.description || undefined }));
    }
    if (analysisResult.datasets && analysisResult.datasets.length > 0) {
      paper.datasets = analysisResult.datasets.map(d => ({ name: d.name, description: d.purpose || undefined }));
    }
    if (analysisResult.limitations && analysisResult.limitations.length > 0) {
      paper.limitations = analysisResult.limitations;
    }
    if (analysisResult.futureWork && analysisResult.futureWork.length > 0) {
      paper.futureWork = analysisResult.futureWork;
    }

    paper.processingStage = 'building_graph';
    paper.processingProgress = 85;
    paper.processingMessage = 'Building research knowledge graph in Neo4j...';
    await paper.save();
    console.log(`[AI] Analysis completed and metadata synchronized for paper "${paper.title}" (${paperId})`);

    // 6. Automatically construct/update Knowledge Graph in Neo4j
    try {
      const existsBeforeGraph = await Paper.exists({ _id: paperId });
      if (existsBeforeGraph) {
        await buildPaperGraph(paperId);
        console.log(`[Neo4j] Knowledge graph constructed automatically for paper "${paper.title}" (${paperId})`);
      }
    } catch (graphErr: any) {
      console.error(`[Neo4j] Auto graph construction failed for paper "${paper.title}" (${paperId}):`, graphErr);
      // Even if Neo4j is offline in isolated local mode, we continue, but log
    }

    // Finalize paper state
    const existsBeforeFinalize = await Paper.exists({ _id: paperId });
    if (!existsBeforeFinalize) {
      console.log(`[Pipeline] Paper ${paperId} was deleted. Skipping finalization.`);
      return;
    }

    paper.processingStage = 'finalizing';
    paper.processingProgress = 95;
    paper.processingMessage = 'Finalizing research insights...';
    await paper.save();

    paper.status = 'ready';
    paper.processingStage = 'completed';
    paper.processingProgress = 100;
    paper.processingMessage = 'Analysis complete';
    paper.processedAt = new Date();
    paper.processingError = null;
    await paper.save();
    console.log(`[Pipeline] Paper processing 100% complete for "${paper.title}" (${paperId})`);

  } catch (err: any) {
    console.error(`[AI] Analysis failed for paper ${paperId}:`, err);
    try {
      const exists = await Paper.exists({ _id: paperId });
      if (exists) {
        await Paper.findByIdAndUpdate(paperId, {
          $set: {
            status: 'failed',
            processingStage: 'failed',
            processingProgress: 0,
            processingError: err.message || 'Unknown error occurred during AI analysis.',
            'aiAnalysis.status': 'failed',
            'aiAnalysis.error': err.message || 'Unknown error occurred during AI parsing.',
            'aiAnalysis.provider': providerName,
            'aiAnalysis.model': modelName,
            'aiAnalysis.version': version,
            'aiAnalysis.analyzedAt': new Date()
          }
        });
      }
    } catch (dbErr) {
      console.error('[AI] Critical db error updating status after failure:', dbErr);
    }
  }
};
