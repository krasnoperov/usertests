import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { projectsAPI, type Project } from '../lib/api';
import { navigate } from '../navigation/navigator';
import styles from './DashboardPage.module.css';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    projectsAPI.list()
      .then(({ projects }) => setProjects(projects))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { project } = await projectsAPI.create({ name: newName.trim() });
      navigate(`/p/${project.id}`);
    } catch (e) {
      console.error('Failed to create project:', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <AppHeader
        leftSlot={<Link to="/" className={styles.brand}>UserTests</Link>}
        rightSlot={<HeaderNav userName={user?.name} userEmail={user?.email} />}
      />

      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Your Projects</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              padding: '0.5rem 1rem',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            + New Project
          </button>
        </div>

        {showCreate && (
          <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Project name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  background: '#0a0a0b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  color: '#e4e4e7',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  background: creating ? '#4b5563' : '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: creating ? 'default' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : projects.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.empty}>
              No projects yet. Create one to get started.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/p/${project.id}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div className={styles.card} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{project.name}</h3>
                      {project.description && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#a1a1aa' }}>
                          {project.description}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
