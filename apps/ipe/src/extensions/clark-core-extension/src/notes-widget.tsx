import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import { fetchNotes, postNote } from './clark-api';
import type { Note } from './clark-api';

export const NOTES_WIDGET_ID = 'clark-notes';

@injectable()
export class NotesWidget extends ReactWidget {
  static readonly ID = NOTES_WIDGET_ID;
  static readonly LABEL = 'Notes';

  private notes: Note[] = [];
  private jobId: string | null = null;
  private jobTitle: string | null = null;
  private loading = false;
  private submitting = false;
  private error: string | null = null;
  private inputValue = '';

  constructor() {
    super();
    this.id = NOTES_WIDGET_ID;
    this.title.label = NotesWidget.LABEL;
    this.title.closable = false;
    this.update();

    window.addEventListener('clark:job-selected', (e) => {
      const { jobId, jobTitle } = (e as CustomEvent<{ jobId: string; jobTitle: string }>).detail;
      this.loadNotes(jobId, jobTitle);
    });
  }

  private async loadNotes(jobId: string, jobTitle: string): Promise<void> {
    this.jobId = jobId;
    this.jobTitle = jobTitle;
    this.notes = [];
    this.loading = true;
    this.error = null;
    this.update();
    try {
      this.notes = await fetchNotes(jobId);
    } catch (e) {
      this.error = String(e);
    }
    this.loading = false;
    this.update();
  }

  private async submitNote(): Promise<void> {
    if (!this.inputValue.trim() || !this.jobId || this.submitting) return;
    const body = this.inputValue.trim();
    this.submitting = true;
    this.inputValue = '';
    this.error = null;
    this.update();
    try {
      const note = await postNote(this.jobId, body);
      this.notes = [note, ...this.notes];
    } catch (e) {
      this.error = String(e);
    }
    this.submitting = false;
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px' }}>
        <div style={sectionLabel}>
          Notes {this.jobTitle ? `— ${this.jobTitle}` : ''}
        </div>

        {this.error && (
          <div style={{ fontSize: '11px', color: 'var(--theia-errorForeground)', marginBottom: '6px' }}>
            {this.error}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px' }}>
          {this.loading && <p style={muted}>Loading notes…</p>}
          {!this.loading && !this.jobId && <p style={muted}>Select a job to view notes.</p>}
          {!this.loading && this.jobId && this.notes.length === 0 && (
            <p style={muted}>No notes yet.</p>
          )}
          {this.notes.map(note => (
            <div key={note.id} style={{
              padding: '7px 10px', marginBottom: '5px',
              background: 'var(--theia-editor-background)',
              borderRadius: '3px', fontSize: '12px',
              border: '1px solid var(--theia-border-color)',
            }}>
              <div style={{ color: 'var(--theia-foreground)' }}>{note.body}</div>
              <div style={{ fontSize: '10px', color: 'var(--theia-descriptionForeground)', marginTop: '3px' }}>
                {note.author_actor_id} · {new Date(note.created_at).toLocaleString()}
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
              placeholder="Add a note…"
              value={this.inputValue}
              disabled={this.submitting}
              onChange={(e) => { this.inputValue = (e.target as HTMLInputElement).value; this.update(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void this.submitNote(); }}
            />
            <button
              style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}
              disabled={this.submitting}
              onClick={() => void this.submitNote()}
            >
              {this.submitting ? '…' : 'Add'}
            </button>
          </div>
        )}
      </div>
    );
  }
}

const sectionLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: '8px',
  color: 'var(--theia-descriptionForeground)',
};

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};
