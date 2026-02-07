import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, Screener, NewScreener, ScreenerUpdate, ScreenerQuestion, NewScreenerQuestion, ScreenerResponse, NewScreenerResponse } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId, slugify } from '../shared/id';

export interface CreateScreenerInput {
  project_id: string;
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
}

export interface CreateQuestionInput {
  screener_id: string;
  question_text: string;
  question_type: string;
  required?: boolean;
  sort_order: number;
  options?: string[];
  min_value?: number;
  max_value?: number;
  qualification_rules?: Record<string, unknown>;
}

export interface CreateResponseInput {
  screener_id: string;
  participant_name?: string;
  participant_email?: string;
  answers: Record<string, unknown>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  consent_given?: boolean;
}

@injectable()
export class ScreenerDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  // --- Screener CRUD ---

  async create(input: CreateScreenerInput): Promise<Screener> {
    const now = new Date().toISOString();
    const id = generateId();

    const screener: NewScreener = {
      id,
      project_id: input.project_id,
      title: input.title,
      description: input.description ?? null,
      slug: input.slug ?? slugify(input.title),
      status: 'draft',
      max_participants: input.max_participants ?? null,
      incentive_type: input.incentive_type ?? 'none',
      incentive_value_cents: input.incentive_value_cents ?? 0,
      incentive_description: input.incentive_description ?? null,
      logo_r2_key: null,
      brand_color: input.brand_color ?? '#6366f1',
      welcome_message: input.welcome_message ?? null,
      thank_you_message: 'Thank you for your time!',
      disqualified_message: "Thank you for your interest. Unfortunately, you don't match our current criteria.",
      consent_text: input.consent_text ?? 'I agree to participate in this research session. My responses may be recorded and analyzed.',
      view_count: 0,
      start_count: 0,
      complete_count: 0,
      qualified_count: 0,
      disqualified_count: 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto('screeners').values(screener).execute();
    return screener as Screener;
  }

  async findById(id: string): Promise<Screener | undefined> {
    return await this.db
      .selectFrom('screeners')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findBySlug(slug: string, projectId: string): Promise<Screener | undefined> {
    return await this.db
      .selectFrom('screeners')
      .selectAll()
      .where('slug', '=', slug)
      .where('project_id', '=', projectId)
      .executeTakeFirst();
  }

  async listByProject(projectId: string): Promise<Screener[]> {
    return await this.db
      .selectFrom('screeners')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async update(id: string, data: Partial<ScreenerUpdate>): Promise<void> {
    await this.db
      .updateTable('screeners')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
  }

  async incrementCounter(id: string, counter: 'view_count' | 'start_count' | 'complete_count' | 'qualified_count' | 'disqualified_count'): Promise<void> {
    await this.db
      .updateTable('screeners')
      .set((eb) => ({
        [counter]: eb(counter, '+', 1),
        updated_at: new Date().toISOString(),
      }))
      .where('id', '=', id)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('screeners').where('id', '=', id).execute();
  }

  // --- Questions ---

  async addQuestion(input: CreateQuestionInput): Promise<ScreenerQuestion> {
    const id = generateId();
    const now = new Date().toISOString();

    const question: NewScreenerQuestion = {
      id,
      screener_id: input.screener_id,
      question_text: input.question_text,
      question_type: input.question_type,
      required: input.required !== false ? 1 : 0,
      sort_order: input.sort_order,
      options_json: input.options ? JSON.stringify(input.options) : null,
      min_value: input.min_value ?? null,
      max_value: input.max_value ?? null,
      qualification_rules_json: input.qualification_rules ? JSON.stringify(input.qualification_rules) : null,
      created_at: now,
    };

    await this.db.insertInto('screener_questions').values(question).execute();
    return question as ScreenerQuestion;
  }

  async getQuestions(screenerId: string): Promise<ScreenerQuestion[]> {
    return await this.db
      .selectFrom('screener_questions')
      .selectAll()
      .where('screener_id', '=', screenerId)
      .orderBy('sort_order', 'asc')
      .execute();
  }

  async findQuestionById(id: string): Promise<ScreenerQuestion | undefined> {
    return await this.db
      .selectFrom('screener_questions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async updateQuestion(
    id: string,
    data: {
      question_text?: string;
      question_type?: string;
      required?: boolean;
      sort_order?: number;
      options?: string[] | null;
      min_value?: number | null;
      max_value?: number | null;
      qualification_rules?: Record<string, unknown> | null;
    }
  ): Promise<void> {
    const updates: Partial<{
      question_text: string;
      question_type: string;
      required: number;
      sort_order: number;
      options_json: string | null;
      min_value: number | null;
      max_value: number | null;
      qualification_rules_json: string | null;
    }> = {};

    if (data.question_text !== undefined) updates.question_text = data.question_text;
    if (data.question_type !== undefined) updates.question_type = data.question_type;
    if (data.required !== undefined) updates.required = data.required ? 1 : 0;
    if (data.sort_order !== undefined) updates.sort_order = data.sort_order;
    if (data.options !== undefined) updates.options_json = data.options ? JSON.stringify(data.options) : null;
    if (data.min_value !== undefined) updates.min_value = data.min_value;
    if (data.max_value !== undefined) updates.max_value = data.max_value;
    if (data.qualification_rules !== undefined) {
      updates.qualification_rules_json = data.qualification_rules ? JSON.stringify(data.qualification_rules) : null;
    }

    await this.db
      .updateTable('screener_questions')
      .set(updates)
      .where('id', '=', id)
      .execute();
  }

  async reorderQuestions(screenerId: string, questionIds: string[]): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      for (let i = 0; i < questionIds.length; i++) {
        await trx
          .updateTable('screener_questions')
          .set({ sort_order: i })
          .where('id', '=', questionIds[i])
          .where('screener_id', '=', screenerId)
          .execute();
      }
    });
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.db.deleteFrom('screener_questions').where('id', '=', id).execute();
  }

  // --- Responses ---

  async addResponse(input: CreateResponseInput): Promise<ScreenerResponse> {
    const id = generateId();
    const now = new Date().toISOString();

    const response: NewScreenerResponse = {
      id,
      screener_id: input.screener_id,
      participant_name: input.participant_name ?? null,
      participant_email: input.participant_email ?? null,
      qualified: null,
      qualification_reason: null,
      answers_json: JSON.stringify(input.answers),
      session_id: null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      consent_given: input.consent_given ? 1 : 0,
      created_at: now,
    };

    await this.db.insertInto('screener_responses').values(response).execute();
    return response as ScreenerResponse;
  }

  async getResponse(id: string): Promise<ScreenerResponse | undefined> {
    return await this.db
      .selectFrom('screener_responses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async listResponses(screenerId: string, qualified?: boolean): Promise<ScreenerResponse[]> {
    let query = this.db
      .selectFrom('screener_responses')
      .selectAll()
      .where('screener_id', '=', screenerId)
      .orderBy('created_at', 'desc');

    if (qualified !== undefined) {
      query = query.where('qualified', '=', qualified ? 1 : 0);
    }

    return await query.execute();
  }

  async qualifyResponse(id: string, qualified: boolean, reason?: string): Promise<void> {
    await this.db
      .updateTable('screener_responses')
      .set({
        qualified: qualified ? 1 : 0,
        qualification_reason: reason ?? null,
      })
      .where('id', '=', id)
      .execute();
  }

  async linkResponseToSession(responseId: string, sessionId: string): Promise<void> {
    await this.db
      .updateTable('screener_responses')
      .set({ session_id: sessionId })
      .where('id', '=', responseId)
      .execute();
  }
}
