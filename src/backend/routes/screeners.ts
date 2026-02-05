import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { createSDKAuthMiddleware } from '../middleware/project-middleware';
import { ScreenerDAO } from '../../dao/screener-dao';
import { SessionDAO } from '../../dao/session-dao';

const screenerRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();
const sdkAuth = createSDKAuthMiddleware();

// ========== Authenticated routes (dashboard) ==========

// List screeners for a project
screenerRoutes.get('/api/projects/:projectId/screeners', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);

  const screeners = await screenerDAO.listByProject(projectId);
  return c.json({ screeners });
});

// Create screener
screenerRoutes.post('/api/projects/:projectId/screeners', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);

  const body = await c.req.json<{
    title: string;
    description?: string;
    slug?: string;
    welcome_message?: string;
    incentive_type?: string;
    incentive_value_cents?: number;
    incentive_description?: string;
    brand_color?: string;
    consent_text?: string;
    max_participants?: number;
    questions?: Array<{
      question_text: string;
      question_type: string;
      required?: boolean;
      options?: string[];
      min_value?: number;
      max_value?: number;
      qualification_rules?: Record<string, unknown>;
    }>;
  }>();

  if (!body.title || body.title.trim().length === 0) {
    return c.json({ error: 'Screener title is required' }, 400);
  }

  const screener = await screenerDAO.create({
    project_id: projectId,
    title: body.title.trim(),
    description: body.description,
    slug: body.slug,
    welcome_message: body.welcome_message,
    incentive_type: body.incentive_type,
    incentive_value_cents: body.incentive_value_cents,
    incentive_description: body.incentive_description,
    brand_color: body.brand_color,
    consent_text: body.consent_text,
    max_participants: body.max_participants,
  });

  // Add questions if provided
  if (body.questions) {
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];
      await screenerDAO.addQuestion({
        screener_id: screener.id,
        question_text: q.question_text,
        question_type: q.question_type,
        required: q.required,
        sort_order: i,
        options: q.options,
        min_value: q.min_value,
        max_value: q.max_value,
        qualification_rules: q.qualification_rules,
      });
    }
  }

  const questions = await screenerDAO.getQuestions(screener.id);
  return c.json({ screener, questions }, 201);
});

// Get screener detail
screenerRoutes.get('/api/projects/:projectId/screeners/:screenerId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);
  const { screenerId } = c.req.param();

  const screener = await screenerDAO.findById(screenerId);
  if (!screener || screener.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const questions = await screenerDAO.getQuestions(screenerId);
  const responses = await screenerDAO.listResponses(screenerId);

  return c.json({ screener, questions, responses });
});

// Update screener
screenerRoutes.patch('/api/projects/:projectId/screeners/:screenerId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);
  const { screenerId } = c.req.param();

  const screener = await screenerDAO.findById(screenerId);
  if (!screener || screener.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    description?: string;
    status?: string;
    welcome_message?: string;
    thank_you_message?: string;
    disqualified_message?: string;
    brand_color?: string;
    consent_text?: string;
    max_participants?: number;
  }>();

  await screenerDAO.update(screenerId, body);
  const updated = await screenerDAO.findById(screenerId);
  return c.json({ screener: updated });
});

// Delete screener
screenerRoutes.delete('/api/projects/:projectId/screeners/:screenerId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);
  const { screenerId } = c.req.param();

  const screener = await screenerDAO.findById(screenerId);
  if (!screener || screener.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  await screenerDAO.delete(screenerId);
  return c.json({ success: true });
});

// ========== Public SDK routes (screener landing pages) ==========

// Get public screener data (for rendering the screener page)
screenerRoutes.get('/api/sdk/screener/:screenerId', sdkAuth, async (c) => {
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);
  const { screenerId } = c.req.param();

  const screener = await screenerDAO.findById(screenerId);
  if (!screener || screener.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  if (screener.status !== 'active') {
    return c.json({ error: 'Screener is not active' }, 404);
  }

  // Increment view count
  await screenerDAO.incrementCounter(screenerId, 'view_count');

  const questions = await screenerDAO.getQuestions(screenerId);

  // Return public-safe data (no secret fields)
  return c.json({
    screener: {
      id: screener.id,
      title: screener.title,
      description: screener.description,
      brand_color: screener.brand_color,
      welcome_message: screener.welcome_message,
      incentive_type: screener.incentive_type,
      incentive_description: screener.incentive_description,
      consent_text: screener.consent_text,
    },
    questions: questions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      required: q.required,
      options: q.options_json ? JSON.parse(q.options_json) : null,
      min_value: q.min_value,
      max_value: q.max_value,
    })),
  });
});

// Submit screener response (public)
screenerRoutes.post('/api/sdk/screener/:screenerId/respond', sdkAuth, async (c) => {
  const container = c.get('container');
  const screenerDAO = container.get(ScreenerDAO);
  const sessionDAO = container.get(SessionDAO);
  const { screenerId } = c.req.param();

  const screener = await screenerDAO.findById(screenerId);
  if (!screener || screener.project_id !== c.get('projectId') || screener.status !== 'active') {
    return c.json({ error: 'Not found' }, 404);
  }

  // Check capacity
  if (screener.max_participants && screener.qualified_count >= screener.max_participants) {
    return c.json({ error: 'This screener has reached its participant limit' }, 400);
  }

  const body = await c.req.json<{
    participant_name?: string;
    participant_email?: string;
    answers: Record<string, unknown>;
    consent_given?: boolean;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>();

  await screenerDAO.incrementCounter(screenerId, 'complete_count');

  const response = await screenerDAO.addResponse({
    screener_id: screenerId,
    participant_name: body.participant_name,
    participant_email: body.participant_email,
    answers: body.answers,
    consent_given: body.consent_given,
    utm_source: body.utm_source,
    utm_medium: body.utm_medium,
    utm_campaign: body.utm_campaign,
  });

  // Evaluate qualification
  const questions = await screenerDAO.getQuestions(screenerId);
  const qualified = evaluateQualification(questions, body.answers);

  if (qualified.result) {
    await screenerDAO.qualifyResponse(response.id, true, qualified.reason);
    await screenerDAO.incrementCounter(screenerId, 'qualified_count');

    // Auto-create session for qualified participants
    const session = await sessionDAO.create({
      project_id: screener.project_id,
      screener_id: screenerId,
      screener_response_id: response.id,
      participant_name: body.participant_name,
      participant_email: body.participant_email,
    });

    await screenerDAO.linkResponseToSession(response.id, session.id);

    return c.json({
      qualified: true,
      session_id: session.id,
      message: screener.thank_you_message,
    });
  } else {
    await screenerDAO.qualifyResponse(response.id, false, qualified.reason);
    await screenerDAO.incrementCounter(screenerId, 'disqualified_count');

    return c.json({
      qualified: false,
      message: screener.disqualified_message,
    });
  }
});

/**
 * Evaluate qualification based on question rules and answers
 */
function evaluateQualification(
  questions: Array<{ id: string; qualification_rules_json: string | null }>,
  answers: Record<string, unknown>
): { result: boolean; reason: string } {
  for (const question of questions) {
    if (!question.qualification_rules_json) continue;

    try {
      const rules = JSON.parse(question.qualification_rules_json) as {
        qualify?: string[];
        disqualify?: string[];
      };
      const answer = answers[question.id];
      const answerStr = String(answer);

      if (rules.disqualify && rules.disqualify.includes(answerStr)) {
        return { result: false, reason: `Disqualified by question ${question.id}` };
      }

      if (rules.qualify && rules.qualify.length > 0 && !rules.qualify.includes(answerStr)) {
        return { result: false, reason: `Did not match qualifying criteria for question ${question.id}` };
      }
    } catch {
      // Skip invalid rules
    }
  }

  return { result: true, reason: 'Passed all qualification criteria' };
}

export { screenerRoutes };
