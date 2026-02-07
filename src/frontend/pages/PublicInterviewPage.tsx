import { FormEvent, useEffect, useRef, useState } from 'react';
import useParams from '../hooks/useParams';
import useNavigate from '../hooks/useNavigate';
import useSearchParams from '../hooks/useSearchParams';
import {
  publicSdkApi,
  type PublicInterviewMessage,
  type PublicInterviewSession,
} from '../lib/publicSdkApi';
import { UserTestsRecorder } from '../../sdk/recorder';
import styles from './PublicParticipant.module.css';

type PermissionState = 'unknown' | 'granted' | 'denied';

export default function PublicInterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const key = searchParams.get('key') || '';

  const recorderRef = useRef<UserTestsRecorder | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);

  const [session, setSession] = useState<PublicInterviewSession | null>(null);
  const [messages, setMessages] = useState<PublicInterviewMessage[]>([]);
  const [draft, setDraft] = useState('');

  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  const [micPermission, setMicPermission] = useState<PermissionState>('unknown');
  const [screenPermission, setScreenPermission] = useState<PermissionState>('unknown');
  const [recordingState, setRecordingState] = useState('idle');

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session id');
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
      .getInterview(sessionId, key)
      .then((data) => {
        setSession(data.session);
        setMessages(data.messages);
        setParticipantName(data.session.participant_name || '');
        setParticipantEmail(data.session.participant_email || '');

        if (data.session.status === 'completed') {
          navigate(`/u/complete/${sessionId}?key=${encodeURIComponent(key)}`, { replace: true });
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, key, navigate]);

  useEffect(() => {
    if (!sessionId || !key) return;

    const recorder = new UserTestsRecorder({
      projectKey: key,
      sessionId,
      captureScreen: true,
      captureClicks: false,
      captureNavigation: false,
      onReady: () => setRecordingState('ready'),
      onError: (e) => setError(e.message),
    });

    recorderRef.current = recorder;
    void recorder.init();

    return () => {
      if (recorderRef.current) {
        void recorderRef.current.dispose().catch(() => {
          // best effort cleanup
        });
      }
      recorderRef.current = null;
    };
  }, [sessionId, key]);

  const handlePermissionPreflight = async () => {
    if (!recorderRef.current) return;

    const result = await recorderRef.current.requestPermissions({ audio: true, screen: true });

    setMicPermission(result.audio ? 'granted' : 'denied');
    setScreenPermission(result.screen ? 'granted' : 'denied');

    if (result.errors.length > 0) {
      setError(result.errors.join(' | '));
    } else {
      setError(null);
    }
  };

  const saveParticipant = async () => {
    if (!sessionId || !key) return;

    await publicSdkApi.patchParticipant(sessionId, key, {
      participant_name: participantName || undefined,
      participant_email: participantEmail || undefined,
    });
  };

  const handleStart = async () => {
    if (!sessionId || !key || !session) return;

    setError(null);

    try {
      if (participantName || participantEmail) {
        await saveParticipant();
      }

      if (session.status === 'pending') {
        const started = await publicSdkApi.startInterview(sessionId, key);
        setMessages((prev) => {
          const hasOpening = prev.some((m) => m.role === 'interviewer');
          if (hasOpening) return prev;
          return [
            ...prev,
            {
              id: `opening-${Date.now()}`,
              role: 'interviewer',
              content: started.message,
              timestamp_ms: 0,
            },
          ];
        });

        setSession((prev) => (prev ? { ...prev, status: 'active', current_phase: started.phase } : prev));
      }
      // B3: If already active (page reload), just resume recording — no double-start

      if (recorderRef.current) {
        await recorderRef.current.start();
        setRecordingState(recorderRef.current.getState());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview');
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !sessionId || !key || !session) return;

    const userText = draft.trim();
    setDraft('');
    setSending(true);

    const optimisticMessage: PublicInterviewMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp_ms: 0,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await publicSdkApi.sendMessage(sessionId, key, {
        content: userText,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `local-ai-${Date.now()}`,
          role: 'interviewer',
          content: response.message,
          timestamp_ms: 0,
        },
      ]);

      if (response.is_complete) {
        navigate(`/u/complete/${sessionId}?key=${encodeURIComponent(key)}`, { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEnd = async () => {
    if (!sessionId || !key) return;

    setEnding(true);
    setError(null);

    try {
      if (recorderRef.current) {
        await recorderRef.current.stop();
        setRecordingState(recorderRef.current.getState());
      } else {
        await publicSdkApi.endInterview(sessionId, key);
      }

      navigate(`/u/complete/${sessionId}?key=${encodeURIComponent(key)}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end interview');
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading interview room...</div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Unable to load interview</h1>
          <p className={styles.error}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Interview Room</h1>
        <p className={styles.description}>
          Status: {session?.status || 'unknown'}
          <span className={styles.badge}>Recording: {recordingState}</span>
        </p>

        <div className={styles.row}>
          <div>
            <label className={styles.label}>Your name</label>
            <input
              className={styles.input}
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className={styles.label}>Your email</label>
            <input
              className={styles.input}
              type="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="button" onClick={handlePermissionPreflight}>
            Check mic + screen permissions
          </button>
          <button className={styles.button} type="button" onClick={handleStart}>
            {session?.status === 'pending' ? 'Start interview' : 'Resume recording'}
          </button>
        </div>

        <p className={styles.info}>
          Mic: {micPermission} · Screen: {screenPermission}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.messages}>
          {messages.length === 0 ? (
            <p className={styles.description}>No messages yet. Start the interview to begin.</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${message.role === 'user' ? styles.messageUser : styles.messageInterviewer}`}
              >
                <span className={styles.messageMeta}>{message.role}</span>
                {message.content}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage}>
          <label className={styles.label} style={{ marginTop: '0.8rem' }}>Your response</label>
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your answer here..."
          />

          <div className={styles.actions}>
            <button className={styles.button} disabled={sending || !draft.trim()} type="submit">
              {sending ? 'Sending...' : 'Send message'}
            </button>
            <button className={styles.buttonSecondary} disabled={ending} type="button" onClick={handleEnd}>
              {ending ? 'Ending...' : 'End interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
