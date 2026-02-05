/**
 * JTBD Interview Agent (PRD-04)
 *
 * Manages interview flow, phase transitions, and response generation.
 */

import { INTERVIEW_SYSTEM_PROMPT, PHASE_PROMPTS } from './prompts';

export type InterviewPhase =
  | 'rapport'
  | 'first_thought'
  | 'passive_looking'
  | 'active_looking'
  | 'deciding'
  | 'first_use'
  | 'wrap_up';

const PHASE_ORDER: InterviewPhase[] = [
  'rapport',
  'first_thought',
  'passive_looking',
  'active_looking',
  'deciding',
  'first_use',
  'wrap_up',
];

// Approximate time targets per phase (in exchanges, not seconds)
const PHASE_MAX_EXCHANGES: Record<InterviewPhase, number> = {
  rapport: 4,
  first_thought: 6,
  passive_looking: 4,
  active_looking: 6,
  deciding: 4,
  first_use: 8,
  wrap_up: 3,
};

export interface ConversationMessage {
  role: 'user' | 'interviewer' | 'system';
  content: string;
}

export interface AgentState {
  phase: InterviewPhase;
  phaseExchangeCount: number;
  totalExchangeCount: number;
  messages: ConversationMessage[];
}

export function createInitialState(): AgentState {
  return {
    phase: 'rapport',
    phaseExchangeCount: 0,
    totalExchangeCount: 0,
    messages: [],
  };
}

/**
 * Determine if we should transition to the next phase.
 */
export function shouldTransition(state: AgentState): InterviewPhase | null {
  const maxExchanges = PHASE_MAX_EXCHANGES[state.phase];

  if (state.phaseExchangeCount >= maxExchanges) {
    const currentIndex = PHASE_ORDER.indexOf(state.phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      return PHASE_ORDER[currentIndex + 1];
    }
  }

  // Hard limit: after ~35 total exchanges, start wrapping up
  if (state.totalExchangeCount >= 35 && state.phase !== 'wrap_up') {
    return 'wrap_up';
  }

  return null;
}

/**
 * Build the prompt for the AI model.
 */
export function buildPrompt(state: AgentState): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];

  // System prompt
  messages.push({
    role: 'system',
    content: INTERVIEW_SYSTEM_PROMPT,
  });

  // Phase-specific instruction
  messages.push({
    role: 'system',
    content: PHASE_PROMPTS[state.phase] || '',
  });

  // Conversation history
  for (const msg of state.messages) {
    messages.push({
      role: msg.role === 'interviewer' ? 'assistant' : msg.role === 'user' ? 'user' : 'system',
      content: msg.content,
    });
  }

  return messages;
}

/**
 * Generate the next interviewer response using an LLM.
 * This is the core function that calls the AI.
 */
export async function generateResponse(
  state: AgentState,
  apiKey: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<{ content: string; newState: AgentState }> {
  const prompt = buildPrompt(state);

  // Check for phase transition
  const nextPhase = shouldTransition(state);
  if (nextPhase) {
    // Add transition instruction
    prompt.push({
      role: 'system',
      content: `[Phase transition: Move to the ${nextPhase.replace('_', ' ')} phase now. Smoothly transition the conversation.]`,
    });
  }

  // Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 300, // Keep responses concise
      system: prompt.filter(m => m.role === 'system').map(m => m.content).join('\n\n'),
      messages: prompt.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const content = data.content[0]?.text || "I appreciate you sharing that. Could you tell me more?";

  // Update state
  const newState: AgentState = {
    phase: nextPhase || state.phase,
    phaseExchangeCount: nextPhase ? 1 : state.phaseExchangeCount + 1,
    totalExchangeCount: state.totalExchangeCount + 1,
    messages: [
      ...state.messages,
      { role: 'interviewer', content },
    ],
  };

  return { content, newState };
}

/**
 * Process a user message and generate a response.
 */
export async function processUserMessage(
  state: AgentState,
  userMessage: string,
  apiKey: string,
): Promise<{ response: string; newState: AgentState; phase: InterviewPhase }> {
  // Add user message to state
  const stateWithMessage: AgentState = {
    ...state,
    messages: [...state.messages, { role: 'user', content: userMessage }],
  };

  // Generate response
  const { content, newState } = await generateResponse(stateWithMessage, apiKey);

  return {
    response: content,
    newState,
    phase: newState.phase,
  };
}

/**
 * Generate the opening message for a new interview.
 */
export async function generateOpeningMessage(
  apiKey: string,
  context?: { participantName?: string }
): Promise<string> {
  const state = createInitialState();
  const prompt = buildPrompt(state);

  if (context?.participantName) {
    prompt.push({
      role: 'system',
      content: `The participant's name is ${context.participantName}. Use it naturally.`,
    });
  }

  prompt.push({
    role: 'user',
    content: '[Session started — generate your opening greeting]',
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: prompt.filter(m => m.role === 'system').map(m => m.content).join('\n\n'),
      messages: [{ role: 'user', content: '[Session started — generate your opening greeting]' }],
    }),
  });

  if (!response.ok) {
    return "Hi there! Thanks for taking the time to chat with me today. I'd love to hear about your experience. To start, could you tell me a little about yourself and how you use the product?";
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  return data.content[0]?.text || "Hi! Thanks for joining. I'd love to hear about your experience. Could you start by telling me a little about yourself?";
}
