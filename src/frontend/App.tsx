import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AuthorizationApprovalPage from './pages/AuthorizationApprovalPage';
import ProjectsPage from './pages/ProjectsPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import SignalsPage from './pages/SignalsPage';
import TasksPage from './pages/TasksPage';
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

    // Dashboard pages
    case 'dashboard':
      return <DashboardPage />;
    case 'sessions':
      return <SessionsPage />;
    case 'sessionDetail':
      return <SessionsPage />; // TODO: dedicated session detail page
    case 'signals':
      return <SignalsPage />;
    case 'tasks':
    case 'taskDetail':
      return <TasksPage />;
    case 'screeners':
    case 'screenerDetail':
      return <DashboardPage />; // TODO: dedicated screener pages
    case 'settings':
      return <DashboardPage />; // TODO: settings page

    default:
      return <LandingPage />;
  }
}

function App() {
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [clientId, setClientId] = useState('');
  const [initialUser, setInitialUser] = useState<User | null>(null);

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

  if (!clientId) {
    return (
      <AuthProvider initialUser={initialUser}>
        <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
          Google OAuth not configured. Please contact administrator.
        </div>
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
