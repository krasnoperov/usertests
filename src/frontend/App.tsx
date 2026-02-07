import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AuthorizationApprovalPage from './pages/AuthorizationApprovalPage';
import ProjectsPage from './pages/ProjectsPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import SignalsPage from './pages/SignalsPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ScreenersPage from './pages/ScreenersPage';
import ScreenerDetailPage from './pages/ScreenerDetailPage';
import SettingsPage from './pages/SettingsPage';
import PublicScreenerPage from './pages/PublicScreenerPage';
import PublicInterviewPage from './pages/PublicInterviewPage';
import PublicCompletePage from './pages/PublicCompletePage';
import { loadSession } from './config';
import type { User } from './contexts/AuthContext';
import { useRouteStore } from './stores/routeStore';
import './styles/theme.css';

function AppRouter() {
  const page = useRouteStore((state) => state.page);

  switch (page) {
    case 'landing':
      return <LandingPage />;
    case 'login':
      return <LoginPage />;
    case 'profile':
      return <ProjectsPage />;
    case 'oauthApprove':
      return <AuthorizationApprovalPage />;

    // Public participant pages
    case 'publicScreener':
      return <PublicScreenerPage />;
    case 'publicInterview':
      return <PublicInterviewPage />;
    case 'publicComplete':
      return <PublicCompletePage />;

    // Dashboard pages
    case 'dashboard':
      return <DashboardPage />;
    case 'sessions':
      return <SessionsPage />;
    case 'sessionDetail':
      return <SessionDetailPage />;
    case 'signals':
      return <SignalsPage />;
    case 'tasks':
      return <TasksPage />;
    case 'taskDetail':
      return <TaskDetailPage />;
    case 'screeners':
      return <ScreenersPage />;
    case 'screenerDetail':
      return <ScreenerDetailPage />;
    case 'settings':
      return <SettingsPage />;

    default:
      return <LandingPage />;
  }
}

function App() {
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [clientId, setClientId] = useState('');
  const [initialUser, setInitialUser] = useState<User | null>(null);
  const page = useRouteStore((state) => state.page);

  const isPublicPage = page === 'publicScreener' || page === 'publicInterview' || page === 'publicComplete';

  useEffect(() => {
    loadSession().then((session) => {
      setClientId(session.config.googleClientId);
      setInitialUser(session.user);
      setSessionLoaded(true);
      if (!session.config.googleClientId) {
        console.error('Google Client ID not provided by backend');
      }
    });
  }, []);

  if (!sessionLoaded) {
    return null;
  }

  if (!clientId && !isPublicPage) {
    return (
      <AuthProvider initialUser={initialUser}>
        <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
          Google OAuth not configured. Please contact administrator.
        </div>
      </AuthProvider>
    );
  }

  if (!clientId && isPublicPage) {
    return (
      <AuthProvider initialUser={initialUser}>
        <AppRouter />
      </AuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider initialUser={initialUser}>
        <AppRouter />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
