import { Link } from '../components/Link';
import { useAuth } from '../contexts/useAuth';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <AppHeader
        leftSlot={(
          <Link to="/" className={styles.brand}>
            UserTests
          </Link>
        )}
        rightSlot={
          user ? (
            <HeaderNav userName={user.name} userEmail={user.email} />
          ) : (
            <Link to="/login" className={styles.authButton}>Sign In</Link>
          )
        }
      />

      <main className={styles.main}>
        <div className={styles.container}>
          {!user ? (
            <div className={styles.hero}>
              <h2 className={styles.headline}>Insights That Ship Themselves</h2>
              <p className={styles.subtitle}>
                AI interviews users, extracts Jobs-to-be-Done signals, prioritizes work,
                and autonomously implements improvements — then re-interviews to measure impact.
              </p>

              <div className={styles.features}>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🎙️</span>
                  <span className={styles.featureText}>AI Interviews</span>
                  <span className={styles.featureDescription}>JTBD methodology conducted by AI — at scale, 24/7</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🔍</span>
                  <span className={styles.featureText}>Signal Extraction</span>
                  <span className={styles.featureDescription}>Automatically find struggling moments, workarounds, and desired outcomes</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🤖</span>
                  <span className={styles.featureText}>Auto Implementation</span>
                  <span className={styles.featureDescription}>pi.dev generates code fixes, creates PRs, deploys changes</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>📊</span>
                  <span className={styles.featureText}>Impact Measurement</span>
                  <span className={styles.featureDescription}>Re-interview to verify the problem was actually solved</span>
                </div>
              </div>

              <div className={styles.ctaButtons}>
                <Link to="/login" className={styles.ctaButton}>Get Started</Link>
              </div>
            </div>
          ) : (
            <div className={styles.hero}>
              <h2 className={styles.headline}>Welcome back, {user.name}!</h2>
              <p className={styles.subtitle}>
                Head to your projects to view insights, manage tasks, and track impact.
              </p>
              <div className={styles.ctaButtons}>
                <Link to="/profile" className={styles.ctaButton}>View Projects</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
