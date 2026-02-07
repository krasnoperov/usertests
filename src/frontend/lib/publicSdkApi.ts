interface PublicRequestOptions {
  method?: string;
  body?: unknown;
  key: string;
}

async function request<T>(path: string, options: PublicRequestOptions): Promise<T> {
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      'X-Project-Key': options.key,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error || `API Error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface PublicScreenerQuestion {
  id: string;
  question_text: string;
  question_type: string;
  required: number;
  options: string[] | null;
  min_value: number | null;
  max_value: number | null;
}

export interface PublicScreener {
  id: string;
  title: string;
  description: string | null;
  brand_color: string;
  welcome_message: string | null;
  incentive_type: string;
  incentive_description: string | null;
  consent_text: string;
}

export interface PublicScreenerResponse {
  qualified: boolean;
  session_id?: string;
  message?: string;
}

export interface PublicInterviewMessage {
  id: string;
  role: string;
  content: string;
  timestamp_ms: number;
}

export interface PublicInterviewSession {
  id: string;
  status: string;
  current_phase: string | null;
  participant_name: string | null;
  participant_email: string | null;
  started_at: string | null;
  completed_at: string | null;
  signal_count: number;
  summary: string | null;
  processing_status: string;
  next_step_message: string | null;
}

export const publicSdkApi = {
  getScreener: (screenerId: string, key: string) =>
    request<{ screener: PublicScreener; questions: PublicScreenerQuestion[] }>(
      `/api/sdk/screener/${screenerId}`,
      { key },
    ),

  submitScreener: (
    screenerId: string,
    key: string,
    payload: {
      participant_name?: string;
      participant_email?: string;
      answers: Record<string, unknown>;
      consent_given?: boolean;
      consent_recording?: boolean;
      consent_analytics?: boolean;
      consent_followup?: boolean;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    },
  ) =>
    request<PublicScreenerResponse>(`/api/sdk/screener/${screenerId}/respond`, {
      method: 'POST',
      key,
      body: payload,
    }),

  getInterview: (sessionId: string, key: string) =>
    request<{
      session: PublicInterviewSession;
      messages: PublicInterviewMessage[];
      recording: {
        audio_chunk_count: number;
        last_audio_chunk_index: number | null;
      };
    }>(`/api/sdk/interview/${sessionId}`, { key }),

  patchParticipant: (
    sessionId: string,
    key: string,
    payload: { participant_name?: string; participant_email?: string },
  ) =>
    request<{ success: boolean; participant_name: string | null; participant_email: string | null }>(
      `/api/sdk/interview/${sessionId}/participant`,
      {
        method: 'PATCH',
        key,
        body: payload,
      },
    ),

  startInterview: (sessionId: string, key: string) =>
    request<{ message: string; phase: string; session_id: string }>(`/api/sdk/interview/${sessionId}/start`, {
      method: 'POST',
      key,
      body: {},
    }),

  sendMessage: (sessionId: string, key: string, payload: { content: string; timestamp_ms?: number }) =>
    request<{ message: string; phase: string; is_complete: boolean; queued?: boolean }>(
      `/api/sdk/interview/${sessionId}/message`,
      {
        method: 'POST',
        key,
        body: payload,
      },
    ),

  endInterview: (sessionId: string, key: string) =>
    request<{ success: boolean; already_completed: boolean; queued: boolean }>(
      `/api/sdk/interview/${sessionId}/end`,
      {
        method: 'POST',
        key,
        body: {},
      },
    ),
};
