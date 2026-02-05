// ============================================================================
// UserTests - Environment Types
// ============================================================================

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Storage
  OAUTH_KV: KVNamespace;

  // Static assets
  ASSETS: Fetcher;

  // R2 Storage (audio, recordings, exports)
  STORAGE: R2Bucket;

  // Queue for async processing
  PROCESSING_QUEUE: Queue<QueueMessage>;

  // Authentication
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI?: string;
  OIDC_PRIVATE_KEY_BASE64: string;
  OIDC_PRIVATE_KEY?: string;
  OIDC_PUBLIC_KEY?: string;
  OIDC_KEY_ID: string;
  OIDC_ISSUER: string;
  OIDC_AUDIENCE: string;
  OIDC_ALLOWED_CLIENT_IDS?: string;

  // AI Services
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  AI?: Ai;
  AI_GATEWAY_URL?: string;

  // GitHub integration (PRD-06)
  GITHUB_TOKEN?: string;

  // Environment
  ENVIRONMENT?: 'development' | 'stage' | 'staging' | 'production';
}

// Queue message types
export type QueueMessage =
  | SessionCompletedMessage
  | TranscribeAudioMessage
  | ExtractSignalsMessage
  | MeasureImpactMessage;

export interface SessionCompletedMessage {
  type: 'session.completed';
  sessionId: string;
  projectId: string;
}

export interface TranscribeAudioMessage {
  type: 'audio.transcribe';
  sessionId: string;
  chunkId: number;
  r2Key: string;
}

export interface ExtractSignalsMessage {
  type: 'signals.extract';
  sessionId: string;
  projectId: string;
}

export interface MeasureImpactMessage {
  type: 'impact.measure';
  taskId: string;
  projectId: string;
}
