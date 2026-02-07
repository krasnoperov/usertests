/**
 * API client for the UserTests backend.
 */

const API_BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error || `API Error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- Projects ---

export const projectsAPI = {
  list: () => request<{ projects: Project[] }>('/projects'),
  get: (id: string) => request<{ project: Project; members: ProjectMember[] }>(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
};

// --- Sessions ---

export const sessionsAPI = {
  list: (projectId: string, params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return request<{ sessions: Session[]; total: number }>(`/projects/${projectId}/sessions${query}`);
  },
  get: (projectId: string, sessionId: string) =>
    request<{ session: Session; messages: SessionMessage[]; events: SessionEvent[] }>(
      `/projects/${projectId}/sessions/${sessionId}`
    ),
  create: (projectId: string, data: Partial<Session>) =>
    request<{ session: Session }>(`/projects/${projectId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  update: (projectId: string, sessionId: string, data: Partial<Session>) =>
    request<{ session: Session }>(
      `/projects/${projectId}/sessions/${sessionId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  delete: (projectId: string, sessionId: string) =>
    request(`/projects/${projectId}/sessions/${sessionId}`, { method: 'DELETE' }),
};

// --- Signals ---

export const signalsAPI = {
  list: (projectId: string, params?: { type?: string; session_id?: string; task_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.session_id) qs.set('session_id', params.session_id);
    if (params?.task_id) qs.set('task_id', params.task_id);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return request<{ signals: Signal[]; total: number }>(`/projects/${projectId}/signals${query}`);
  },
  link: (projectId: string, signalId: string, taskId: string) =>
    request(`/projects/${projectId}/signals/${signalId}/link`, { method: 'POST', body: JSON.stringify({ task_id: taskId }) }),
};

// --- Tasks ---

export const tasksAPI = {
  list: (projectId: string, params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return request<{ tasks: Task[]; total: number }>(`/projects/${projectId}/tasks${query}`);
  },
  get: (projectId: string, taskId: string) =>
    request<{ task: Task; signals: Signal[] }>(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId: string, data: { title: string; description?: string; task_type?: string; priority_score?: number }) =>
    request<{ task: Task }>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  update: (projectId: string, taskId: string, data: Partial<Task>) =>
    request<{ task: Task }>(
      `/projects/${projectId}/tasks/${taskId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  delete: (projectId: string, taskId: string) =>
    request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
  generateSpec: (projectId: string, taskId: string) =>
    request<{ spec: unknown; prompt: string; keywords: string[] }>(
      `/projects/${projectId}/tasks/${taskId}/spec`,
      { method: 'POST' }
    ),
  implement: (projectId: string, taskId: string, dryRun?: boolean) =>
    request<{ implementation: unknown; spec: unknown }>(
      `/projects/${projectId}/tasks/${taskId}/implement`,
      { method: 'POST', body: JSON.stringify({ dry_run: dryRun }) }
    ),
  measureImpact: (projectId: string, taskId: string) =>
    request<{ impact: unknown }>(
      `/projects/${projectId}/tasks/${taskId}/measure`,
      { method: 'POST' }
    ),
};

// --- Screeners ---

export const screenersAPI = {
  list: (projectId: string) =>
    request<{ screeners: Screener[] }>(`/projects/${projectId}/screeners`),
  get: (projectId: string, screenerId: string) =>
    request<{ screener: Screener; questions: ScreenerQuestion[]; responses: ScreenerResponse[] }>(
      `/projects/${projectId}/screeners/${screenerId}`
    ),
  create: (projectId: string, data: { title: string; description?: string; questions?: ScreenerQuestionInput[] }) =>
    request<{ screener: Screener; questions: ScreenerQuestion[] }>(
      `/projects/${projectId}/screeners`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  update: (projectId: string, screenerId: string, data: Partial<Screener>) =>
    request<{ screener: Screener }>(
      `/projects/${projectId}/screeners/${screenerId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  delete: (projectId: string, screenerId: string) =>
    request(`/projects/${projectId}/screeners/${screenerId}`, { method: 'DELETE' }),
  addQuestion: (projectId: string, screenerId: string, data: ScreenerQuestionInput) =>
    request<{ question: ScreenerQuestion }>(
      `/projects/${projectId}/screeners/${screenerId}/questions`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  updateQuestion: (projectId: string, screenerId: string, questionId: string, data: Partial<ScreenerQuestionInput>) =>
    request<{ question: ScreenerQuestion }>(
      `/projects/${projectId}/screeners/${screenerId}/questions/${questionId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  deleteQuestion: (projectId: string, screenerId: string, questionId: string) =>
    request<{ success: boolean }>(
      `/projects/${projectId}/screeners/${screenerId}/questions/${questionId}`,
      { method: 'DELETE' }
    ),
  reorderQuestions: (projectId: string, screenerId: string, questionIds: string[]) =>
    request<{ questions: ScreenerQuestion[] }>(
      `/projects/${projectId}/screeners/${screenerId}/questions/reorder`,
      { method: 'POST', body: JSON.stringify({ question_ids: questionIds }) }
    ),
};

// --- Overview ---

export const overviewAPI = {
  get: (projectId: string) =>
    request<OverviewData>(`/projects/${projectId}/overview`),
};

// --- Types (frontend) ---

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: number;
  github_repo_url: string | null;
  github_default_branch: string;
  public_key: string;
  secret_key: string;
  settings_json: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: number;
  role: string;
}

export interface Session {
  id: string;
  project_id: string;
  status: string;
  interview_mode: string;
  current_phase: string | null;
  participant_name: string | null;
  participant_email: string | null;
  signal_count: number;
  duration_seconds: number | null;
  summary: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SessionMessage {
  id: string;
  role: string;
  content: string;
  timestamp_ms: number;
}

export interface SessionEvent {
  id: number;
  event_type: string;
  timestamp_ms: number;
  data_json: string;
  target_selector: string | null;
  target_text: string | null;
  url: string | null;
  page_title: string | null;
}

export interface Signal {
  id: string;
  signal_type: string;
  quote: string;
  context: string | null;
  analysis: string | null;
  confidence: number;
  intensity: number | null;
  session_id: string;
  task_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority_score: number;
  priority_label: string;
  effort_estimate: string | null;
  signal_count: number;
  session_count: number;
  implementation_pr_url: string | null;
  deployed_at: string | null;
  impact_score: number | null;
  created_at: string;
}

export interface Screener {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  slug: string;
  status: string;
  max_participants: number | null;
  incentive_type: string;
  incentive_value_cents: number;
  incentive_description: string | null;
  logo_r2_key: string | null;
  brand_color: string;
  welcome_message: string | null;
  thank_you_message: string;
  disqualified_message: string;
  consent_text: string;
  view_count: number;
  start_count: number;
  complete_count: number;
  qualified_count: number;
  disqualified_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScreenerQuestion {
  id: string;
  screener_id: string;
  question_text: string;
  question_type: string;
  required: number;
  sort_order: number;
  options_json: string | null;
  min_value: number | null;
  max_value: number | null;
  qualification_rules_json: string | null;
  created_at: string;
}

export interface ScreenerQuestionInput {
  question_text: string;
  question_type: string;
  required?: boolean;
  options?: string[];
  min_value?: number;
  max_value?: number;
  qualification_rules?: Record<string, unknown>;
}

export interface ScreenerResponse {
  id: string;
  participant_name: string | null;
  participant_email: string | null;
  qualified: number | null;
  qualification_reason: string | null;
  session_id: string | null;
  answers_json: string;
  consent_given: number;
  created_at: string;
}

export interface OverviewData {
  sessions: { total: number; active: number; completed: number };
  signals: { total: number; by_type: Record<string, number> };
  tasks: { total: number; by_status: Record<string, number> };
  screeners: { total: number; active: number; total_views: number; total_qualified: number };
  recent_sessions: Session[];
  top_tasks: Task[];
}
