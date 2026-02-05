-- PRD-03/05: Signals and Tasks

-- JTBD signals extracted from sessions
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,                -- nanoid
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  
  -- Signal classification
  signal_type TEXT NOT NULL,          -- struggling_moment, desired_outcome, hiring_criteria, firing_moment, workaround, emotional_response
  confidence REAL NOT NULL DEFAULT 0.5,  -- 0-1
  intensity REAL DEFAULT 0.5,         -- 0-1 how strongly expressed
  
  -- Content
  quote TEXT NOT NULL,                -- verbatim user quote
  context TEXT,                       -- surrounding context
  analysis TEXT,                      -- AI analysis of what this signal means
  
  -- Timing
  timestamp_ms INTEGER,               -- when in the session this occurred
  
  -- Task linkage
  task_id TEXT,                       -- linked task (if any)
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signals_project ON signals(project_id);
CREATE INDEX IF NOT EXISTS idx_signals_session ON signals(session_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_task ON signals(task_id);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at);

-- Actionable tasks derived from signals
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,                -- nanoid
  project_id TEXT NOT NULL,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'improvement',  -- bug, improvement, feature, research
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'backlog',  -- backlog, ready, in_progress, review, deployed, measuring, done, wont_fix
  
  -- Priority (PRD-05 scoring)
  priority_score INTEGER DEFAULT 0,   -- 0-100
  priority_label TEXT DEFAULT 'low',  -- critical, high, medium, low
  effort_estimate TEXT,               -- xs, s, m, l, xl
  
  -- Evidence counts (denormalized for fast queries)
  signal_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  
  -- Implementation (PRD-06)
  implementation_branch TEXT,
  implementation_pr_url TEXT,
  implementation_pr_number INTEGER,
  deployed_at TEXT,
  
  -- Impact measurement
  baseline_signal_rate REAL,          -- signals/session before fix
  current_signal_rate REAL,           -- signals/session after fix
  impact_score REAL,                  -- percentage reduction
  measurement_started_at TEXT,
  measurement_completed_at TEXT,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

-- Many-to-many: tasks ↔ signals (a signal can be evidence for multiple tasks)
CREATE TABLE IF NOT EXISTS task_signals (
  task_id TEXT NOT NULL,
  signal_id TEXT NOT NULL,
  
  PRIMARY KEY (task_id, signal_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE
);
