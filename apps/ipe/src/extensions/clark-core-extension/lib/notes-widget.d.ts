import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const NOTES_WIDGET_ID = "clark-notes";
export declare class NotesWidget extends ReactWidget {
    static readonly ID = "clark-notes";
    static readonly LABEL = "Notes";
    private notes;
    private jobId;
    private jobTitle;
    private loading;
    private submitting;
    private error;
    private inputValue;
    constructor();
    private loadNotes;
    private submitNote;
    protected render(): React.ReactNode;
}
