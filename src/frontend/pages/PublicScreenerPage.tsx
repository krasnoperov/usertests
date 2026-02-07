import { FormEvent, useEffect, useMemo, useState } from 'react';
import useParams from '../hooks/useParams';
import useNavigate from '../hooks/useNavigate';
import useSearchParams from '../hooks/useSearchParams';
import {
  publicSdkApi,
  type PublicScreener,
  type PublicScreenerQuestion,
} from '../lib/publicSdkApi';
import styles from './PublicParticipant.module.css';

function hasAnswer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export default function PublicScreenerPage() {
  const { screenerId } = useParams<{ screenerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const key = searchParams.get('key') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screener, setScreener] = useState<PublicScreener | null>(null);
  const [questions, setQuestions] = useState<PublicScreenerQuestion[]>([]);

  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [disqualifiedMessage, setDisqualifiedMessage] = useState<string | null>(null);

  const requiredMissing = useMemo(() => {
    return questions
      .filter((q) => q.required === 1)
      .some((q) => !hasAnswer(answers[q.id]));
  }, [answers, questions]);

  useEffect(() => {
    if (!screenerId) {
      setError('Missing screener id');
      setLoading(false);
      return;
    }

    if (!key) {
      setError('Missing project key in URL. Please use the full invite link.');
      setLoading(false);
      return;
    }

    if (!key.startsWith('ut_pub_')) {
      setError('Invalid public invite key. Please use the public participant link.');
      setLoading(false);
      return;
    }

    setLoading(true);
    publicSdkApi
      .getScreener(screenerId, key)
      .then(({ screener, questions }) => {
        setScreener(screener);
        setQuestions(questions);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [screenerId, key]);

  const updateSingleAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMultipleChoice = (questionId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const existing = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = checked ? [...existing, option] : existing.filter((v) => v !== option);
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!screenerId || !key) return;
    if (!consentGiven) {
      setError('Consent is required to continue.');
      return;
    }

    if (requiredMissing) {
      setError('Please answer all required questions.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await publicSdkApi.submitScreener(screenerId, key, {
        participant_name: participantName || undefined,
        participant_email: participantEmail || undefined,
        answers,
        consent_given: consentGiven,
        // B1: granular consent — map from the single consent checkbox for MVP
        consent_recording: consentGiven,
        consent_analytics: consentGiven,
        consent_followup: consentGiven,
        // B2: UTM forwarding from URL query params
        utm_source: searchParams.get('utm_source') || undefined,
        utm_medium: searchParams.get('utm_medium') || undefined,
        utm_campaign: searchParams.get('utm_campaign') || undefined,
      });

      if (result.qualified && result.session_id) {
        navigate(`/u/interview/${result.session_id}?key=${encodeURIComponent(key)}`);
        return;
      }

      setDisqualifiedMessage(result.message || "Thanks for your interest. You're not a fit for this study.");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit screener');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading screener...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Unable to load screener</h1>
          <p className={styles.error}>{error}</p>
        </div>
      </div>
    );
  }

  if (!screener) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Screener not found.</div>
      </div>
    );
  }

  if (disqualifiedMessage) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Thanks for your interest</h1>
          <p className={styles.description}>{disqualifiedMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{screener.title}</h1>
        {screener.description && <p className={styles.description}>{screener.description}</p>}
        {screener.welcome_message && <p className={styles.info}>{screener.welcome_message}</p>}

        <div className={styles.row}>
          <div>
            <label className={styles.label}>Your name (optional)</label>
            <input
              className={styles.input}
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className={styles.label}>Your email (optional)</label>
            <input
              className={styles.input}
              type="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
        </div>

        {questions.map((question) => {
          const value = answers[question.id];
          const options = question.options || [];

          return (
            <div key={question.id}>
              <label className={styles.label}>
                {question.question_text}
                {question.required === 1 && <span className={styles.badge}>Required</span>}
              </label>

              {question.question_type === 'single_choice' && (
                <select
                  className={styles.select}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => updateSingleAnswer(question.id, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {question.question_type === 'multiple_choice' && (
                <div>
                  {options.map((option) => {
                    const checked = Array.isArray(value) && value.includes(option);
                    return (
                      <label key={option} style={{ display: 'block', marginBottom: '0.35rem' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleMultipleChoice(question.id, option, e.target.checked)}
                        />{' '}
                        {option}
                      </label>
                    );
                  })}
                </div>
              )}

              {(question.question_type === 'text' || !['single_choice', 'multiple_choice', 'number', 'scale', 'date'].includes(question.question_type)) && (
                <textarea
                  className={styles.textarea}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => updateSingleAnswer(question.id, e.target.value)}
                />
              )}

              {(question.question_type === 'number' || question.question_type === 'scale') && (
                <input
                  className={styles.input}
                  type="number"
                  min={question.min_value ?? undefined}
                  max={question.max_value ?? undefined}
                  value={typeof value === 'number' ? value : ''}
                  onChange={(e) => updateSingleAnswer(
                    question.id,
                    e.target.value === '' ? '' : Number(e.target.value),
                  )}
                />
              )}

              {question.question_type === 'date' && (
                <input
                  className={styles.input}
                  type="date"
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => updateSingleAnswer(question.id, e.target.value)}
                />
              )}
            </div>
          );
        })}

        <label className={styles.label} style={{ marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
          />{' '}
          {screener.consent_text}
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.button} disabled={submitting} type="submit">
            {submitting ? 'Submitting...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
