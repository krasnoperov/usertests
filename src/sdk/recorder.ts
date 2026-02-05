/**
 * UserTests Recording SDK (PRD-02)
 *
 * Lightweight SDK for embedding on customer websites to capture:
 * - Audio recording (user voice during interview)
 * - Click tracking
 * - Navigation tracking
 * - Custom markers
 *
 * Target: <15KB gzipped, ~1MB/min bandwidth (audio only)
 */

export interface RecorderConfig {
  projectKey: string;        // Public SDK key
  apiBase?: string;          // API endpoint (defaults to production)
  sessionId?: string;        // Pre-created session ID
  autoStart?: boolean;       // Start recording immediately
  captureClicks?: boolean;   // Track clicks (default: true)
  captureNavigation?: boolean; // Track navigation (default: true)
  onReady?: () => void;
  onError?: (error: Error) => void;
  onSessionCreated?: (sessionId: string) => void;
}

export interface RecordingEvent {
  type: string;
  timestamp_ms: number;
  data: Record<string, unknown>;
}

type RecorderState = 'idle' | 'ready' | 'recording' | 'paused' | 'stopped' | 'error';

export class UserTestsRecorder {
  private config: Required<RecorderConfig>;
  private state: RecorderState = 'idle';
  private sessionId: string | null = null;
  private startTime: number = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunkIndex = 0;
  private eventBuffer: RecordingEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private navHandler: (() => void) | null = null;

  constructor(config: RecorderConfig) {
    this.config = {
      apiBase: '',
      sessionId: config.sessionId || '',
      autoStart: false,
      captureClicks: true,
      captureNavigation: true,
      onReady: () => {},
      onError: () => {},
      onSessionCreated: () => {},
      ...config,
    };

    this.sessionId = config.sessionId || null;
  }

  /**
   * Initialize the recorder. Call this before start().
   */
  async init(): Promise<void> {
    try {
      // Create session if not provided
      if (!this.sessionId) {
        const res = await this.apiPost('/api/sdk/sessions', {
          project_key: this.config.projectKey,
        });
        this.sessionId = res.session_id as string;
        this.config.onSessionCreated(this.sessionId!);
      }

      this.state = 'ready';
      this.config.onReady();

      if (this.config.autoStart) {
        await this.start();
      }
    } catch (e) {
      this.state = 'error';
      this.config.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * Start recording audio and tracking events.
   */
  async start(): Promise<void> {
    if (this.state !== 'ready' && this.state !== 'paused') {
      throw new Error(`Cannot start from state: ${this.state}`);
    }

    this.startTime = Date.now();
    this.state = 'recording';

    // Start audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimal for speech
        },
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.uploadAudioChunk(e.data);
        }
      };

      // Record in 5-second chunks
      this.mediaRecorder.start(5000);
    } catch (e) {
      console.warn('Audio recording not available:', e);
      // Continue without audio — clicks/navigation still work
    }

    // Start event tracking
    if (this.config.captureClicks) {
      this.startClickTracking();
    }
    if (this.config.captureNavigation) {
      this.startNavigationTracking();
    }

    // Flush events every 5 seconds
    this.flushInterval = setInterval(() => this.flushEvents(), 5000);
  }

  /**
   * Pause recording.
   */
  pause(): void {
    if (this.state !== 'recording') return;
    this.state = 'paused';
    this.mediaRecorder?.pause();
  }

  /**
   * Resume recording.
   */
  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'recording';
    this.mediaRecorder?.resume();
  }

  /**
   * Stop recording and finalize session.
   */
  async stop(): Promise<void> {
    if (this.state !== 'recording' && this.state !== 'paused') return;

    this.state = 'stopped';

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }

    // Stop event tracking
    this.stopClickTracking();
    this.stopNavigationTracking();

    // Flush remaining events
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushEvents();

    // Notify backend session is complete
    if (this.sessionId) {
      await this.apiPost(`/api/sdk/interview/${this.sessionId}/end`, {});
    }
  }

  /**
   * Add a custom marker event.
   */
  marker(name: string, data?: Record<string, unknown>): void {
    this.addEvent('marker', { name, ...data });
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get recorder state.
   */
  getState(): RecorderState {
    return this.state;
  }

  // --- Private methods ---

  private getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  private addEvent(type: string, data: Record<string, unknown>): void {
    if (this.state !== 'recording') return;

    this.eventBuffer.push({
      type,
      timestamp_ms: this.getElapsedMs(),
      data,
    });
  }

  private async flushEvents(): Promise<void> {
    if (!this.sessionId || this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      for (const event of events) {
        await this.apiPost(
          `/api/sdk/interview/${this.sessionId}/events`,
          event,
        );
      }
    } catch (e) {
      // Put events back on buffer for retry
      this.eventBuffer.unshift(...events);
      console.warn('Failed to flush events:', e);
    }
  }

  private async uploadAudioChunk(blob: Blob): Promise<void> {
    if (!this.sessionId) return;

    const chunkIndex = this.audioChunkIndex++;

    try {
      const formData = new FormData();
      formData.append('audio', blob, `chunk-${chunkIndex}.webm`);
      formData.append('chunk_index', String(chunkIndex));
      formData.append('session_id', this.sessionId);

      await fetch(`${this.config.apiBase}/api/sdk/audio/upload`, {
        method: 'POST',
        headers: {
          'X-Project-Key': this.config.projectKey,
        },
        body: formData,
      });
    } catch (e) {
      console.warn(`Failed to upload audio chunk ${chunkIndex}:`, e);
    }
  }

  private startClickTracking(): void {
    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      this.addEvent('click', {
        target_selector: this.getSelector(target),
        target_text: (target.textContent || '').trim().substring(0, 100),
        x: e.clientX,
        y: e.clientY,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      });
    };

    document.addEventListener('click', this.clickHandler, { capture: true });
  }

  private stopClickTracking(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  private startNavigationTracking(): void {
    // Track both traditional and SPA navigation
    this.navHandler = () => {
      this.addEvent('navigation', {
        url: window.location.href,
        page_title: document.title,
      });
    };

    window.addEventListener('popstate', this.navHandler);

    // Intercept pushState/replaceState
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    const handler = this.navHandler;

    history.pushState = function (...args) {
      origPush.apply(this, args);
      handler();
    };
    history.replaceState = function (...args) {
      origReplace.apply(this, args);
      handler();
    };
  }

  private stopNavigationTracking(): void {
    if (this.navHandler) {
      window.removeEventListener('popstate', this.navHandler);
      this.navHandler = null;
    }
  }

  private getSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;

    const parts: string[] = [];
    let current: HTMLElement | null = el;

    for (let i = 0; i < 5 && current && current !== document.body; i++) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c && !c.includes('_')).slice(0, 2);
        if (classes.length) {
          selector += `.${classes.join('.')}`;
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  }

  private async apiPost(path: string, body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.config.apiBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': this.config.projectKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return res.json() as Promise<Record<string, unknown>>;
  }
}

/**
 * Quick initialization function for script tag usage.
 *
 * Usage:
 * <script src="https://sdk.usertests.io/recorder.js"></script>
 * <script>
 *   UserTests.init({ projectKey: 'ut_pub_...' });
 * </script>
 */
export function init(config: RecorderConfig): UserTestsRecorder {
  const recorder = new UserTestsRecorder(config);
  recorder.init();
  return recorder;
}

// Expose on window for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).UserTests = { init, UserTestsRecorder };
}
