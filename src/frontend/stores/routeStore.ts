import { create } from 'zustand';
import { subscribeToNavigation, initNavigator } from '../navigation/navigator';

export type RoutePage =
  | 'landing'
  | 'login'
  | 'profile'
  | 'oauthApprove'
  // Dashboard pages
  | 'dashboard'
  | 'sessions'
  | 'sessionDetail'
  | 'signals'
  | 'tasks'
  | 'taskDetail'
  | 'screeners'
  | 'screenerDetail'
  | 'settings'
  // Public participant pages
  | 'publicScreener'
  | 'publicInterview'
  | 'publicComplete'
  | 'unknown';

export interface RouteParams {
  [key: string]: string | undefined;
}

interface RouteState {
  path: string;
  search: string;
  page: RoutePage;
  params: RouteParams;
  setLocation: (path: string, search: string) => void;
}

const parseRoute = (path: string): { page: RoutePage; params: RouteParams } => {
  const segments = path.replace(/\/+$/, '').split('/').filter(Boolean);

  if (path === '/' || path === '') {
    return { page: 'landing', params: {} };
  }

  if (path === '/login') {
    return { page: 'login', params: {} };
  }

  if (path === '/profile') {
    return { page: 'profile', params: {} };
  }

  if (path === '/oauth/approve') {
    return { page: 'oauthApprove', params: {} };
  }

  // Public participant routes: /u/...
  if (segments[0] === 'u' && segments[1]) {
    switch (segments[1]) {
      case 'screener':
        if (segments[2]) {
          return { page: 'publicScreener', params: { screenerId: segments[2] } };
        }
        break;
      case 'interview':
        if (segments[2]) {
          return { page: 'publicInterview', params: { sessionId: segments[2] } };
        }
        break;
      case 'complete':
        if (segments[2]) {
          return { page: 'publicComplete', params: { sessionId: segments[2] } };
        }
        break;
    }
  }

  // Dashboard routes: /p/:projectId/...
  if (segments[0] === 'p' && segments[1]) {
    const projectId = segments[1];

    if (segments.length === 2) {
      return { page: 'dashboard', params: { projectId } };
    }

    switch (segments[2]) {
      case 'sessions':
        if (segments[3]) {
          return { page: 'sessionDetail', params: { projectId, sessionId: segments[3] } };
        }
        return { page: 'sessions', params: { projectId } };

      case 'signals':
        return { page: 'signals', params: { projectId } };

      case 'tasks':
        if (segments[3]) {
          return { page: 'taskDetail', params: { projectId, taskId: segments[3] } };
        }
        return { page: 'tasks', params: { projectId } };

      case 'screeners':
        if (segments[3]) {
          return { page: 'screenerDetail', params: { projectId, screenerId: segments[3] } };
        }
        return { page: 'screeners', params: { projectId } };

      case 'settings':
        return { page: 'settings', params: { projectId } };
    }
  }

  return { page: 'unknown', params: {} };
};

const shallowEqualParams = (a: RouteParams, b: RouteParams): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
const initialSearch = typeof window !== 'undefined' ? window.location.search : '';
const initialRoute = parseRoute(initialPath);

export const useRouteStore = create<RouteState>()((set, get) => ({
  path: initialPath,
  search: initialSearch,
  page: initialRoute.page,
  params: initialRoute.params,
  setLocation: (path, search) => {
    const next = parseRoute(path);
    const state = get();
    if (
      state.path === path &&
      state.search === search &&
      state.page === next.page &&
      shallowEqualParams(state.params, next.params)
    ) {
      return;
    }

    set({
      path,
      search,
      page: next.page,
      params: next.params,
    });
  },
}));

// Initialize navigation system and connect to store
if (typeof window !== 'undefined') {
  initNavigator();

  subscribeToNavigation((url) => {
    useRouteStore.getState().setLocation(url.pathname, url.search);
  });
}
