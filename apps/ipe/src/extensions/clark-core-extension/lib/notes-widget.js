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
exports.NOTES_WIDGET_ID = 'clark-notes';
let NotesWidget = NotesWidget_1 = class NotesWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.notes = [];
        this.jobId = null;
        this.inputValue = '';
        this.id = exports.NOTES_WIDGET_ID;
        this.title.label = NotesWidget_1.LABEL;
        this.title.closable = false;
        this.update();
    }
    setJobId(jobId) {
        this.jobId = jobId;
        this.notes = [];
        this.update();
    }
    addNote(note) {
        this.notes = [note, ...this.notes];
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "clark-notes", style: { display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: 'var(--theia-descriptionForeground)' }, children: ["Notes ", this.jobId ? `— ${this.jobId}` : ''] }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' }, children: this.notes.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-descriptionForeground)', fontSize: '13px' }, children: "No notes yet." })) : (this.notes.map((note) => ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '8px', marginBottom: '6px', background: 'var(--theia-editor-background)', borderRadius: '4px', fontSize: '13px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { color: 'var(--theia-foreground)' }, children: note.body }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: 'var(--theia-descriptionForeground)', marginTop: '4px' }, children: new Date(note.createdAt).toLocaleString() })] }, note.id)))) }), this.jobId && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '6px' }, children: [(0, jsx_runtime_1.jsx)("input", { style: {
                                flex: 1, padding: '6px 8px', fontSize: '13px',
                                background: 'var(--theia-input-background)',
                                color: 'var(--theia-input-foreground)',
                                border: '1px solid var(--theia-input-border)',
                                borderRadius: '3px',
                            }, placeholder: "Add a note\u2026", value: this.inputValue, onChange: (e) => { this.inputValue = e.target.value; } }), (0, jsx_runtime_1.jsx)("button", { style: { padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }, onClick: () => this.submitNote(), children: "Add" })] }))] }));
    }
    submitNote() {
        if (!this.inputValue.trim() || !this.jobId)
            return;
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
};
exports.NotesWidget = NotesWidget;
NotesWidget.ID = exports.NOTES_WIDGET_ID;
NotesWidget.LABEL = 'Notes';
exports.NotesWidget = NotesWidget = NotesWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], NotesWidget);
