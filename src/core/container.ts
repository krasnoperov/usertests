import { Container } from 'inversify';
import { TYPES } from './di-types';
import type { Env } from './types';
import type { Kysely } from 'kysely';
import type { Database } from '../db/types';
import { createDb } from '../db';

// Import DAOs
import { UserDAO } from '../dao/user-dao';
import { ProjectDAO } from '../dao/project-dao';
import { SessionDAO } from '../dao/session-dao';
import { SignalDAO } from '../dao/signal-dao';
import { TaskDAO } from '../dao/task-dao';
import { ScreenerDAO } from '../dao/screener-dao';
import { ImplementationDAO } from '../dao/implementation-dao';

// Import Auth Services
import { AuthService } from '../backend/features/auth/auth-service';
import { AuthController } from '../backend/features/auth/auth-controller';
import { AuthHandler } from '../backend/features/auth/auth-handler';

/**
 * Create and configure the dependency injection container
 */
export function createContainer(env: Env): Container {
  const container = new Container();

  // Bind environment
  container.bind<Env>(TYPES.Env).toConstantValue(env);

  // Bind database
  container.bind<Kysely<Database>>(TYPES.Database).toDynamicValue(() => {
    return createDb(env.DB);
  }).inSingletonScope();

  // Bind DAOs
  container.bind(UserDAO).toSelf().inSingletonScope();
  container.bind(TYPES.UserDAO).toService(UserDAO);

  container.bind(ProjectDAO).toSelf().inSingletonScope();
  container.bind(TYPES.ProjectDAO).toService(ProjectDAO);

  container.bind(SessionDAO).toSelf().inSingletonScope();
  container.bind(TYPES.SessionDAO).toService(SessionDAO);

  container.bind(SignalDAO).toSelf().inSingletonScope();
  container.bind(TYPES.SignalDAO).toService(SignalDAO);

  container.bind(TaskDAO).toSelf().inSingletonScope();
  container.bind(TYPES.TaskDAO).toService(TaskDAO);

  container.bind(ScreenerDAO).toSelf().inSingletonScope();
  container.bind(TYPES.ScreenerDAO).toService(ScreenerDAO);

  container.bind(ImplementationDAO).toSelf().inSingletonScope();
  container.bind(TYPES.ImplementationDAO).toService(ImplementationDAO);

  // Bind Auth Services
  container.bind(AuthService).toSelf().inSingletonScope();
  container.bind(AuthController).toSelf().inSingletonScope();
  container.bind(AuthHandler).toSelf().inSingletonScope();

  return container;
}
