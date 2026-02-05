/**
 * Task Priority Scorer (PRD-05)
 *
 * Calculates priority scores based on:
 * - Frequency: how many sessions mention this issue
 * - Recency: how recent are the mentions
 * - Intensity: how strongly users express frustration
 * - Breadth: how many different user segments affected
 * - Signal Type: some types are more urgent
 */

export interface PriorityInput {
  signals: Array<{
    signal_type: string;
    confidence: number;
    intensity: number | null;
    created_at: string;
    session_id: string;
  }>;
}

export interface PriorityResult {
  score: number;       // 0-100
  label: string;       // critical, high, medium, low
  breakdown: {
    frequency: number;
    recency: number;
    intensity: number;
    breadth: number;
    urgency: number;
  };
}

// Weight factors
const WEIGHTS = {
  frequency: 0.30,
  recency: 0.20,
  intensity: 0.20,
  breadth: 0.15,
  urgency: 0.15,
};

// Signal type urgency multipliers
const SIGNAL_URGENCY: Record<string, number> = {
  firing_moment: 1.0,       // Users leaving = critical
  struggling_moment: 0.85,  // Frustration = high
  workaround: 0.70,         // Hacks = medium-high
  desired_outcome: 0.50,    // Feature requests = medium
  emotional_response: 0.60, // Strong emotions = medium-high
  hiring_criteria: 0.30,    // What's working = lower priority to fix
};

/**
 * Calculate priority score for a task based on its signals.
 */
export function calculatePriority(input: PriorityInput): PriorityResult {
  if (input.signals.length === 0) {
    return { score: 0, label: 'low', breakdown: { frequency: 0, recency: 0, intensity: 0, breadth: 0, urgency: 0 } };
  }

  // Frequency: normalize session count (log scale for diminishing returns)
  const uniqueSessions = new Set(input.signals.map(s => s.session_id)).size;
  const frequencyRaw = Math.log2(uniqueSessions + 1) / Math.log2(20); // 20 sessions = max
  const frequency = Math.min(100, frequencyRaw * 100);

  // Recency: weighted by how recent (exponential decay)
  const now = Date.now();
  const recencyScores = input.signals.map(s => {
    const age = now - new Date(s.created_at).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    return Math.exp(-daysOld / 30); // Half-life of ~30 days
  });
  const recency = Math.min(100, (recencyScores.reduce((a, b) => a + b, 0) / recencyScores.length) * 100);

  // Intensity: average of signal intensities (weighted by confidence)
  const intensities = input.signals
    .filter(s => s.intensity !== null)
    .map(s => (s.intensity ?? 0.5) * s.confidence);
  const intensity = intensities.length > 0
    ? Math.min(100, (intensities.reduce((a, b) => a + b, 0) / intensities.length) * 100)
    : 50;

  // Breadth: how many unique sessions (as percentage of a threshold)
  const breadth = Math.min(100, (uniqueSessions / 10) * 100); // 10 sessions = max breadth

  // Urgency: based on signal types
  const urgencyScores = input.signals.map(s => SIGNAL_URGENCY[s.signal_type] ?? 0.5);
  const urgency = Math.min(100, (Math.max(...urgencyScores)) * 100);

  // Weighted total
  const score = Math.round(
    frequency * WEIGHTS.frequency +
    recency * WEIGHTS.recency +
    intensity * WEIGHTS.intensity +
    breadth * WEIGHTS.breadth +
    urgency * WEIGHTS.urgency
  );

  const clampedScore = Math.max(0, Math.min(100, score));
  const label = clampedScore >= 80 ? 'critical'
    : clampedScore >= 60 ? 'high'
    : clampedScore >= 40 ? 'medium'
    : 'low';

  return {
    score: clampedScore,
    label,
    breakdown: {
      frequency: Math.round(frequency),
      recency: Math.round(recency),
      intensity: Math.round(intensity),
      breadth: Math.round(breadth),
      urgency: Math.round(urgency),
    },
  };
}

/**
 * Cluster signals into potential tasks.
 * Groups signals that likely refer to the same issue.
 */
export function clusterSignals(
  signals: Array<{
    id: string;
    signal_type: string;
    quote: string;
    session_id: string;
  }>
): Array<{ signals: string[]; representativeQuote: string; signalType: string }> {
  // Simple keyword-based clustering
  // In production, would use embeddings for semantic similarity

  const clusters: Array<{
    signals: string[];
    keywords: Set<string>;
    representativeQuote: string;
    signalType: string;
  }> = [];

  for (const signal of signals) {
    const words = signal.quote.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const wordSet = new Set(words);

    // Find best matching cluster
    let bestCluster: typeof clusters[0] | null = null;
    let bestOverlap = 0;

    for (const cluster of clusters) {
      // Only cluster same signal type
      if (cluster.signalType !== signal.signal_type) continue;

      const overlap = [...wordSet].filter(w => cluster.keywords.has(w)).length;
      const overlapRatio = overlap / Math.max(wordSet.size, cluster.keywords.size);

      if (overlapRatio > 0.3 && overlap > bestOverlap) {
        bestCluster = cluster;
        bestOverlap = overlap;
      }
    }

    if (bestCluster) {
      bestCluster.signals.push(signal.id);
      words.forEach(w => bestCluster!.keywords.add(w));
    } else {
      clusters.push({
        signals: [signal.id],
        keywords: wordSet,
        representativeQuote: signal.quote,
        signalType: signal.signal_type,
      });
    }
  }

  return clusters.map(c => ({
    signals: c.signals,
    representativeQuote: c.representativeQuote,
    signalType: c.signalType,
  }));
}
