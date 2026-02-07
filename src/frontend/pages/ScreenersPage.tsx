import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { screenersAPI, type Screener } from '../lib/api';
import styles from './EntityPage.module.css';

export default function ScreenersPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;

  const [screeners, setScreeners] = useState<Screener[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    void loadScreeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadScreeners = async () => {
    setLoading(true);
    setError(null);
    try {
      const { screeners } = await screenersAPI.list(projectId);
      setScreeners(screeners);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load screeners');
    } finally {
      setLoading(false);
    }
  };

  const createScreener = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const result = await screenersAPI.create(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setShowCreate(false);
      setScreeners((prev) => [result.screener, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create screener');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <AppHeader
        leftSlot={<Link to={`/p/${projectId}`} className={styles.brand}>UserTests</Link>}
        rightSlot={<HeaderNav userName={user?.name} userEmail={user?.email} />}
      />

      <nav className={styles.subnav}>
        <Link to={`/p/${projectId}`} className={styles.subnavLink}>Overview</Link>
        <Link to={`/p/${projectId}/sessions`} className={styles.subnavLink}>Sessions</Link>
        <Link to={`/p/${projectId}/signals`} className={styles.subnavLink}>Signals</Link>
        <Link to={`/p/${projectId}/tasks`} className={styles.subnavLink}>Tasks</Link>
        <Link to={`/p/${projectId}/screeners`} className={`${styles.subnavLink} ${styles.active}`}>Screeners</Link>
        <Link to={`/p/${projectId}/settings`} className={styles.subnavLink}>Settings</Link>
      </nav>

      <main className={styles.main}>
        <div className={styles.headingRow}>
          <h2 className={styles.title}>Screeners</h2>
          <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Close' : '+ New Screener'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {showCreate && (
          <section className={styles.card} style={{ marginBottom: '1rem' }}>
            <h3 className={styles.cardTitle}>Create Screener</h3>
            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label className={styles.label}>Title</label>
                <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Interview qualification screener" />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>Description</label>
                <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who is this screener for?" />
              </div>
              <div className={styles.buttonRow}>
                <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void createScreener()} disabled={creating || !title.trim()}>
                  {creating ? 'Creating...' : 'Create screener'}
                </button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className={styles.loading}>Loading screeners...</div>
        ) : screeners.length === 0 ? (
          <div className={styles.empty}>No screeners yet. Create one to start qualifying participants.</div>
        ) : (
          <div className={styles.list}>
            {screeners.map((screener) => (
              <Link
                key={screener.id}
                to={`/p/${projectId}/screeners/${screener.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <section className={styles.card}>
                  <div className={styles.rowHeader}>
                    <div>
                      <h3 className={styles.cardTitle} style={{ marginBottom: '0.2rem' }}>{screener.title}</h3>
                      <div className={styles.small}>{screener.description || 'No description'}</div>
                    </div>
                    <span className={styles.badge}>{screener.status}</span>
                  </div>
                  <div className={styles.metaGrid}>
                    <Meta label="Views" value={String(screener.view_count)} />
                    <Meta label="Completed" value={String(screener.complete_count)} />
                    <Meta label="Qualified" value={String(screener.qualified_count)} />
                    <Meta label="Disqualified" value={String(screener.disqualified_count)} />
                  </div>
                </section>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}
