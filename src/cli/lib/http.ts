import process from 'node:process';
import type { CliEnvironment } from './types';
import { loadStoredConfig, resolveBaseUrl } from './config';
import { CliError, fail } from './errors';

export type AuthMode = 'required' | 'optional' | 'none';

export type ApiRequest = {
  env: CliEnvironment;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  authMode?: AuthMode;
  projectKey?: string;
};

export type ApiResponse = {
  status: number;
  ok: boolean;
  headers: Headers;
  text: string;
  json: unknown | null;
};

export class HttpError extends CliError {
  status: number;
  details: string;

  constructor(status: number, details: string) {
    super(`HTTP ${status}: ${details}`);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export async function requestJson<T = unknown>(input: ApiRequest): Promise<T> {
  const response = await requestRaw(input);

  if (!response.ok) {
    throw new HttpError(response.status, extractErrorDetails(response));
  }

  if (response.json !== null) {
    return response.json as T;
  }

  return response.text as T;
}

export async function requestRaw(input: ApiRequest): Promise<ApiResponse> {
  const method = input.method.toUpperCase();
  const authMode = input.authMode ?? 'required';
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...input.headers,
  };

  if (input.projectKey) {
    headers['X-Project-Key'] = input.projectKey;
  }

  const token = await resolveToken(input.env, authMode);
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  if (input.env === 'local') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const body = input.body !== undefined ? JSON.stringify(input.body) : undefined;
  if (body) {
    headers['content-type'] = headers['content-type'] ?? 'application/json';
  }

  const baseUrl = resolveBaseUrl(input.env);
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const json = contentType.includes('application/json') && text.length > 0
    ? safeParseJson(text)
    : null;

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    text,
    json,
  };
}

async function resolveToken(env: CliEnvironment, authMode: AuthMode): Promise<string | null> {
  if (authMode === 'none') {
    return null;
  }

  const config = await loadStoredConfig(env);
  if (!config) {
    if (authMode === 'required') {
      fail(`Not authenticated for environment "${env}". Run "npm run cli auth login --env ${env}" first.`);
    }
    return null;
  }

  if (config.token.expiresAt <= Date.now()) {
    if (authMode === 'required') {
      fail(`Stored token for environment "${env}" is expired. Run "npm run cli auth login --env ${env}" again.`);
    }
    return null;
  }

  return config.token.accessToken;
}

function extractErrorDetails(response: ApiResponse): string {
  if (response.json && typeof response.json === 'object' && response.json !== null) {
    const maybeError = (response.json as Record<string, unknown>).error;
    if (typeof maybeError === 'string' && maybeError.length > 0) {
      return maybeError;
    }

    const maybeMessage = (response.json as Record<string, unknown>).message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }

  if (response.text.trim().length > 0) {
    return response.text.trim();
  }

  return 'Request failed';
}

function safeParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
