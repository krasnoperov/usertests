-- PRD-00: Projects - tenant boundary for all data
-- Every entity belongs to a project. Projects are owned by users.

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                -- nanoid
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL,
  
  -- GitHub integration
  github_repo_url TEXT,
  github_default_branch TEXT DEFAULT 'main',
  
  -- SDK keys for embedded access
  public_key TEXT NOT NULL UNIQUE,
  secret_key TEXT NOT NULL UNIQUE,
  
  -- Settings
  settings_json TEXT DEFAULT '{}',    -- JSON blob for project-level settings
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_public_key ON projects(public_key);

-- Project membership (multi-user support)
CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'
  created_at TEXT NOT NULL,
  
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
