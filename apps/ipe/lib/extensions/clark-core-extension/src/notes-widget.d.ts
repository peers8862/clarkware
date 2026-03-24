import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const NOTES_WIDGET_ID = "clark-notes";
interface Note {
    id: string;
    body: string;
    authorId: string;
    createdAt: string;
}
export declare class NotesWidget extends ReactWidget {
    static readonly ID = "clark-notes";
    static readonly LABEL = "Notes";
    private notes;
    private jobId;
    private inputValue;
    constructor();
    setJobId(jobId: string | null): void;
    addNote(note: Note): void;
    protected render(): React.ReactNode;
    private submitNote;
}
export {};
//# sourceMappingURL=notes-widget.d.ts.map