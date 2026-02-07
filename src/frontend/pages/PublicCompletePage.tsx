import { useEffect, useState } from 'react';
import useParams from '../hooks/useParams';
import useSearchParams from '../hooks/useSearchParams';
import { publicSdkApi, type PublicInterviewSession } from '../lib/publicSdkApi';
import styles from './PublicParticipant.module.css';

export default function PublicCompletePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key') || '';

  const validationError = !sessionId
    ? 'Missing session id'
    : !key
      ? 'Missing project key in URL. Please use the full invite link.'
      : !key.startsWith('ut_pub_')
        ? 'Invalid public invite key. Please use the public participant link.'
        : null;

  const [loading, setLoading] = useState(() => validationError === null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [session, setSession] = useState<PublicInterviewSession | null>(null);

  useEffect(() => {
    if (validationError || !sessionId) {
      return;
    }

    publicSdkApi
      .getInterview(sessionId, key)
      .then((data) => setSession(data.session))
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, key, validationError]);

  const error = validationError || fetchError;

  if (error) {
     return (
       <div className={styles.page}>
         <div className={styles.card}>
           <h1 className={styles.title}>Thank you</h1>
           <p className={styles.error}>{error}</p>
         </div>
       </div>
     );
   }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading completion details...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Thank you for your time!</h1>
        <p className={styles.description}>
          Your interview has been submitted successfully.
        </p>

        <p className={styles.info}>
          Processing status:{' '}
          <strong>{session?.processing_status === 'processed' ? 'Processed' : 'Processing'}</strong>
        </p>

        {session?.signal_count ? (
          <p className={styles.success}>Signals extracted so far: {session.signal_count}</p>
        ) : (
          <p className={styles.description}>We are now processing your interview.</p>
        )}

        {session?.next_step_message && (
          <p className={styles.info}>{session.next_step_message}</p>
        )}
      </div>
    </div>
  );
}
