/**
 * Signal Extraction Service (PRD-03)
 *
 * Analyzes transcripts and session data to extract JTBD signals.
 */

import { SIGNAL_EXTRACTION_PROMPT, TASK_SUGGESTION_PROMPT } from '../interview/prompts';

export interface ExtractedSignal {
  signal_type: string;
  quote: string;
  context: string;
  analysis: string;
  confidence: number;
  intensity: number;
  timestamp_ms?: number;
}

export interface SuggestedTask {
  title: string;
  description: string;
  task_type: string;
  priority_reasoning: string;
  effort_estimate: string;
  supporting_quotes: string[];
}

/**
 * Extract JTBD signals from a transcript using Claude.
 */
export async function extractSignals(
  transcript: string,
  apiKey: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<ExtractedSignal[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SIGNAL_EXTRACTION_PROMPT,
      messages: [{
        role: 'user',
        content: `Here is the interview transcript to analyze:\n\n${transcript}`,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Signal extraction failed: ${response.status} ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content[0]?.text || '[]';

  // Parse the JSON response
  try {
    // Find JSON array in the response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in signal extraction response');
      return [];
    }

    const signals = JSON.parse(jsonMatch[0]) as ExtractedSignal[];

    // Validate and clean
    return signals
      .filter(s =>
        s.signal_type &&
        s.quote &&
        typeof s.confidence === 'number'
      )
      .map(s => ({
        signal_type: s.signal_type,
        quote: s.quote,
        context: s.context || '',
        analysis: s.analysis || '',
        confidence: Math.min(1, Math.max(0, s.confidence)),
        intensity: Math.min(1, Math.max(0, s.intensity || 0.5)),
        timestamp_ms: s.timestamp_ms,
      }));
  } catch (e) {
    console.error('Failed to parse signal extraction response:', e);
    return [];
  }
}

/**
 * Suggest tasks from extracted signals.
 */
export async function suggestTasks(
  signals: ExtractedSignal[],
  apiKey: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<SuggestedTask[]> {
  if (signals.length === 0) return [];

  const signalSummary = signals
    .map(s => `[${s.signal_type}] "${s.quote}" (confidence: ${s.confidence}, intensity: ${s.intensity})`)
    .join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: TASK_SUGGESTION_PROMPT,
      messages: [{
        role: 'user',
        content: `Here are the JTBD signals to analyze:\n\n${signalSummary}\n\nReturn a JSON array of suggested tasks.`,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Task suggestion failed: ${response.status} ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content[0]?.text || '[]';

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const tasks = JSON.parse(jsonMatch[0]) as SuggestedTask[];
    return tasks.filter(t => t.title && t.task_type);
  } catch (e) {
    console.error('Failed to parse task suggestion response:', e);
    return [];
  }
}

/**
 * Build a transcript from session messages.
 */
export function buildTranscript(
  messages: Array<{ role: string; content: string; timestamp_ms: number }>
): string {
  return messages
    .map(m => {
      const time = formatTimestamp(m.timestamp_ms);
      const speaker = m.role === 'user' ? 'Participant' : m.role === 'interviewer' ? 'Interviewer' : 'System';
      return `[${time}] ${speaker}: ${m.content}`;
    })
    .join('\n');
}

/**
 * Build a merged timeline from messages and events.
 */
export function buildTimeline(
  messages: Array<{ role: string; content: string; timestamp_ms: number }>,
  events: Array<{ event_type: string; timestamp_ms: number; data_json: string; url?: string | null; target_text?: string | null }>
): Array<{ timestamp_ms: number; type: string; content: string }> {
  const timeline: Array<{ timestamp_ms: number; type: string; content: string }> = [];

  for (const msg of messages) {
    timeline.push({
      timestamp_ms: msg.timestamp_ms,
      type: msg.role === 'user' ? 'speech_user' : 'speech_interviewer',
      content: msg.content,
    });
  }

  for (const evt of events) {
    let content = evt.event_type;
    if (evt.url) content += `: ${evt.url}`;
    if (evt.target_text) content += ` [${evt.target_text}]`;

    timeline.push({
      timestamp_ms: evt.timestamp_ms,
      type: evt.event_type,
      content,
    });
  }

  // Sort by timestamp
  timeline.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  return timeline;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
