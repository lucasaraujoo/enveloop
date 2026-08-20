/**
 * Fuzzy matching utilities for auto-filling form fields based on text similarity.
 *
 * Matching works in 3 layers (highest priority first):
 * 1. Substring containment — query contains target name or vice-versa → score 1.0
 * 2. Keyword dictionary — words from query match known keywords → score 1.0
 * 3. Dice coefficient — bigram-based string similarity → score 0-1 (threshold 0.85)
 */

const DEFAULT_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Keyword dictionary (source format: target → keywords[])
// ---------------------------------------------------------------------------

/**
 * Maps target terms (matched against envelope/category names) to their associated keywords.
 * This is the "source of truth" format — compact, editable, and compatible with Firestore.
 *
 * Future: this can be loaded from Firestore instead of being hardcoded.
 * Collection: keyword_groups / Doc per target → { keywords: [...] }
 */
export const DEFAULT_KEYWORD_GROUPS: Record<string, string[]> = {
  // Alimentação / Mercado
  alimentacao: [
    "pizza", "hamburguer", "burger", "lanche", "sushi", "acai",
    "ifood", "rappi", "padaria", "acougue", "hortifruti",
    "supermercado", "mercado", "feira", "comida", "refeicao", "marmita", "carne", "frango", "peixe", "legumes", "frutas",
  ],
  restaurante: [
    "pizza", "hamburguer", "burger", "lanche", "sushi", "acai",
    "ifood", "rappi", "comida", "refeicao", "almoco", "jantar", "marmita", "mexicana",
    "acaraje", "sorvete", "cafe", "pastel", "salgado",
  ],

  // Transporte
  transporte: [
    "uber", "99", "cabify", "gasolina", "combustivel",
    "estacionamento", "pedagio", "onibus", "metro", "etanol"
  ],

  // Saúde
  saude: [
    "farmacia", "drogasil", "drogaria", "hospital", "consulta",
    "dentista", "medico", "exame", "remedio", "laboratorio",
  ],

  // Entretenimento / Lazer
  entretenimento: [
    "cinema", "teatro", "show", "ingresso", "jogo",
  ],
  lazer: [
    "cinema", "teatro", "show", "ingresso", "viagem", "hotel", "passeio", "praia",
  ],
  assinaturas: [
    "netflix", "spotify", "disney", "hbo", "prime", "youtube",
    "deezer", "apple", "gamepass", "hbomax", "paramount",
  ],

  // Moradia
  moradia: [
    "aluguel", "condominio", "iptu", "energia", "agua",
    "internet", "gas", "luz", "eletricidade", "coelba", "embasa", "financiamento caixa"
  ],

  // Educação
  educacao: [
    "faculdade", "curso", "escola", "livro", "udemy", "alura",
    "mensalidade", "apostila", "material escolar",
  ],

  // Vestuário
  vestuario: [
    "roupa", "calcado", "sapato", "tenis", "camisa", "calca",
    "shein", "renner", "riachuelo", "zara", "cueca", "meia", "calcinha", "shorts", "bermuda",
  ],

  // Carro
  carro: [
    "gasolina", "combustivel", "estacionamento", "pedagio",
    "mecanico", "oficina", "pneu", "seguro", "ipva", "multa", "etanol",
  ],
};

// ---------------------------------------------------------------------------
// Keyword index (runtime format: keyword → targets[])
// ---------------------------------------------------------------------------

/**
 * Inverts the keyword groups into a flat index for O(1) lookup by keyword.
 * Called once at module load time.
 */
function buildKeywordIndex(
  groups: Record<string, string[]>
): Record<string, string[]> {
  const index: Record<string, string[]> = {};
  for (const [target, keywords] of Object.entries(groups)) {
    for (const keyword of keywords) {
      const norm = normalizeText(keyword);
      if (!index[norm]) index[norm] = [];
      if (!index[norm].includes(target)) index[norm].push(target);
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

/**
 * Normalize text for comparison: lowercase + remove diacritics (accents).
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Build the runtime index once at module load
const defaultKeywordIndex = buildKeywordIndex(DEFAULT_KEYWORD_GROUPS);

// ---------------------------------------------------------------------------
// Dice coefficient
// ---------------------------------------------------------------------------

/**
 * Generate bigrams (pairs of consecutive characters) from a string.
 */
function getBigrams(str: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculate Dice coefficient between two strings.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
export function diceCoefficient(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (normA === normB) return 1;
  if (normA.length < 2 || normB.length < 2) return 0;

  const bigramsA = getBigrams(normA);
  const bigramsB = getBigrams(normB);

  let matches = 0;
  const usedB = new Set<number>();

  for (const bg of bigramsA) {
    for (let j = 0; j < bigramsB.length; j++) {
      if (!usedB.has(j) && bg === bigramsB[j]) {
        matches++;
        usedB.add(j);
        break;
      }
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

// ---------------------------------------------------------------------------
// Score computation (3 layers)
// ---------------------------------------------------------------------------

/**
 * Compute a combined match score between a query and a target string.
 *
 * Layer 1: Substring containment (either direction) → score = 1.0
 * Layer 2: Keyword dictionary lookup → score = 1.0
 * Layer 3: Dice coefficient → score 0-1 (fallback)
 */
export function computeMatchScore(
  query: string,
  target: string,
  keywordIndex: Record<string, string[]> = defaultKeywordIndex
): number {
  const normQuery = normalizeText(query);
  const normTarget = normalizeText(target);

  if (!normQuery || !normTarget) return 0;

  // Layer 1: Exact match
  if (normQuery === normTarget) return 1;

  // Layer 1: Substring containment (either direction)
  if (normQuery.includes(normTarget) || normTarget.includes(normQuery)) {
    return 1;
  }

  // Layer 1: Check individual words from query against target
  const queryWords = normQuery.split(/\s+/).filter((w) => w.length >= 3);
  for (const word of queryWords) {
    if (normTarget.includes(word) || word.includes(normTarget)) {
      return 1;
    }
  }

  // Layer 2: Keyword dictionary lookup
  // Check each word from query against the keyword index
  const allWords = normQuery.split(/\s+/).filter((w) => w.length >= 2);
  for (const word of allWords) {
    const targets = keywordIndex[word];
    if (targets) {
      // Check if any target term from the dictionary matches the envelope/category name
      for (const dictTarget of targets) {
        const normDictTarget = normalizeText(dictTarget);
        if (
          normTarget.includes(normDictTarget) ||
          normDictTarget.includes(normTarget)
        ) {
          return 1;
        }
      }
    }
  }

  // Layer 3: Dice coefficient (fallback)
  return diceCoefficient(normQuery, normTarget);
}

// ---------------------------------------------------------------------------
// Main matching function
// ---------------------------------------------------------------------------

/**
 * Find the best matching item from a list based on text similarity.
 * Returns null if no item passes the threshold.
 *
 * @param query - The search text (e.g., transaction description)
 * @param items - The list of items to search through
 * @param getName - Function to extract the name from each item
 * @param threshold - Minimum score to consider a match (default: 0.85)
 * @param keywordGroups - Optional custom keyword groups (default: DEFAULT_KEYWORD_GROUPS)
 */
export function findBestMatch<T>(
  query: string,
  items: T[],
  getName: (item: T) => string,
  threshold: number = DEFAULT_THRESHOLD,
  keywordGroups?: Record<string, string[]>
): T | null {
  if (!query.trim() || items.length === 0) return null;

  const index = keywordGroups
    ? buildKeywordIndex(keywordGroups)
    : defaultKeywordIndex;

  let bestItem: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const name = getName(item);
    const score = computeMatchScore(query, name, index);

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= threshold ? bestItem : null;
}
