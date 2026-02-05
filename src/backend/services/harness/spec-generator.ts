/**
 * Spec Generator (PRD-06)
 *
 * Builds implementation specs from tasks with user evidence.
 * Searches codebase for relevant files and generates acceptance criteria.
 */

export interface PiTaskSpec {
  // Context
  codebaseRef: string;           // Git repo URL
  relevantFiles: string[];       // Files to focus on
  codebaseContext: string;       // Relevant code snippets

  // Task
  objective: string;             // What to achieve
  acceptanceCriteria: string[];  // How to verify
  constraints: string[];         // What NOT to do

  // Evidence
  userQuotes: string[];          // Why this matters
  signalTypes: string[];         // What types of signals triggered this

  // Verification
  measurementPlan: string;       // How to measure impact
}

export interface TaskEvidence {
  title: string;
  description: string | null;
  task_type: string;
  priority_label: string;
  signals: Array<{
    signal_type: string;
    quote: string;
    context: string | null;
    analysis: string | null;
    confidence: number;
    intensity: number | null;
  }>;
}

/**
 * Generate a PiTaskSpec from task data and evidence.
 */
export function generateSpec(
  evidence: TaskEvidence,
  repoUrl: string,
  relevantFiles: string[],
  codeContext: string,
): PiTaskSpec {
  const userQuotes = evidence.signals.map(s => s.quote);
  const signalTypes = [...new Set(evidence.signals.map(s => s.signal_type))];

  // Generate acceptance criteria based on signal types
  const acceptanceCriteria = generateAcceptanceCriteria(evidence);

  // Generate constraints
  const constraints = [
    'Do not modify database schema without explicit approval',
    'Do not remove existing functionality',
    'Maintain backwards compatibility with existing API contracts',
    'Include appropriate error handling',
    'Follow existing code style and patterns',
  ];

  // Generate measurement plan
  const measurementPlan = generateMeasurementPlan(evidence);

  return {
    codebaseRef: repoUrl,
    relevantFiles,
    codebaseContext: codeContext,
    objective: buildObjective(evidence),
    acceptanceCriteria,
    constraints,
    userQuotes,
    signalTypes,
    measurementPlan,
  };
}

function buildObjective(evidence: TaskEvidence): string {
  let objective = evidence.title;

  if (evidence.description) {
    objective += `\n\n${evidence.description}`;
  }

  // Add context from signals
  const analyses = evidence.signals
    .filter(s => s.analysis)
    .map(s => s.analysis!)
    .slice(0, 3);

  if (analyses.length > 0) {
    objective += '\n\nUser research indicates:\n' + analyses.map(a => `- ${a}`).join('\n');
  }

  return objective;
}

function generateAcceptanceCriteria(evidence: TaskEvidence): string[] {
  const criteria: string[] = [];

  const signalTypes = new Set(evidence.signals.map(s => s.signal_type));

  if (signalTypes.has('struggling_moment')) {
    criteria.push('Users should be able to complete the task without confusion or frustration');
    // Extract specific struggles
    evidence.signals
      .filter(s => s.signal_type === 'struggling_moment')
      .slice(0, 2)
      .forEach(s => {
        criteria.push(`Address: "${s.quote}"`);
      });
  }

  if (signalTypes.has('desired_outcome')) {
    evidence.signals
      .filter(s => s.signal_type === 'desired_outcome')
      .slice(0, 2)
      .forEach(s => {
        criteria.push(`Enable: "${s.quote}"`);
      });
  }

  if (signalTypes.has('workaround')) {
    criteria.push('Eliminate the need for user workarounds');
  }

  if (signalTypes.has('firing_moment')) {
    criteria.push('Remove the condition that would cause users to leave');
  }

  // Default criteria
  criteria.push('All existing tests continue to pass');
  criteria.push('No regressions in related functionality');

  return criteria;
}

function generateMeasurementPlan(evidence: TaskEvidence): string {
  const signalTypes = evidence.signals.map(s => s.signal_type);
  const hasStruggling = signalTypes.includes('struggling_moment');
  const hasWorkaround = signalTypes.includes('workaround');

  let plan = 'After deployment, measure impact by:\n';
  plan += '1. Track the rate of related signals in new sessions (should decrease)\n';

  if (hasStruggling) {
    plan += '2. Monitor for struggling moments related to this area (target: 50%+ reduction)\n';
  }
  if (hasWorkaround) {
    plan += '3. Check if users still employ workarounds (target: workaround mentions drop to zero)\n';
  }

  plan += `${hasStruggling && hasWorkaround ? '4' : hasStruggling || hasWorkaround ? '3' : '2'}. Run follow-up interviews with affected users after 7 days\n`;

  return plan;
}

/**
 * Build a prompt for pi.dev from a PiTaskSpec.
 */
export function buildImplementationPrompt(spec: PiTaskSpec): string {
  let prompt = `# Implementation Task\n\n`;

  prompt += `## Objective\n${spec.objective}\n\n`;

  prompt += `## Why This Matters (User Evidence)\n`;
  for (const quote of spec.userQuotes.slice(0, 5)) {
    prompt += `> "${quote}"\n`;
  }
  prompt += '\n';

  prompt += `## Acceptance Criteria\n`;
  for (const criterion of spec.acceptanceCriteria) {
    prompt += `- [ ] ${criterion}\n`;
  }
  prompt += '\n';

  prompt += `## Constraints\n`;
  for (const constraint of spec.constraints) {
    prompt += `- ${constraint}\n`;
  }
  prompt += '\n';

  if (spec.relevantFiles.length > 0) {
    prompt += `## Relevant Files\n`;
    for (const file of spec.relevantFiles) {
      prompt += `- ${file}\n`;
    }
    prompt += '\n';
  }

  if (spec.codebaseContext) {
    prompt += `## Codebase Context\n\`\`\`\n${spec.codebaseContext}\n\`\`\`\n\n`;
  }

  prompt += `## Measurement Plan\n${spec.measurementPlan}\n`;

  return prompt;
}

/**
 * Search for relevant files in the codebase based on task keywords.
 * This is a simplified version — in production, would use better code search.
 */
export function extractKeywords(title: string, quotes: string[]): string[] {
  const text = [title, ...quotes].join(' ').toLowerCase();

  // Remove common stop words
  const stopWords = new Set(['the', 'a', 'an', 'is', 'it', 'to', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'of', 'with', 'i', 'my', 'we', 'they', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'not', 'no', 'so', 'if', 'then', 'just', 'that', 'this', 'what', 'when', 'how', 'why', 'which']);

  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Count frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Return top keywords by frequency
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
