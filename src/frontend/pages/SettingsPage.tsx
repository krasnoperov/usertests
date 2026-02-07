import { useEffect, useMemo, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { projectsAPI, type Project } from '../lib/api';
import styles from './EntityPage.module.css';

export default function SettingsPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    github_repo_url: '',
    github_default_branch: 'main',
  });

  useEffect(() => {
    void loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const maskedSecret = useMemo(() => {
    if (!project) return '';
    if (showSecret) return project.secret_key;
    if (project.secret_key.length <= 10) return '••••••••';
    return `${project.secret_key.slice(0, 6)}••••••••${project.secret_key.slice(-4)}`;
  }, [project, showSecret]);

  const loadProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const { project } = await projectsAPI.get(projectId);
      setProject(project);
      setForm({
        name: project.name,
        description: project.description || '',
        github_repo_url: project.github_repo_url || '',
        github_default_branch: project.github_default_branch || 'main',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!project) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await projectsAPI.update(project.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        github_repo_url: form.github_repo_url.trim() || null,
        github_default_branch: form.github_default_branch.trim() || 'main',
      });

      setProject(result.project);
      setSuccess('Project settings saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save project settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess(`${label} copied`);
    } catch {
      setError('Failed to copy to clipboard');
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
        <Link to={`/p/${projectId}/screeners`} className={styles.subnavLink}>Screeners</Link>
        <Link to={`/p/${projectId}/settings`} className={`${styles.subnavLink} ${styles.active}`}>Settings</Link>
      </nav>

      <main className={styles.main}>
        <div className={styles.headingRow}>
          <h2 className={styles.title}>Project Settings</h2>
        </div>

        {loading && <div className={styles.loading}>Loading settings...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {!loading && !error && project && (
          <div className={styles.grid}>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>General</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Project name</label>
                  <input className={styles.input} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Description</label>
                  <textarea className={styles.textarea} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>GitHub repository URL</label>
                  <input className={styles.input} value={form.github_repo_url} onChange={(e) => setForm((prev) => ({ ...prev, github_repo_url: e.target.value }))} placeholder="https://github.com/org/repo" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Default branch</label>
                  <input className={styles.input} value={form.github_default_branch} onChange={(e) => setForm((prev) => ({ ...prev, github_default_branch: e.target.value }))} />
                </div>

                <div className={styles.buttonRow}>
                  <button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving || !form.name.trim()} onClick={() => void save()}>
                    {saving ? 'Saving...' : 'Save settings'}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>SDK Keys</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Public key</label>
                  <div className={styles.buttonRow}>
                    <code className={styles.metaValue} style={{ flex: 1 }}>{project.public_key}</code>
                    <button className={styles.button} onClick={() => void copyToClipboard(project.public_key, 'Public key')}>Copy</button>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Secret key</label>
                  <div className={styles.buttonRow}>
                    <code className={styles.metaValue} style={{ flex: 1 }}>{maskedSecret}</code>
                    <button className={styles.button} onClick={() => setShowSecret((v) => !v)}>{showSecret ? 'Hide' : 'Reveal'}</button>
                    <button className={styles.button} onClick={() => void copyToClipboard(project.secret_key, 'Secret key')}>Copy</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
