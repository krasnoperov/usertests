-- PRD-07: Screener & Recruitment System

CREATE TABLE IF NOT EXISTS screeners (
  id TEXT PRIMARY KEY,                -- nanoid
  project_id TEXT NOT NULL,
  
  -- Screener details
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,                 -- URL-friendly identifier
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, active, paused, closed
  
  -- Configuration
  max_participants INTEGER,
  
  -- Incentive
  incentive_type TEXT DEFAULT 'none',    -- none, gift_card, product_credit, donation
  incentive_value_cents INTEGER DEFAULT 0,
  incentive_description TEXT,
  
  -- Branding
  logo_r2_key TEXT,
  brand_color TEXT DEFAULT '#6366f1',
  welcome_message TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your time!',
  disqualified_message TEXT DEFAULT 'Thank you for your interest. Unfortunately, you don''t match our current criteria.',
  
  -- Tracking
  view_count INTEGER DEFAULT 0,
  start_count INTEGER DEFAULT 0,
  complete_count INTEGER DEFAULT 0,
  qualified_count INTEGER DEFAULT 0,
  disqualified_count INTEGER DEFAULT 0,
  
  -- Consent text
  consent_text TEXT DEFAULT 'I agree to participate in this research session. My responses may be recorded and analyzed.',
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screeners_project ON screeners(project_id);
CREATE INDEX IF NOT EXISTS idx_screeners_slug ON screeners(slug);
CREATE INDEX IF NOT EXISTS idx_screeners_status ON screeners(status);

-- Questions within a screener
CREATE TABLE IF NOT EXISTS screener_questions (
  id TEXT PRIMARY KEY,                -- nanoid
  screener_id TEXT NOT NULL,
  
  -- Question details
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,        -- single_choice, multiple_choice, text, number, scale, date
  required INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Options (for choice questions) - JSON array
  options_json TEXT,                  -- e.g. ["Option A", "Option B", "Option C"]
  
  -- Validation
  min_value INTEGER,                  -- for number/scale
  max_value INTEGER,                  -- for number/scale
  
  -- Qualification rules - JSON
  -- e.g. {"qualify": ["Option A", "Option B"], "disqualify": ["Option C"]}
  qualification_rules_json TEXT,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (screener_id) REFERENCES screeners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screener_questions_screener ON screener_questions(screener_id);

-- Individual screener responses (a full submission)
CREATE TABLE IF NOT EXISTS screener_responses (
  id TEXT PRIMARY KEY,                -- nanoid
  screener_id TEXT NOT NULL,
  
  -- Participant info
  participant_name TEXT,
  participant_email TEXT,
  
  -- Result
  qualified INTEGER,                  -- 1 = qualified, 0 = disqualified, NULL = pending
  qualification_reason TEXT,
  
  -- Answers - JSON object mapping question_id → answer
  answers_json TEXT NOT NULL DEFAULT '{}',
  
  -- Linked session (if qualified and interviewed)
  session_id TEXT,
  
  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Consent
  consent_given INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (screener_id) REFERENCES screeners(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_screener_responses_screener ON screener_responses(screener_id);
CREATE INDEX IF NOT EXISTS idx_screener_responses_email ON screener_responses(participant_email);
CREATE INDEX IF NOT EXISTS idx_screener_responses_qualified ON screener_responses(qualified);
