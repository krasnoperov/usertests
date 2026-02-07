import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { sdkRoutes } from './sdk';
import { interviewRoutes } from './interview';
import { ProjectDAO } from '../../dao/project-dao';
import { SessionDAO } from '../../dao/session-dao';
import { ScreenerDAO } from '../../dao/screener-dao';

type MockContainer = {
  get: (token: unknown) => unknown;
};

function createContainer(projectDAO: unknown, sessionDAO: unknown, screenerDAO?: unknown): MockContainer {
  return {
    get(token: unknown) {
      if (token === ProjectDAO) return projectDAO;
      if (token === SessionDAO) return sessionDAO;
      if (token === ScreenerDAO) return screenerDAO;
      throw new Error(`Unexpected token requested: ${String(token)}`);
    },
  };
}

describe('SDK route regressions', () => {
  test('accepts both canonical and compatibility event endpoints', async () => {
    const captured: Array<{ type: string; timestamp_ms: number; data?: Record<string, unknown> }> = [];

    const projectDAO = {
      findByPublicKey: async (key: string) => (key === 'ut_pub_test' ? { id: 'project-1' } : undefined),
      findBySecretKey: async () => undefined,
    };

    const sessionDAO = {
      findById: async (id: string) => (id === 'session-1'
        ? { id: 'session-1', project_id: 'project-1', started_at: new Date().toISOString() }
        : undefined),
      addEvent: async (_sessionId: string, type: string, timestampMs: number, data?: Record<string, unknown>) => {
        captured.push({ type, timestamp_ms: timestampMs, data });
      },
    };

    const container = createContainer(projectDAO, sessionDAO);

    const app = new Hono();
    app.use('*', async (c, next) => {
      (c as unknown as { set: (k: string, v: unknown) => void }).set('container', container);
      await next();
    });
    app.route('/', sdkRoutes as unknown as Hono);

    const batchRes = await app.request('/api/sdk/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': 'ut_pub_test',
      },
      body: JSON.stringify({
        session_id: 'session-1',
        events: [
          {
            type: 'click',
            timestamp_ms: 100,
            data: { target_selector: '#submit' },
          },
        ],
      }),
    });

    assert.equal(batchRes.status, 200);

    const compatRes = await app.request('/api/sdk/interview/session-1/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': 'ut_pub_test',
      },
      body: JSON.stringify({
        type: 'navigation',
        timestamp_ms: 250,
        data: { url: 'https://example.com' },
      }),
    });

    assert.equal(compatRes.status, 200);
    assert.equal(captured.length, 2);
    assert.deepEqual(captured.map((e) => e.type), ['click', 'navigation']);
  });
});

describe('Interview end idempotency regression', () => {
  test('queues completion exactly once across repeated /end calls', async () => {
    let queueCount = 0;

    const session = {
      id: 'session-2',
      project_id: 'project-2',
      status: 'active',
      started_at: new Date(Date.now() - 60_000).toISOString(),
      current_phase: 'deciding',
    };

    const projectDAO = {
      findByPublicKey: async (key: string) => (key === 'ut_pub_test' ? { id: 'project-2' } : undefined),
      findBySecretKey: async () => undefined,
    };

    const sessionDAO = {
      findById: async (id: string) => (id === 'session-2' ? session : undefined),
      update: async (_id: string, patch: Record<string, unknown>) => {
        if (typeof patch.status === 'string') {
          session.status = patch.status;
        }
      },
    };

    const container = createContainer(projectDAO, sessionDAO, {
      findById: async () => undefined,
    });

    const app = new Hono();
    app.use('*', async (c, next) => {
      (c as unknown as { set: (k: string, v: unknown) => void }).set('container', container);
      await next();
    });
    app.route('/', interviewRoutes as unknown as Hono);

    const env = {
      PROCESSING_QUEUE: {
        send: async () => {
          queueCount++;
        },
      },
    };

    const first = await app.request('/api/sdk/interview/session-2/end', {
      method: 'POST',
      headers: {
        'X-Project-Key': 'ut_pub_test',
      },
    }, env);

    assert.equal(first.status, 200);
    const firstBody = await first.json() as { success: boolean; already_completed: boolean; queued: boolean };
    assert.equal(firstBody.success, true);
    assert.equal(firstBody.already_completed, false);
    assert.equal(firstBody.queued, true);

    const second = await app.request('/api/sdk/interview/session-2/end', {
      method: 'POST',
      headers: {
        'X-Project-Key': 'ut_pub_test',
      },
    }, env);

    assert.equal(second.status, 200);
    const secondBody = await second.json() as { success: boolean; already_completed: boolean; queued: boolean };
    assert.equal(secondBody.success, true);
    assert.equal(secondBody.already_completed, true);
    assert.equal(secondBody.queued, false);

    assert.equal(queueCount, 1);
  });
});
