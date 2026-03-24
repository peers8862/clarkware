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
var MessagingWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingWidget = exports.MESSAGING_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
exports.MESSAGING_WIDGET_ID = 'clark-messaging';
let MessagingWidget = MessagingWidget_1 = class MessagingWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.messages = [];
        this.connected = false;
        this.ws = null;
        this.streamId = null;
        this.inputValue = '';
        this.id = exports.MESSAGING_WIDGET_ID;
        this.title.label = MessagingWidget_1.LABEL;
        this.title.closable = false;
        this.update();
    }
    connectToStream(streamId, apiBaseUrl = 'ws://localhost:3000') {
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
        ws.onmessage = (event) => {
            try {
                const domainEvent = JSON.parse(event.data);
                if (domainEvent.type === 'message.sent' || domainEvent.type === 'note.created') {
                    this.messages.push({
                        id: domainEvent.id,
                        from: domainEvent.actor.id,
                        body: domainEvent.payload.body ?? JSON.stringify(domainEvent.payload),
                        sentAt: domainEvent.occurredAt,
                    });
                    this.update();
                }
            }
            catch {
                // ignore malformed messages
            }
        };
        ws.onerror = () => {
            this.connected = false;
            this.update();
        };
        this.ws = ws;
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "clark-messaging", style: { display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)' }, children: "Messages" }), (0, jsx_runtime_1.jsx)("span", { style: {
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: this.connected ? '#22c55e' : '#ef4444',
                                display: 'inline-block',
                            } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11px', color: 'var(--theia-descriptionForeground)' }, children: this.connected ? 'Connected' : 'Disconnected' })] }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' }, children: this.messages.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-descriptionForeground)', fontSize: '13px' }, children: this.streamId ? 'No messages yet.' : 'Connect to a job stream to see messages.' })) : (this.messages.map((msg) => ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '6px 0', borderBottom: '1px solid var(--theia-border-color)', fontSize: '13px' }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontWeight: 500, color: 'var(--theia-foreground)' }, children: [msg.from, ": "] }), (0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--theia-foreground)' }, children: msg.body }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: 'var(--theia-descriptionForeground)' }, children: new Date(msg.sentAt).toLocaleTimeString() })] }, msg.id)))) }), this.streamId && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '6px' }, children: [(0, jsx_runtime_1.jsx)("input", { style: {
                                flex: 1, padding: '6px 8px', fontSize: '13px',
                                background: 'var(--theia-input-background)',
                                color: 'var(--theia-input-foreground)',
                                border: '1px solid var(--theia-input-border)',
                                borderRadius: '3px',
                            }, placeholder: "Message\u2026", value: this.inputValue, onChange: (e) => { this.inputValue = e.target.value; }, onKeyDown: (e) => { if (e.key === 'Enter')
                                this.send(); }, disabled: !this.connected }), (0, jsx_runtime_1.jsx)("button", { style: { padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }, onClick: () => this.send(), disabled: !this.connected, children: "Send" })] }))] }));
    }
    send() {
        if (!this.inputValue.trim() || !this.connected)
            return;
        // Message sending via REST POST /v1/notes or messaging API — Phase 1 placeholder
        this.inputValue = '';
        this.update();
    }
};
exports.MessagingWidget = MessagingWidget;
MessagingWidget.ID = exports.MESSAGING_WIDGET_ID;
MessagingWidget.LABEL = 'Messages';
exports.MessagingWidget = MessagingWidget = MessagingWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], MessagingWidget);
