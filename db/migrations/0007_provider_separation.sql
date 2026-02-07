-- Migration 0007: Provider Separation
-- Decouples harness-specific columns from tasks into provider state and measurement tables.

-- Provider state table: tracks external system sync for each task
CREATE TABLE IF NOT EXISTS task_provider_state (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  project_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT,
  external_url TEXT,
  external_status TEXT,
  metadata_json TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(task_id, provider)
);

CREATE INDEX idx_task_provider_state_task ON task_provider_state(task_id);
CREATE INDEX idx_task_provider_state_provider ON task_provider_state(provider, external_id);

-- Measurement history table: tracks impact measurements over time
CREATE TABLE IF NOT EXISTS task_measurements (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  project_id TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  baseline_signal_rate REAL,
  current_signal_rate REAL,
  impact_score REAL,
  sessions_analyzed INTEGER,
  measurement_window_days INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_task_measurements_task ON task_measurements(task_id);
CREATE INDEX idx_task_provider_state_project ON task_provider_state(project_id);
CREATE INDEX idx_task_measurements_project ON task_measurements(project_id);

-- Migrate existing harness data to task_provider_state
INSERT INTO task_provider_state (id, task_id, project_id, provider, external_url, external_status, metadata_json, synced_at, created_at, updated_at)
SELECT
  lower(hex(randomblob(8))),
  id,
  project_id,
  'github',
  implementation_pr_url,
  CASE
    WHEN status = 'review' THEN 'pr_open'
    WHEN status = 'deployed' THEN 'merged'
    WHEN status = 'measuring' THEN 'merged'
    ELSE 'pending'
  END,
  json_object(
    'branch', implementation_branch,
    'pr_number', implementation_pr_number,
    'deployed_at', deployed_at
  ),
  updated_at,
  created_at,
  updated_at
FROM tasks
WHERE implementation_pr_url IS NOT NULL OR implementation_branch IS NOT NULL;

-- Migrate existing impact measurements to task_measurements
INSERT INTO task_measurements (id, task_id, project_id, measured_at, baseline_signal_rate, current_signal_rate, impact_score, sessions_analyzed, measurement_window_days, created_at)
SELECT
  lower(hex(randomblob(8))),
  id,
  project_id,
  COALESCE(measurement_completed_at, updated_at),
  baseline_signal_rate,
  current_signal_rate,
  impact_score,
  NULL,
  7,
  COALESCE(measurement_completed_at, updated_at)
FROM tasks
WHERE impact_score IS NOT NULL;

-- Migrate harness-specific task statuses to core statuses
UPDATE tasks SET status = 'in_progress' WHERE status = 'review';
UPDATE tasks SET status = 'done' WHERE status = 'deployed';
UPDATE tasks SET status = 'done' WHERE status = 'measuring';

-- Note: harness columns (implementation_branch, implementation_pr_url, etc.) are kept
-- nullable in the tasks table for backwards compatibility. They will be dropped in a
-- future migration after all code reads from task_provider_state instead.
