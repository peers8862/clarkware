import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';

export const NOTES_WIDGET_ID = 'clark-notes';

interface Note {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
}

@injectable()
export class NotesWidget extends ReactWidget {
  static readonly ID = NOTES_WIDGET_ID;
  static readonly LABEL = 'Notes';

  private notes: Note[] = [];
  private jobId: string | null = null;
  private inputValue = '';

  constructor() {
    super();
    this.id = NOTES_WIDGET_ID;
    this.title.label = NotesWidget.LABEL;
    this.title.closable = false;
    this.update();
  }

  setJobId(jobId: string | null): void {
    this.jobId = jobId;
    this.notes = [];
    this.update();
  }

  addNote(note: Note): void {
    this.notes = [note, ...this.notes];
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div className="clark-notes" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: 'var(--theia-descriptionForeground)' }}>
          Notes {this.jobId ? `— ${this.jobId}` : ''}
        </div>

        {/* Notes feed */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px' }}>
          {this.notes.length === 0 ? (
            <p style={{ color: 'var(--theia-descriptionForeground)', fontSize: '13px' }}>No notes yet.</p>
          ) : (
            this.notes.map((note) => (
              <div key={note.id} style={{ padding: '8px', marginBottom: '6px', background: 'var(--theia-editor-background)', borderRadius: '4px', fontSize: '13px' }}>
                <div style={{ color: 'var(--theia-foreground)' }}>{note.body}</div>
                <div style={{ fontSize: '11px', color: 'var(--theia-descriptionForeground)', marginTop: '4px' }}>
                  {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Note input */}
        {this.jobId && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{
                flex: 1, padding: '6px 8px', fontSize: '13px',
                background: 'var(--theia-input-background)',
                color: 'var(--theia-input-foreground)',
                border: '1px solid var(--theia-input-border)',
                borderRadius: '3px',
              }}
              placeholder="Add a note…"
              value={this.inputValue}
              onChange={(e) => { this.inputValue = (e.target as HTMLInputElement).value; }}
            />
            <button
              style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
              onClick={() => this.submitNote()}
            >
              Add
            </button>
          </div>
        )}
      </div>
    );
  }

  private submitNote(): void {
    if (!this.inputValue.trim() || !this.jobId) return;
    // In production this would call the API — placeholder for Phase 1
    this.addNote({
      id: Date.now().toString(),
      body: this.inputValue.trim(),
      authorId: 'local',
      createdAt: new Date().toISOString(),
    });
    this.inputValue = '';
    this.update();
  }
}
