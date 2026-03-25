import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import { postNote, getToken } from 'clark-core-extension/lib/clark-api';

export const MESSAGING_WIDGET_ID = 'clark-messaging';

interface ChatMessage {
  id: string;
  from: string;
  body: string;
  sentAt: string;
  pending?: boolean;
  error?: boolean;
}

@injectable()
export class MessagingWidget extends ReactWidget {
  static readonly ID = MESSAGING_WIDGET_ID;
  static readonly LABEL = 'Messages';

  private messages: ChatMessage[] = [];
  private connected = false;
  private ws: WebSocket | null = null;
  private jobId: string | null = null;
  private jobTitle: string | null = null;
  private inputValue = '';

  constructor() {
    super();
    this.id = MESSAGING_WIDGET_ID;
    this.title.label = MessagingWidget.LABEL;
    this.title.closable = false;
    this.update();

    window.addEventListener('clark:job-selected', (e) => {
      const { jobId, jobTitle } = (e as CustomEvent<{ jobId: string; jobTitle: string }>).detail;
      this.connectToJob(jobId, jobTitle);
    });
  }

  private connectToJob(jobId: string, jobTitle: string): void {
    this.jobId = jobId;
    this.jobTitle = jobTitle;
    this.messages = [];

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const token = getToken();
    const wsUrl = `ws://localhost:3000/ws?stream=${encodeURIComponent(`job:${jobId}`)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => { this.connected = true; this.update(); };
    ws.onclose = () => { this.connected = false; this.ws = null; this.update(); };
    ws.onerror = () => { this.connected = false; this.update(); };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const ev = JSON.parse(event.data as string) as {
          type: string;
          payload: { body?: string };
          actor: { actorId: string };
          occurredAt: string;
          id: string;
        };
        if (ev.type === 'message.sent' && ev.payload.body) {
          this.messages = [...this.messages, {
            id: ev.id,
            from: ev.actor.actorId,
            body: ev.payload.body,
            sentAt: ev.occurredAt,
          }];
          this.update();
        }
      } catch { /* ignore malformed */ }
    };

    this.ws = ws;
    this.update();
  }

  private async send(): Promise<void> {
    const body = this.inputValue.trim();
    if (!body || !this.jobId) return;

    const tempId = `pending-${Date.now()}`;
    this.messages = [...this.messages, {
      id: tempId, from: 'me', body, sentAt: new Date().toISOString(), pending: true,
    }];
    this.inputValue = '';
    this.update();

    try {
      await postNote(this.jobId, body);
      // The WS broadcast will deliver the confirmed message; remove the pending one
      this.messages = this.messages.filter(m => m.id !== tempId);
    } catch (e) {
      this.messages = this.messages.map(m =>
        m.id === tempId ? { ...m, pending: false, error: true } : m,
      );
    }
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={sectionLabel}>
            Messages {this.jobTitle ? `— ${this.jobTitle}` : ''}
          </span>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
            background: this.connected ? '#22c55e' : '#64748b',
          }} />
          <span style={{ fontSize: '10px', color: 'var(--theia-descriptionForeground)' }}>
            {this.jobId ? (this.connected ? 'live' : 'connecting…') : 'no job'}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px' }}>
          {!this.jobId && <p style={muted}>Select a job to see real-time events.</p>}
          {this.jobId && this.messages.length === 0 && (
            <p style={muted}>No messages yet.</p>
          )}
          {this.messages.map(msg => (
            <div key={msg.id} style={{
              padding: '5px 0',
              borderBottom: '1px solid var(--theia-border-color)',
              fontSize: '12px',
              opacity: msg.pending ? 0.5 : 1,
            }}>
              <span style={{ fontWeight: 500, color: msg.error ? 'var(--theia-errorForeground)' : 'var(--theia-foreground)' }}>
                {msg.from}:{' '}
              </span>
              <span style={{ color: 'var(--theia-foreground)' }}>{msg.body}</span>
              {msg.error && <span style={{ fontSize: '10px', color: 'var(--theia-errorForeground)', marginLeft: '4px' }}>(failed)</span>}
              <div style={{ fontSize: '10px', color: 'var(--theia-descriptionForeground)' }}>
                {new Date(msg.sentAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        {this.jobId && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{
                flex: 1, padding: '5px 8px', fontSize: '12px',
                background: 'var(--theia-input-background)',
                color: 'var(--theia-input-foreground)',
                border: '1px solid var(--theia-input-border)',
                borderRadius: '3px',
              }}
              placeholder="Send a note…"
              value={this.inputValue}
              onChange={(e) => { this.inputValue = (e.target as HTMLInputElement).value; this.update(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void this.send(); }}
            />
            <button
              style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => void this.send()}
            >
              Send
            </button>
          </div>
        )}
      </div>
    );
  }
}

const sectionLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)', margin: 0,
};

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};
