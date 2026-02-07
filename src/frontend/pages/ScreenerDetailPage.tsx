import { useEffect, useMemo, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import {
  projectsAPI,
  screenersAPI,
  type Project,
  type Screener,
  type ScreenerQuestion,
  type ScreenerResponse,
  type ScreenerQuestionInput,
} from '../lib/api';
import styles from './EntityPage.module.css';

type QuestionDraft = {
  question_text: string;
  question_type: string;
  required: boolean;
  options: string;
  min_value: string;
  max_value: string;
  qualification_rules: string;
};

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'text', 'number', 'scale', 'date'];

export default function ScreenerDetailPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const screenerId = params.screenerId!;

  const [project, setProject] = useState<Project | null>(null);
  const [screener, setScreener] = useState<Screener | null>(null);
  const [questions, setQuestions] = useState<ScreenerQuestion[]>([]);
  const [responses, setResponses] = useState<ScreenerResponse[]>([]);
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState<QuestionDraft>({
    question_text: '',
    question_type: 'single_choice',
    required: true,
    options: '',
    min_value: '',
    max_value: '',
    qualification_rules: '',
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'draft',
    welcome_message: '',
    thank_you_message: '',
    disqualified_message: '',
    brand_color: '#6366f1',
    consent_text: '',
  });

  useEffect(() => {
    void loadScreener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, screenerId]);

  const screenerLink = useMemo(() => {
    if (!project || !screener) return '';
    return `${window.location.origin}/u/screener/${screener.id}?key=${project.public_key}`;
  }, [project, screener]);

  const responseMetrics = useMemo(() => {
    const total = responses.length;
    const qualified = responses.filter((response) => response.qualified === 1).length;
    const disqualified = responses.filter((response) => response.qualified === 0).length;
    const pending = responses.filter((response) => response.qualified === null).length;
    const qualifiedRate = total > 0 ? Math.round((qualified / total) * 100) : 0;

    return { total, qualified, disqualified, pending, qualifiedRate };
  }, [responses]);

  const loadScreener = async () => {
    setLoading(true);
    setError(null);
    try {
      const [screenerResult, projectResult] = await Promise.all([
        screenersAPI.get(projectId, screenerId),
        projectsAPI.get(projectId),
      ]);

      setProject(projectResult.project);
      setScreener(screenerResult.screener);
      setQuestions(screenerResult.questions);
      setResponses(screenerResult.responses);

      setForm({
        title: screenerResult.screener.title,
        description: screenerResult.screener.description || '',
        status: screenerResult.screener.status,
        welcome_message: screenerResult.screener.welcome_message || '',
        thank_you_message: screenerResult.screener.thank_you_message,
        disqualified_message: screenerResult.screener.disqualified_message,
        brand_color: screenerResult.screener.brand_color,
        consent_text: screenerResult.screener.consent_text,
      });

      const drafts: Record<string, QuestionDraft> = {};
      for (const question of screenerResult.questions) {
        drafts[question.id] = toDraft(question);
      }
      setQuestionDrafts(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load screener');
    } finally {
      setLoading(false);
    }
  };

  const saveScreener = async () => {
    if (!screener) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await screenersAPI.update(projectId, screener.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        welcome_message: form.welcome_message.trim() || null,
        thank_you_message: form.thank_you_message.trim() || screener.thank_you_message,
        disqualified_message: form.disqualified_message.trim() || screener.disqualified_message,
        brand_color: form.brand_color,
        consent_text: form.consent_text.trim() || screener.consent_text,
      });

      setScreener(result.screener);
      setSuccess('Screener updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update screener');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.question_text.trim() || !screener) return;

    setError(null);

    try {
      const payload = draftToInput(newQuestion);
      await screenersAPI.addQuestion(projectId, screener.id, payload);
      setNewQuestion({
        question_text: '',
        question_type: 'single_choice',
        required: true,
        options: '',
        min_value: '',
        max_value: '',
        qualification_rules: '',
      });
      await loadScreener();
      setSuccess('Question added');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add question');
    }
  };

  const saveQuestion = async (questionId: string) => {
    if (!screener) return;

    const draft = questionDrafts[questionId];
    if (!draft) return;

    setError(null);

    try {
      await screenersAPI.updateQuestion(projectId, screener.id, questionId, draftToInput(draft));
      await loadScreener();
      setSuccess('Question updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update question');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!screener) return;
    if (!window.confirm('Delete this question?')) return;

    setError(null);

    try {
      await screenersAPI.deleteQuestion(projectId, screener.id, questionId);
      await loadScreener();
      setSuccess('Question removed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete question');
    }
  };

  const moveQuestion = async (index: number, direction: -1 | 1) => {
    if (!screener) return;
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    const temp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = temp;

    try {
      const result = await screenersAPI.reorderQuestions(projectId, screener.id, reordered.map((q) => q.id));
      setQuestions(result.questions);
      setSuccess('Question order updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder questions');
    }
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(successMessage);
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
        <Link to={`/p/${projectId}/screeners`} className={`${styles.subnavLink} ${styles.active}`}>Screeners</Link>
        <Link to={`/p/${projectId}/settings`} className={styles.subnavLink}>Settings</Link>
      </nav>

      <main className={styles.main}>
        {loading && <div className={styles.loading}>Loading screener...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {!loading && !error && screener && (
          <div className={styles.grid}>
            <div className={styles.headingRow}>
              <h2 className={styles.title}>{screener.title}</h2>
              <Link to={`/p/${projectId}/screeners`} className={styles.link}>← Back to screeners</Link>
            </div>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Screener Settings</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Title</label>
                  <input className={styles.input} value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Description</label>
                  <textarea className={styles.textarea} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className={styles.gridTwo} style={{ display: 'grid', gap: '0.75rem' }}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Status</label>
                    <select className={styles.select} value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="closed">closed</option>
                    </select>
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Brand color</label>
                    <input className={styles.input} value={form.brand_color} onChange={(e) => setForm((prev) => ({ ...prev, brand_color: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Welcome message</label>
                  <textarea className={styles.textarea} value={form.welcome_message} onChange={(e) => setForm((prev) => ({ ...prev, welcome_message: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Thank you message</label>
                  <textarea className={styles.textarea} value={form.thank_you_message} onChange={(e) => setForm((prev) => ({ ...prev, thank_you_message: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Disqualified message</label>
                  <textarea className={styles.textarea} value={form.disqualified_message} onChange={(e) => setForm((prev) => ({ ...prev, disqualified_message: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Consent text</label>
                  <textarea className={styles.textarea} value={form.consent_text} onChange={(e) => setForm((prev) => ({ ...prev, consent_text: e.target.value }))} />
                </div>
                <div className={styles.buttonRow}>
                  <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void saveScreener()} disabled={saving || !form.title.trim()}>
                    {saving ? 'Saving...' : 'Save screener'}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Public Link & ID</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Screener ID</label>
                  <div className={styles.buttonRow}>
                    <code className={styles.metaValue}>{screener.id}</code>
                    <button className={styles.button} onClick={() => void copyToClipboard(screener.id, 'Screener ID copied')}>Copy ID</button>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Public URL</label>
                  <div className={styles.buttonRow}>
                    <code className={styles.metaValue} style={{ flex: 1 }}>{screenerLink || 'Unavailable'}</code>
                    <button className={styles.button} onClick={() => void copyToClipboard(screenerLink, 'Screener URL copied')} disabled={!screenerLink}>Copy URL</button>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Qualification Metrics</h3>
              <div className={styles.metaGrid}>
                <Metric label="Total responses" value={String(responseMetrics.total)} />
                <Metric label="Qualified" value={String(responseMetrics.qualified)} />
                <Metric label="Disqualified" value={String(responseMetrics.disqualified)} />
                <Metric label="Pending" value={String(responseMetrics.pending)} />
                <Metric label="Qualified rate" value={`${responseMetrics.qualifiedRate}%`} />
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Questions ({questions.length})</h3>

              <div className={styles.formGrid} style={{ marginBottom: '0.8rem' }}>
                <div className={styles.formRow}>
                  <label className={styles.label}>New question</label>
                  <input className={styles.input} value={newQuestion.question_text} onChange={(e) => setNewQuestion((prev) => ({ ...prev, question_text: e.target.value }))} />
                </div>
                <div className={styles.gridTwo} style={{ display: 'grid', gap: '0.75rem' }}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Type</label>
                    <select className={styles.select} value={newQuestion.question_type} onChange={(e) => setNewQuestion((prev) => ({ ...prev, question_type: e.target.value }))}>
                      {QUESTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Options (comma-separated, for choice questions)</label>
                    <input className={styles.input} value={newQuestion.options} onChange={(e) => setNewQuestion((prev) => ({ ...prev, options: e.target.value }))} placeholder="Option A, Option B" />
                  </div>
                </div>
                <div className={styles.gridTwo} style={{ display: 'grid', gap: '0.75rem' }}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Min value (number/scale)</label>
                    <input className={styles.input} value={newQuestion.min_value} onChange={(e) => setNewQuestion((prev) => ({ ...prev, min_value: e.target.value }))} placeholder="e.g. 1" />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Max value (number/scale)</label>
                    <input className={styles.input} value={newQuestion.max_value} onChange={(e) => setNewQuestion((prev) => ({ ...prev, max_value: e.target.value }))} placeholder="e.g. 10" />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Qualification rules JSON (optional)</label>
                  <textarea
                    className={styles.textarea}
                    value={newQuestion.qualification_rules}
                    onChange={(e) => setNewQuestion((prev) => ({ ...prev, qualification_rules: e.target.value }))}
                    placeholder='{"qualify":["PM"],"disqualify":["Student"]}'
                  />
                </div>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={newQuestion.required}
                    onChange={(e) => setNewQuestion((prev) => ({ ...prev, required: e.target.checked }))}
                  />
                  Required question
                </label>
                <div className={styles.buttonRow}>
                  <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void addQuestion()} disabled={!newQuestion.question_text.trim()}>
                    Add question
                  </button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className={styles.empty}>No questions yet</div>
              ) : (
                <div className={styles.list}>
                  {questions.map((question, index) => {
                    const draft = questionDrafts[question.id] ?? toDraft(question);

                    return (
                      <div className={styles.row} key={question.id}>
                        <div className={styles.rowHeader}>
                          <span className={styles.badge}>#{index + 1} {question.question_type}</span>
                          <div className={styles.buttonRow}>
                            <button className={styles.button} onClick={() => void moveQuestion(index, -1)} disabled={index === 0}>↑</button>
                            <button className={styles.button} onClick={() => void moveQuestion(index, 1)} disabled={index === questions.length - 1}>↓</button>
                          </div>
                        </div>

                        <div className={styles.formGrid}>
                          <div className={styles.formRow}>
                            <label className={styles.label}>Question text</label>
                            <input
                              className={styles.input}
                              value={draft.question_text}
                              onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, question_text: e.target.value } }))}
                            />
                          </div>
                          <div className={styles.gridTwo} style={{ display: 'grid', gap: '0.75rem' }}>
                            <div className={styles.formRow}>
                              <label className={styles.label}>Type</label>
                              <select
                                className={styles.select}
                                value={draft.question_type}
                                onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, question_type: e.target.value } }))}
                              >
                                {QUESTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                              </select>
                            </div>
                            <div className={styles.formRow}>
                              <label className={styles.label}>Options (comma-separated)</label>
                              <input
                                className={styles.input}
                                value={draft.options}
                                onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, options: e.target.value } }))}
                              />
                            </div>
                          </div>
                          <div className={styles.gridTwo} style={{ display: 'grid', gap: '0.75rem' }}>
                            <div className={styles.formRow}>
                              <label className={styles.label}>Min value</label>
                              <input
                                className={styles.input}
                                value={draft.min_value}
                                onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, min_value: e.target.value } }))}
                              />
                            </div>
                            <div className={styles.formRow}>
                              <label className={styles.label}>Max value</label>
                              <input
                                className={styles.input}
                                value={draft.max_value}
                                onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, max_value: e.target.value } }))}
                              />
                            </div>
                          </div>
                          <div className={styles.formRow}>
                            <label className={styles.label}>Qualification rules JSON</label>
                            <textarea
                              className={styles.textarea}
                              value={draft.qualification_rules}
                              onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, qualification_rules: e.target.value } }))}
                            />
                          </div>
                          <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={draft.required}
                              onChange={(e) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, required: e.target.checked } }))}
                            />
                            Required question
                          </label>
                          <div className={styles.buttonRow}>
                            <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void saveQuestion(question.id)}>Save</button>
                            <button className={`${styles.button} ${styles.buttonDanger}`} onClick={() => void deleteQuestion(question.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Responses ({responses.length})</h3>
              {responses.length === 0 ? (
                <div className={styles.empty}>No responses yet</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Answers</th>
                        <th>Session</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((response) => (
                        <tr key={response.id}>
                          <td>{response.participant_name || response.participant_email || 'Anonymous'}</td>
                          <td>{response.qualified === null ? 'pending' : response.qualified ? 'qualified' : 'disqualified'}</td>
                          <td>{response.qualification_reason || '—'}</td>
                          <td>
                            <pre className={styles.pre} style={{ maxHeight: '90px', minWidth: '220px' }}>
                              {prettyJSON(parseJSON(response.answers_json))}
                            </pre>
                          </td>
                          <td>
                            {response.session_id ? (
                              <Link to={`/p/${projectId}/sessions/${response.session_id}`} className={styles.link}>Open session</Link>
                            ) : '—'}
                          </td>
                          <td>{new Date(response.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

function toDraft(question: ScreenerQuestion): QuestionDraft {
  return {
    question_text: question.question_text,
    question_type: question.question_type,
    required: Boolean(question.required),
    options: question.options_json ? safeParseOptions(question.options_json).join(', ') : '',
    min_value: question.min_value !== null ? String(question.min_value) : '',
    max_value: question.max_value !== null ? String(question.max_value) : '',
    qualification_rules: question.qualification_rules_json || '',
  };
}

function draftToInput(draft: QuestionDraft): ScreenerQuestionInput {
  const input: ScreenerQuestionInput = {
    question_text: draft.question_text.trim(),
    question_type: draft.question_type,
    required: draft.required,
  };

  const options = draft.options
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (options.length > 0) {
    input.options = options;
  }

  if (draft.min_value.trim()) {
    const min = Number(draft.min_value);
    if (!Number.isNaN(min)) {
      input.min_value = min;
    }
  }

  if (draft.max_value.trim()) {
    const max = Number(draft.max_value);
    if (!Number.isNaN(max)) {
      input.max_value = max;
    }
  }

  if (draft.qualification_rules.trim()) {
    const parsed = parseJSON(draft.qualification_rules);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      input.qualification_rules = parsed as Record<string, unknown>;
    }
  }

  return input;
}

function safeParseOptions(input: string): string[] {
  const parsed = parseJSON(input);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string');
}

function parseJSON(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return input;
  }
}

function prettyJSON(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
