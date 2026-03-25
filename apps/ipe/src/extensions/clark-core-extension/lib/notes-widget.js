"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotesWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesWidget = exports.NOTES_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
const clark_api_1 = require("./clark-api");
exports.NOTES_WIDGET_ID = 'clark-notes';
let NotesWidget = NotesWidget_1 = class NotesWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.notes = [];
        this.jobId = null;
        this.jobTitle = null;
        this.loading = false;
        this.submitting = false;
        this.error = null;
        this.inputValue = '';
        this.id = exports.NOTES_WIDGET_ID;
        this.title.label = NotesWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        window.addEventListener('clark:job-selected', (e) => {
            const { jobId, jobTitle } = e.detail;
            this.loadNotes(jobId, jobTitle);
        });
    }
    async loadNotes(jobId, jobTitle) {
        this.jobId = jobId;
        this.jobTitle = jobTitle;
        this.notes = [];
        this.loading = true;
        this.error = null;
        this.update();
        try {
            this.notes = await (0, clark_api_1.fetchNotes)(jobId);
        }
        catch (e) {
            this.error = String(e);
        }
        this.loading = false;
        this.update();
    }
    async submitNote() {
        if (!this.inputValue.trim() || !this.jobId || this.submitting)
            return;
        const body = this.inputValue.trim();
        this.submitting = true;
        this.inputValue = '';
        this.error = null;
        this.update();
        try {
            const note = await (0, clark_api_1.postNote)(this.jobId, body);
            this.notes = [note, ...this.notes];
        }
        catch (e) {
            this.error = String(e);
        }
        this.submitting = false;
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: sectionLabel, children: ["Notes ", this.jobTitle ? `— ${this.jobTitle}` : ''] }), this.error && ((0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: 'var(--theia-errorForeground)', marginBottom: '6px' }, children: this.error })), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' }, children: [this.loading && (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Loading notes\u2026" }), !this.loading && !this.jobId && (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Select a job to view notes." }), !this.loading && this.jobId && this.notes.length === 0 && ((0, jsx_runtime_1.jsx)("p", { style: muted, children: "No notes yet." })), this.notes.map(note => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                padding: '7px 10px', marginBottom: '5px',
                                background: 'var(--theia-editor-background)',
                                borderRadius: '3px', fontSize: '12px',
                                border: '1px solid var(--theia-border-color)',
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { color: 'var(--theia-foreground)' }, children: note.body }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '10px', color: 'var(--theia-descriptionForeground)', marginTop: '3px' }, children: [note.author_actor_id, " \u00B7 ", new Date(note.created_at).toLocaleString()] })] }, note.id)))] }), this.jobId && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '6px' }, children: [(0, jsx_runtime_1.jsx)("input", { style: {
                                flex: 1, padding: '5px 8px', fontSize: '12px',
                                background: 'var(--theia-input-background)',
                                color: 'var(--theia-input-foreground)',
                                border: '1px solid var(--theia-input-border)',
                                borderRadius: '3px',
                            }, placeholder: "Add a note\u2026", value: this.inputValue, disabled: this.submitting, onChange: (e) => { this.inputValue = e.target.value; this.update(); }, onKeyDown: (e) => { if (e.key === 'Enter')
                                void this.submitNote(); } }), (0, jsx_runtime_1.jsx)("button", { style: { padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }, disabled: this.submitting, onClick: () => void this.submitNote(), children: this.submitting ? '…' : 'Add' })] }))] }));
    }
};
exports.NotesWidget = NotesWidget;
NotesWidget.ID = exports.NOTES_WIDGET_ID;
NotesWidget.LABEL = 'Notes';
exports.NotesWidget = NotesWidget = NotesWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], NotesWidget);
const sectionLabel = {
    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '8px',
    color: 'var(--theia-descriptionForeground)',
};
const muted = {
    color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};
