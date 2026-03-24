import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';

export const MESSAGING_WIDGET_ID = 'clark-messaging';

interface ChatMessage {
  id: string;
  from: string;
  body: string;
  sentAt: string;
}

@injectable()
export class MessagingWidget extends ReactWidget {
  static readonly ID = MESSAGING_WIDGET_ID;
  static readonly LABEL = 'Messages';

  private messages: ChatMessage[] = [];
  private connected = false;
  private ws: WebSocket | null = null;
  private streamId: string | null = null;
  private inputValue = '';

  constructor() {
    super();
    this.id = MESSAGING_WIDGET_ID;
    this.title.label = MessagingWidget.LABEL;
    this.title.closable = false;
    this.update();
  }

  connectToStream(streamId: string, apiBaseUrl = 'ws://localhost:3000'): void {
    if (this.ws) {
      this.ws.close();
    }

    this.streamId = streamId;
    this.messages = [];

    const wsUrl = `${apiBaseUrl}/ws?stream=${encodeURIComponent(streamId)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      this.connected = true;
      this.update();
    };

    ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      this.update();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const domainEvent = JSON.parse(event.data as string) as {
          type: string;
          payload: { body?: string };
          actor: { id: string };
          occurredAt: string;
          id: string;
        };

        if (domainEvent.type === 'message.sent' || domainEvent.type === 'note.created') {
          this.messages.push({
            id: domainEvent.id,
            from: domainEvent.actor.id,
            body: domainEvent.payload.body ?? JSON.stringify(domainEvent.payload),
            sentAt: domainEvent.occurredAt,
          });
          this.update();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      this.connected = false;
      this.update();
    };

    this.ws = ws;
  }

  protected render(): React.ReactNode {
    return (
      <div className="clark-messaging" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)' }}>
            Messages
          </span>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: this.connected ? '#22c55e' : '#ef4444',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: '11px', color: 'var(--theia-descriptionForeground)' }}>
            {this.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Message feed */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px' }}>
          {this.messages.length === 0 ? (
            <p style={{ color: 'var(--theia-descriptionForeground)', fontSize: '13px' }}>
              {this.streamId ? 'No messages yet.' : 'Connect to a job stream to see messages.'}
            </p>
          ) : (
            this.messages.map((msg) => (
              <div key={msg.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--theia-border-color)', fontSize: '13px' }}>
                <span style={{ fontWeight: 500, color: 'var(--theia-foreground)' }}>{msg.from}: </span>
                <span style={{ color: 'var(--theia-foreground)' }}>{msg.body}</span>
                <div style={{ fontSize: '11px', color: 'var(--theia-descriptionForeground)' }}>
                  {new Date(msg.sentAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input row */}
        {this.streamId && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{
                flex: 1, padding: '6px 8px', fontSize: '13px',
                background: 'var(--theia-input-background)',
                color: 'var(--theia-input-foreground)',
                border: '1px solid var(--theia-input-border)',
                borderRadius: '3px',
              }}
              placeholder="Message…"
              value={this.inputValue}
              onChange={(e) => { this.inputValue = (e.target as HTMLInputElement).value; }}
              onKeyDown={(e) => { if (e.key === 'Enter') this.send(); }}
              disabled={!this.connected}
            />
            <button
              style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
              onClick={() => this.send()}
              disabled={!this.connected}
            >
              Send
            </button>
          </div>
        )}
      </div>
    );
  }

  private send(): void {
    if (!this.inputValue.trim() || !this.connected) return;
    // Message sending via REST POST /v1/notes or messaging API — Phase 1 placeholder
    this.inputValue = '';
    this.update();
  }
}
