export const TYPES = {
  // Environment binding
  Env: Symbol.for('Env'),

  // Database binding
  Database: Symbol.for('Database'),

  // DAO symbols
  UserDAO: Symbol.for('UserDAO'),
  ProjectDAO: Symbol.for('ProjectDAO'),
  SessionDAO: Symbol.for('SessionDAO'),
  SessionMessageDAO: Symbol.for('SessionMessageDAO'),
  SessionEventDAO: Symbol.for('SessionEventDAO'),
  AudioChunkDAO: Symbol.for('AudioChunkDAO'),
  SignalDAO: Symbol.for('SignalDAO'),
  TaskDAO: Symbol.for('TaskDAO'),
  ScreenerDAO: Symbol.for('ScreenerDAO'),
  ScreenerQuestionDAO: Symbol.for('ScreenerQuestionDAO'),
  ScreenerResponseDAO: Symbol.for('ScreenerResponseDAO'),
  ImplementationDAO: Symbol.for('ImplementationDAO'),
  TaskProviderDAO: Symbol.for('TaskProviderDAO'),
  TaskMeasurementDAO: Symbol.for('TaskMeasurementDAO'),
} as const;
