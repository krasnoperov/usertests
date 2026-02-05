-- PRD-01/02: Sessions - interview sessions with messages and events

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                -- nanoid
  project_id TEXT NOT NULL,
  screener_id TEXT,                   -- optional: which screener recruited this user
  screener_response_id TEXT,          -- optional: their screener response
  
  -- Participant info
  participant_name TEXT,
  participant_email TEXT,
  
  -- Session state
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, active, completed, abandoned, error
  interview_mode TEXT NOT NULL DEFAULT 'voice',  -- voice, text, async
  
  -- Interview progress
  current_phase TEXT DEFAULT 'rapport',  -- rapport, first_thought, passive_looking, active_looking, deciding, first_use, wrap_up
  phase_started_at TEXT,
  
  -- Timing
  started_at TEXT,
  completed_at TEXT,
  duration_seconds INTEGER,
  
  -- Post-processing
  transcript_key TEXT,                -- R2 key for full transcript
  timeline_key TEXT,                  -- R2 key for merged timeline
  signals_key TEXT,                   -- R2 key for extracted signals JSON
  summary TEXT,                       -- AI-generated session summary
  
  -- Quality metrics
  signal_count INTEGER DEFAULT 0,
  talk_ratio REAL,                    -- user:agent talk ratio
  quality_score REAL,                 -- 0-1 overall quality
  
  -- Consent
  consent_recording INTEGER DEFAULT 0,
  consent_analytics INTEGER DEFAULT 0,
  consent_followup INTEGER DEFAULT 0,
  
  -- Cost tracking
  cost_audio_cents INTEGER DEFAULT 0,
  cost_transcription_cents INTEGER DEFAULT 0,
  cost_analysis_cents INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_screener ON sessions(screener_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- Chat messages within a session
CREATE TABLE IF NOT EXISTS session_messages (
  id TEXT PRIMARY KEY,                -- nanoid
  session_id TEXT NOT NULL,
  
  role TEXT NOT NULL,                 -- 'user', 'interviewer', 'system'
  content TEXT NOT NULL,
  
  -- Metadata
  timestamp_ms INTEGER NOT NULL,      -- milliseconds since session start
  sentiment REAL,                     -- -1 to 1
  audio_chunk_key TEXT,               -- R2 key if voice message
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON session_messages(timestamp_ms);

-- User interaction events (clicks, navigation, etc.)
CREATE TABLE IF NOT EXISTS session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  
  event_type TEXT NOT NULL,           -- 'click', 'navigation', 'scroll', 'marker', 'phase_change'
  timestamp_ms INTEGER NOT NULL,      -- milliseconds since session start
  
  -- Event data (flexible JSON)
  data_json TEXT NOT NULL DEFAULT '{}',
  
  -- For click events
  target_selector TEXT,
  target_text TEXT,
  
  -- For navigation events
  url TEXT,
  page_title TEXT,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON session_events(session_id, timestamp_ms);

-- Audio chunks stored in R2
CREATE TABLE IF NOT EXISTS audio_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  
  chunk_index INTEGER NOT NULL,
  r2_key TEXT NOT NULL,               -- R2 object key
  duration_ms INTEGER,
  size_bytes INTEGER,
  mime_type TEXT DEFAULT 'audio/webm',
  
  -- Processing state
  transcribed INTEGER DEFAULT 0,
  transcript_text TEXT,
  
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audio_session ON audio_chunks(session_id);
