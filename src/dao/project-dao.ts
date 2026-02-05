import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, Project, NewProject, ProjectUpdate, ProjectMember, NewProjectMember } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId, generatePublicKey, generateSecretKey } from '../shared/id';

export interface CreateProjectInput {
  name: string;
  description?: string;
  owner_id: number;
  github_repo_url?: string;
}

@injectable()
export class ProjectDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const id = generateId();

    const project: NewProject = {
      id,
      name: input.name,
      description: input.description ?? null,
      owner_id: input.owner_id,
      github_repo_url: input.github_repo_url ?? null,
      github_default_branch: 'main',
      public_key: generatePublicKey(),
      secret_key: generateSecretKey(),
      settings_json: '{}',
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto('projects').values(project).execute();

    // Auto-add owner as member
    await this.addMember(id, input.owner_id, 'owner');

    return project as Project;
  }

  async findById(id: string): Promise<Project | undefined> {
    return await this.db
      .selectFrom('projects')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findByPublicKey(publicKey: string): Promise<Project | undefined> {
    return await this.db
      .selectFrom('projects')
      .selectAll()
      .where('public_key', '=', publicKey)
      .executeTakeFirst();
  }

  async findBySecretKey(secretKey: string): Promise<Project | undefined> {
    return await this.db
      .selectFrom('projects')
      .selectAll()
      .where('secret_key', '=', secretKey)
      .executeTakeFirst();
  }

  async listByUser(userId: number): Promise<Project[]> {
    return await this.db
      .selectFrom('projects')
      .innerJoin('project_members', 'project_members.project_id', 'projects.id')
      .selectAll('projects')
      .where('project_members.user_id', '=', userId)
      .orderBy('projects.created_at', 'desc')
      .execute();
  }

  async update(id: string, data: Partial<ProjectUpdate>): Promise<void> {
    await this.db
      .updateTable('projects')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('projects').where('id', '=', id).execute();
  }

  // --- Membership ---

  async addMember(projectId: string, userId: number, role: string = 'member'): Promise<void> {
    const member: NewProjectMember = {
      project_id: projectId,
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
    };
    await this.db.insertInto('project_members').values(member).execute();
  }

  async removeMember(projectId: string, userId: number): Promise<void> {
    await this.db
      .deleteFrom('project_members')
      .where('project_id', '=', projectId)
      .where('user_id', '=', userId)
      .execute();
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    return await this.db
      .selectFrom('project_members')
      .selectAll()
      .where('project_id', '=', projectId)
      .execute();
  }

  async isMember(projectId: string, userId: number): Promise<boolean> {
    const member = await this.db
      .selectFrom('project_members')
      .select('user_id')
      .where('project_id', '=', projectId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return !!member;
  }

  async getMemberRole(projectId: string, userId: number): Promise<string | null> {
    const member = await this.db
      .selectFrom('project_members')
      .select('role')
      .where('project_id', '=', projectId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return member?.role ?? null;
  }
}
