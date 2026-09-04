export interface ExtractedMetadata {
  concepts: { name: string; description: string }[];
  methods: { name: string; description?: string }[];
  datasets: { name: string; description?: string }[];
  limitations: string[];
  futureWork: string[];
}

// Pre-defined domain vocabulary dictionaries with descriptions
const CONCEPTS_DICT = [
  { name: 'Federated Learning', keywords: [/federated learning/i, /decentralized learning/i], description: 'A decentralized machine learning approach that trains algorithms across local data samples without exchanging them.' },
  { name: 'Differential Privacy', keywords: [/differential privacy/i, /local differential privacy/i], description: 'A system for sharing information about a dataset by describing patterns of groups while withholding individual identities.' },
  { name: 'Edge Computing', keywords: [/edge computing/i, /edge devices/i, /mobile edge/i], description: 'A distributed computing paradigm that brings computation and data storage closer to the sources of data.' },
  { name: 'Deep Learning', keywords: [/deep learning/i, /neural network/i, /deep neural/i], description: 'A subset of machine learning based on artificial neural networks with representation learning.' },
  { name: 'Privacy utility trade-off', keywords: [/privacy-utility/i, /utility trade-off/i], description: 'The optimization challenge of balancing data privacy protections against the accuracy or utility of analytics.' },
  { name: 'Homomorphic Encryption', keywords: [/homomorphic encryption/i, /secure computation/i], description: 'A form of encryption that allows computation to be performed on ciphertexts, generating an encrypted result.' },
  { name: 'Adversarial Attacks', keywords: [/adversarial attack/i, /model poisoning/i, /data poisoning/i], description: 'Techniques that attempt to fool or compromise machine learning models by providing deceptive inputs.' },
  { name: 'Transfer Learning', keywords: [/transfer learning/i, /pre-trained/i], description: 'A research problem in machine learning that focuses on storing knowledge gained while solving one problem and applying it to a different but related problem.' }
];

const METHODS_DICT = [
  { name: 'Transformer', keywords: [/transformer/i, /self-attention/i, /attention mechanism/i], description: 'A deep learning model architecture relying on self-attention mechanisms to compute representations.' },
  { name: 'CNN (Convolutional Neural Network)', keywords: [/\bcnn\b/i, /convolutional/i], description: 'A class of deep neural networks commonly applied to analyzing visual imagery.' },
  { name: 'GNN (Graph Neural Network)', keywords: [/\bgnn\b/i, /graph neural/i, /graph network/i], description: 'Neural networks designed to capture graph structure and node/edge relationships.' },
  { name: 'Random Forest', keywords: [/random forest/i, /decision tree/i], description: 'An ensemble learning method for classification or regression that constructs a multitude of decision trees.' },
  { name: 'Support Vector Machine (SVM)', keywords: [/\bsvm\b/i, /support vector machine/i], description: 'A supervised machine learning model that uses classification algorithms for two-group classification problems.' },
  { name: 'BERT', keywords: [/\bbert\b/i, /bidirectional encoder/i], description: 'A transformer-based machine learning technique for natural language processing pre-training.' },
  { name: 'FedAvg', keywords: [/fedavg/i, /federated averaging/i], description: 'The standard model aggregation algorithm used to combine local updates in federated learning.' },
  { name: 'DP-SGD', keywords: [/dp-sgd/i, /differentially private sgd/i], description: 'Stochastic Gradient Descent algorithm modified with gradient clipping and noise addition for differential privacy.' }
];

const DATASETS_DICT = [
  { name: 'MNIST', keywords: [/\bmnist\b/i], description: 'A database of handwritten digits commonly used for training image processing systems.' },
  { name: 'CIFAR-10', keywords: [/cifar-10\b/i], description: 'A collection of 60,000 images in 10 classes, commonly used to train computer vision algorithms.' },
  { name: 'CIFAR-100', keywords: [/cifar-100\b/i], description: 'A dataset of 60,000 images in 100 classes, similar to CIFAR-10 but with finer granularity.' },
  { name: 'ImageNet', keywords: [/imagenet/i], description: 'A large visual database designed for use in visual object recognition software research.' },
  { name: 'FEMNIST', keywords: [/femnist/i, /federated extended mnist/i], description: 'A federated version of Extended MNIST, grouped by writers for realistic decentralized simulation.' },
  { name: 'CelebA', keywords: [/celeba/i], description: 'A large-scale face attributes dataset containing over 200,000 celebrity images.' },
  { name: 'Shakespeare', keywords: [/shakespeare/i], description: 'A text dataset built from the collective works of William Shakespeare for federated text generation.' },
  { name: 'GLUE Benchmark', keywords: [/\bglue\b/i, /general language understanding/i], description: 'A collection of resources for training, evaluating, and analyzing natural language understanding systems.' }
];

/**
 * Extracts sentences matching specific keywords from a text block.
 */
const extractSentencesWithKeywords = (text: string, keywords: string[]): string[] => {
  if (!text) return [];
  
  // Clean newlines to prevent broken sentence matching
  const flatText = text.replace(/\s+/g, ' ');
  // Split into sentences using simple punctuation check
  const sentences = flatText.split(/(?<=[.!?])\s+/);
  const matchedSentences: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 15 || trimmed.length > 400) continue;

    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(trimmed)) {
        matchedSentences.push(trimmed);
        break; // Match first keyword, go to next sentence
      }
    }
    
    // Limit to 4 sentences max for readability
    if (matchedSentences.length >= 4) break;
  }

  return matchedSentences;
};

/**
 * Deterministically extracts candidate Concepts, Methods, Datasets, Limitations, and Future Work from PDF text.
 */
export const extractResearchMetadata = (
  text: string,
  sections: any
): ExtractedMetadata => {
  const concepts: { name: string; description: string }[] = [];
  const methods: { name: string; description?: string }[] = [];
  const datasets: { name: string; description?: string }[] = [];

  // 1. Concept Extraction
  CONCEPTS_DICT.forEach(concept => {
    for (const kw of concept.keywords) {
      if (kw.test(text)) {
        concepts.push({ name: concept.name, description: concept.description });
        break;
      }
    }
  });

  // 2. Methods Extraction
  METHODS_DICT.forEach(method => {
    for (const kw of method.keywords) {
      if (kw.test(text)) {
        methods.push({ name: method.name, description: method.description });
        break;
      }
    }
  });

  // 3. Dataset Extraction
  DATASETS_DICT.forEach(dataset => {
    for (const kw of dataset.keywords) {
      if (kw.test(text)) {
        datasets.push({ name: dataset.name, description: dataset.description });
        break;
      }
    }
  });

  // 4. Limitations Extraction
  let limitations: string[] = [];
  if (sections.limitations) {
    // Extract sentences from the detected Limitations section
    limitations = extractSentencesWithKeywords(sections.limitations, ['limit', 'limitation', 'drawback', 'weakness', 'flaw', 'scope', 'issue']);
  }
  // Fallback to scanning whole text if section is null or yielded no sentences
  if (limitations.length === 0) {
    limitations = extractSentencesWithKeywords(text, ['limitation', 'drawback', 'flaw', 'downside', 'assumption']);
  }

  // 5. Future Work Extraction
  let futureWork: string[] = [];
  if (sections.futureWork) {
    // Extract sentences from the detected Future Work section
    futureWork = extractSentencesWithKeywords(sections.futureWork, ['future', 'direction', 'extension', 'improve', 'explore', 'investigate']);
  }
  // Fallback to scanning whole text if section is null or yielded no sentences
  if (futureWork.length === 0) {
    futureWork = extractSentencesWithKeywords(text, ['future work', 'future research', 'open problem', 'challenges', 'future direction']);
  }

  return {
    concepts,
    methods,
    datasets,
    limitations: limitations.length > 0 ? limitations : ['Not detected'],
    futureWork: futureWork.length > 0 ? futureWork : ['Not detected']
  };
};
