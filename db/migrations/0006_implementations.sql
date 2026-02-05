-- PRD-06: Implementation tracking for pi.dev harness

CREATE TABLE IF NOT EXISTS implementations (
  id TEXT PRIMARY KEY,                -- nanoid
  task_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  
  -- Spec
  spec_json TEXT,                     -- PiTaskSpec as JSON
  relevant_files_json TEXT,           -- JSON array of file paths
  
  -- Execution
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, generating, running, success, failed, cancelled
  attempt_number INTEGER DEFAULT 1,
  
  -- Git/PR info
  branch_name TEXT,
  commit_sha TEXT,
  pr_url TEXT,
  pr_number INTEGER,
  pr_state TEXT,                      -- open, merged, closed
  pr_merged_at TEXT,
  
  -- Execution details
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  changes_summary TEXT,               -- human-readable summary of what changed
  files_changed_json TEXT,            -- JSON array of changed files
  
  -- Dry run
  is_dry_run INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_implementations_task ON implementations(task_id);
CREATE INDEX IF NOT EXISTS idx_implementations_project ON implementations(project_id);
CREATE INDEX IF NOT EXISTS idx_implementations_status ON implementations(status);
CREATE INDEX IF NOT EXISTS idx_implementations_pr ON implementations(pr_number);
