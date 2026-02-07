/**
 * UserTests Recording SDK (PRD-02)
 *
 * Lightweight SDK for embedding on customer websites to capture:
 * - Audio recording (user voice during interview)
 * - Optional screen recording chunks
 * - Click tracking
 * - Navigation tracking
 * - Custom markers
 */

export interface RecorderConfig {
  projectKey: string;        // Public SDK key
  apiBase?: string;          // API endpoint (defaults to current origin)
  sessionId?: string;        // Pre-created session ID
  autoStart?: boolean;       // Start recording immediately
  captureClicks?: boolean;   // Track clicks (default: true)
  captureNavigation?: boolean; // Track navigation (default: true)
  captureScreen?: boolean;   // Capture screen via getDisplayMedia (default: false)
  onReady?: () => void;
  onError?: (error: Error) => void;
  onSessionCreated?: (sessionId: string) => void;
}

export interface RecordingEvent {
  type: string;
  timestamp_ms: number;
  data: Record<string, unknown>;
}

export interface PermissionRequest {
  audio?: boolean;
  screen?: boolean;
}

export interface PermissionResult {
  audio: boolean;
  screen: boolean;
  errors: string[];
}

type RecorderState = 'idle' | 'ready' | 'recording' | 'paused' | 'stopped' | 'error';

export class UserTestsRecorder {
  private config: Required<RecorderConfig>;
  private state: RecorderState = 'idle';
  private sessionId: string | null = null;
  private startTime: number = 0;

  private audioRecorder: MediaRecorder | null = null;
  private screenRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;

  private audioChunkIndex = 0;
  private screenChunkIndex = 0;

  private eventBuffer: RecordingEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private navHandler: (() => void) | null = null;
  private originalPushState: History['pushState'] | null = null;
  private originalReplaceState: History['replaceState'] | null = null;

  constructor(config: RecorderConfig) {
    this.config = {
      apiBase: '',
      sessionId: config.sessionId || '',
      autoStart: false,
      captureClicks: true,
      captureNavigation: true,
      captureScreen: false,
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
        const res = await this.apiPost('/api/sdk/sessions', {});
        this.sessionId = res.session_id as string;
        this.config.onSessionCreated(this.sessionId);
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
   * Preflight permission request for microphone and/or screen.
   */
  async requestPermissions(request: PermissionRequest = { audio: true, screen: this.config.captureScreen }): Promise<PermissionResult> {
    const result: PermissionResult = {
      audio: false,
      screen: false,
      errors: [],
    };

    if (request.audio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        result.audio = true;
      } catch (e) {
        result.errors.push(`Microphone permission denied: ${String(e)}`);
      }
    }

    if (request.screen) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        stream.getTracks().forEach((track) => track.stop());
        result.screen = true;
      } catch (e) {
        result.errors.push(`Screen permission denied: ${String(e)}`);
      }
    }

    return result;
  }

  /**
   * Start recording audio/screen and tracking events.
   */
  async start(): Promise<void> {
    if (this.state === 'paused') {
      this.resume();
      return;
    }

    if (this.state !== 'ready') {
      throw new Error(`Cannot start from state: ${this.state}`);
    }

    this.startTime = Date.now();
    this.state = 'recording';

    await this.startAudioRecording();

    if (this.config.captureScreen) {
      await this.startScreenRecording();
    }

    if (this.config.captureClicks) {
      this.startClickTracking();
    }

    if (this.config.captureNavigation) {
      this.startNavigationTracking();
    }

    // Flush events every 5 seconds
    this.flushInterval = setInterval(() => {
      void this.flushEvents();
    }, 5000);
  }

  /**
   * Pause recording.
   */
  pause(): void {
    if (this.state !== 'recording') return;
    this.state = 'paused';
    this.audioRecorder?.pause();
    this.screenRecorder?.pause();
  }

  /**
   * Resume recording.
   */
  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'recording';
    this.audioRecorder?.resume();
    this.screenRecorder?.resume();
  }

  /**
   * Stop recording and finalize session.
   */
  async stop(): Promise<void> {
    await this.stopInternal(true);
  }

  /**
   * Dispose recorder resources without ending the interview session.
   * Useful for unmount/reload flows where the participant may reconnect.
   */
  async dispose(): Promise<void> {
    await this.stopInternal(false);
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

  private async stopInternal(finalizeSession: boolean): Promise<void> {
    const wasRecording = this.state === 'recording' || this.state === 'paused';

    if (!wasRecording) {
      if (finalizeSession && this.sessionId) {
        this.state = 'stopped';
        await this.apiPost(`/api/sdk/interview/${this.sessionId}/end`, {});
      }
      return;
    }

    this.state = 'stopped';

    if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
      this.audioRecorder.stop();
    }

    if (this.screenRecorder && this.screenRecorder.state !== 'inactive') {
      this.screenRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop());
      this.audioStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    this.audioRecorder = null;
    this.screenRecorder = null;

    this.stopClickTracking();
    this.stopNavigationTracking();

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flushEvents();

    if (finalizeSession && this.sessionId) {
      await this.apiPost(`/api/sdk/interview/${this.sessionId}/end`, {});
    }
  }

  private async startAudioRecording(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      this.audioRecorder = new MediaRecorder(this.audioStream, {
        mimeType: this.getSupportedAudioMimeType(),
      });

      this.audioRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          void this.uploadAudioChunk(e.data);
        }
      };

      this.audioRecorder.start(5000);
    } catch (e) {
      console.warn('Audio recording not available:', e);
    }
  }

  private async startScreenRecording(): Promise<void> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 10,
        },
        audio: false,
      });

      this.screenRecorder = new MediaRecorder(this.screenStream, {
        mimeType: this.getSupportedVideoMimeType(),
      });

      this.screenRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          void this.uploadScreenChunk(e.data);
        }
      };

      this.screenRecorder.start(5000);
    } catch (e) {
      console.warn('Screen recording not available:', e);
    }
  }

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
      await this.apiPost('/api/sdk/events', {
        session_id: this.sessionId,
        events,
      });
    } catch (e) {
      this.eventBuffer.unshift(...events);
      console.warn('Failed to flush events:', e);
    }
  }

  private async uploadAudioChunk(blob: Blob): Promise<void> {
    if (!this.sessionId) return;

    const chunkIndex = this.audioChunkIndex++;

    const formData = new FormData();
    formData.append('audio', blob, `chunk-${chunkIndex}.webm`);
    formData.append('chunk_index', String(chunkIndex));
    formData.append('session_id', this.sessionId);

    await this.uploadFormWithRetry('/api/sdk/audio/upload', formData, 2, `audio chunk ${chunkIndex}`);
  }

  private async uploadScreenChunk(blob: Blob): Promise<void> {
    if (!this.sessionId) return;

    const chunkIndex = this.screenChunkIndex++;

    const formData = new FormData();
    formData.append('screen', blob, `screen-${chunkIndex}.webm`);
    formData.append('chunk_index', String(chunkIndex));
    formData.append('session_id', this.sessionId);

    await this.uploadFormWithRetry('/api/sdk/screen/upload', formData, 2, `screen chunk ${chunkIndex}`);
  }

  private async uploadFormWithRetry(path: string, body: FormData, retries: number, label: string): Promise<void> {
    const attempt = async (remaining: number): Promise<void> => {
      try {
        const res = await fetch(`${this.config.apiBase}${path}`, {
          method: 'POST',
          headers: {
            'X-Project-Key': this.config.projectKey,
          },
          body,
        });

        if (!res.ok) {
          throw new Error(`Upload failed (${res.status})`);
        }
      } catch (e) {
        if (remaining <= 0) {
          console.warn(`Failed to upload ${label}:`, e);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * (retries - remaining + 1)));
        await attempt(remaining - 1);
      }
    };

    await attempt(retries);
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
    this.navHandler = () => {
      this.addEvent('navigation', {
        url: window.location.href,
        page_title: document.title,
      });
    };

    window.addEventListener('popstate', this.navHandler);

    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    const handler = this.navHandler;
    const originalPush = this.originalPushState;
    const originalReplace = this.originalReplaceState;

    history.pushState = ((...args: Parameters<History['pushState']>) => {
      if (originalPush) {
        originalPush.apply(history, args);
      }
      handler();
    }) as History['pushState'];

    history.replaceState = ((...args: Parameters<History['replaceState']>) => {
      if (originalReplace) {
        originalReplace.apply(history, args);
      }
      handler();
    }) as History['replaceState'];
  }

  private stopNavigationTracking(): void {
    if (this.navHandler) {
      window.removeEventListener('popstate', this.navHandler);
      this.navHandler = null;
    }

    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }

    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
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

  private getSupportedAudioMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  }

  private getSupportedVideoMimeType(): string {
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'video/webm';
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
  void recorder.init();
  return recorder;
}

// Expose on window for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).UserTests = { init, UserTestsRecorder };
}
