import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

// ============================================================================
// UserTests Database Types
// ============================================================================

// --- Users (from whitelabel foundation) ---

export interface UsersTable {
  id: Generated<number>;
  email: string;
  name: string;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  google_id: string | null;
}

// --- Projects (PRD-00) ---

export interface ProjectsTable {
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

export type Project = Selectable<ProjectsTable>;
export type NewProject = Insertable<ProjectsTable>;
export type ProjectUpdate = Updateable<ProjectsTable>;

export interface ProjectMembersTable {
  project_id: string;
  user_id: number;
  role: string; // owner, admin, member, viewer
  created_at: string;
}

export type ProjectMember = Selectable<ProjectMembersTable>;
export type NewProjectMember = Insertable<ProjectMembersTable>;

// --- Sessions (PRD-01/02) ---

export interface SessionsTable {
  id: string;
  project_id: string;
  screener_id: string | null;
  screener_response_id: string | null;
  participant_name: string | null;
  participant_email: string | null;
  status: string; // pending, active, completed, abandoned, error
  interview_mode: string; // voice, text, async
  current_phase: string | null;
  phase_started_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  transcript_key: string | null;
  timeline_key: string | null;
  signals_key: string | null;
  summary: string | null;
  signal_count: number;
  talk_ratio: number | null;
  quality_score: number | null;
  consent_recording: number;
  consent_analytics: number;
  consent_followup: number;
  cost_audio_cents: number;
  cost_transcription_cents: number;
  cost_analysis_cents: number;
  created_at: string;
  updated_at: string;
}

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
export type SessionUpdate = Updateable<SessionsTable>;

export interface SessionMessagesTable {
  id: string;
  session_id: string;
  role: string; // user, interviewer, system
  content: string;
  timestamp_ms: number;
  sentiment: number | null;
  audio_chunk_key: string | null;
  created_at: string;
}

export type SessionMessage = Selectable<SessionMessagesTable>;
export type NewSessionMessage = Insertable<SessionMessagesTable>;

export interface SessionEventsTable {
  id: Generated<number>;
  session_id: string;
  event_type: string; // click, navigation, scroll, marker, phase_change
  timestamp_ms: number;
  data_json: string;
  target_selector: string | null;
  target_text: string | null;
  url: string | null;
  page_title: string | null;
}

export type SessionEvent = Selectable<SessionEventsTable>;
export type NewSessionEvent = Insertable<SessionEventsTable>;

export interface AudioChunksTable {
  id: Generated<number>;
  session_id: string;
  chunk_index: number;
  r2_key: string;
  duration_ms: number | null;
  size_bytes: number | null;
  mime_type: string;
  transcribed: number;
  transcript_text: string | null;
  created_at: string;
}

export type AudioChunk = Selectable<AudioChunksTable>;
export type NewAudioChunk = Insertable<AudioChunksTable>;

// --- Signals (PRD-03) ---

export type SignalType =
  | 'struggling_moment'
  | 'desired_outcome'
  | 'hiring_criteria'
  | 'firing_moment'
  | 'workaround'
  | 'emotional_response';

export interface SignalsTable {
  id: string;
  project_id: string;
  session_id: string;
  signal_type: string;
  confidence: number;
  intensity: number | null;
  quote: string;
  context: string | null;
  analysis: string | null;
  timestamp_ms: number | null;
  task_id: string | null;
  created_at: string;
}

export type Signal = Selectable<SignalsTable>;
export type NewSignal = Insertable<SignalsTable>;

// --- Tasks (PRD-05) ---

export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'done'
  | 'wont_fix';

export type TaskType = 'bug' | 'improvement' | 'feature' | 'research';
export type PriorityLabel = 'critical' | 'high' | 'medium' | 'low';
export type EffortEstimate = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface TasksTable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority_score: number;
  priority_label: string;
  effort_estimate: string | null;
  signal_count: number;
  session_count: number;
  implementation_branch: string | null;
  implementation_pr_url: string | null;
  implementation_pr_number: number | null;
  deployed_at: string | null;
  baseline_signal_rate: number | null;
  current_signal_rate: number | null;
  impact_score: number | null;
  measurement_started_at: string | null;
  measurement_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Task = Selectable<TasksTable>;
export type NewTask = Insertable<TasksTable>;
export type TaskUpdate = Updateable<TasksTable>;

export interface TaskSignalsTable {
  task_id: string;
  signal_id: string;
}

export type TaskSignal = Selectable<TaskSignalsTable>;
export type NewTaskSignal = Insertable<TaskSignalsTable>;

// --- Screeners (PRD-07) ---

export interface ScreenersTable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  slug: string;
  status: string; // draft, active, paused, closed
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

export type Screener = Selectable<ScreenersTable>;
export type NewScreener = Insertable<ScreenersTable>;
export type ScreenerUpdate = Updateable<ScreenersTable>;

export interface ScreenerQuestionsTable {
  id: string;
  screener_id: string;
  question_text: string;
  question_type: string; // single_choice, multiple_choice, text, number, scale, date
  required: number;
  sort_order: number;
  options_json: string | null;
  min_value: number | null;
  max_value: number | null;
  qualification_rules_json: string | null;
  created_at: string;
}

export type ScreenerQuestion = Selectable<ScreenerQuestionsTable>;
export type NewScreenerQuestion = Insertable<ScreenerQuestionsTable>;

export interface ScreenerResponsesTable {
  id: string;
  screener_id: string;
  participant_name: string | null;
  participant_email: string | null;
  qualified: number | null;
  qualification_reason: string | null;
  answers_json: string;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  consent_given: number;
  created_at: string;
}

export type ScreenerResponse = Selectable<ScreenerResponsesTable>;
export type NewScreenerResponse = Insertable<ScreenerResponsesTable>;

// --- Task Provider State (PRD-06 providers) ---

export interface TaskProviderStateTable {
  id: string;
  task_id: string;
  project_id: string;
  provider: string;
  external_id: string | null;
  external_url: string | null;
  external_status: string | null;
  metadata_json: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskProviderState = Selectable<TaskProviderStateTable>;
export type NewTaskProviderState = Insertable<TaskProviderStateTable>;
export type TaskProviderStateUpdate = Updateable<TaskProviderStateTable>;

// --- Task Measurements ---

export interface TaskMeasurementsTable {
  id: string;
  task_id: string;
  project_id: string;
  measured_at: string;
  baseline_signal_rate: number | null;
  current_signal_rate: number | null;
  impact_score: number | null;
  sessions_analyzed: number | null;
  measurement_window_days: number | null;
  created_at: string;
}

export type TaskMeasurement = Selectable<TaskMeasurementsTable>;
export type NewTaskMeasurement = Insertable<TaskMeasurementsTable>;

// --- Implementations (PRD-06) ---

export interface ImplementationsTable {
  id: string;
  task_id: string;
  project_id: string;
  spec_json: string | null;
  relevant_files_json: string | null;
  status: string; // pending, generating, running, success, failed, cancelled
  attempt_number: number;
  branch_name: string | null;
  commit_sha: string | null;
  pr_url: string | null;
  pr_number: number | null;
  pr_state: string | null;
  pr_merged_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  changes_summary: string | null;
  files_changed_json: string | null;
  is_dry_run: number;
  created_at: string;
  updated_at: string;
}

export type Implementation = Selectable<ImplementationsTable>;
export type NewImplementation = Insertable<ImplementationsTable>;
export type ImplementationUpdate = Updateable<ImplementationsTable>;

// --- Full Database interface ---

export interface Database {
  users: UsersTable;
  projects: ProjectsTable;
  project_members: ProjectMembersTable;
  sessions: SessionsTable;
  session_messages: SessionMessagesTable;
  session_events: SessionEventsTable;
  audio_chunks: AudioChunksTable;
  signals: SignalsTable;
  tasks: TasksTable;
  task_signals: TaskSignalsTable;
  screeners: ScreenersTable;
  screener_questions: ScreenerQuestionsTable;
  screener_responses: ScreenerResponsesTable;
  implementations: ImplementationsTable;
  task_provider_state: TaskProviderStateTable;
  task_measurements: TaskMeasurementsTable;
}
