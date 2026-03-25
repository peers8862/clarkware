import { xml } from '@xmpp/client';
import { ConversationType } from '@clark/core';
import type { XmppClient } from './client.js';

/**
 * RoomManager: manages MUC (Multi-User Chat) rooms for all conversation types.
 *
 * Room JID patterns (per-facility conference subdomain):
 *   job.{jobId}@conference.{facilityXmppDomain}
 *   issue.{issueId}@conference.{facilityXmppDomain}
 *   zone.{zoneId}@conference.{facilityXmppDomain}
 *   ws.{workstationId}@conference.{facilityXmppDomain}
 *   system.{name}@conference.{facilityXmppDomain}
 *   ai.{conversationId}@conference.{facilityXmppDomain}
 */
export class RoomManager {
  private readonly conferenceDomain: string;

  constructor(
    private readonly client: XmppClient,
    facilityXmppDomain: string,
  ) {
    this.conferenceDomain = `conference.${facilityXmppDomain}`;
  }

  // ── Room JID builders (one per conversation type) ──────────────────────

  jobRoomJid(jobId: string): string {
    return `job.${jobId}@${this.conferenceDomain}`;
  }

  issueRoomJid(issueId: string): string {
    return `issue.${issueId}@${this.conferenceDomain}`;
  }

  zoneRoomJid(zoneId: string): string {
    return `zone.${zoneId}@${this.conferenceDomain}`;
  }

  workstationRoomJid(workstationId: string): string {
    return `ws.${workstationId}@${this.conferenceDomain}`;
  }

  systemRoomJid(name: string): string {
    return `system.${name}@${this.conferenceDomain}`;
  }

  aiAssistRoomJid(conversationId: string): string {
    return `ai.${conversationId}@${this.conferenceDomain}`;
  }

  /**
   * Derive room JID from conversation type and a context ID.
   * Direct conversations use personal storage (no MUC room).
   */
  roomJidForType(
    type: ConversationType,
    contextId: string,
  ): string | null {
    switch (type) {
      case ConversationType.Job:       return this.jobRoomJid(contextId);
      case ConversationType.Issue:     return this.issueRoomJid(contextId);
      case ConversationType.Workspace: return this.zoneRoomJid(contextId);
      case ConversationType.System:    return this.systemRoomJid(contextId);
      case ConversationType.AIAssist:  return this.aiAssistRoomJid(contextId);
      case ConversationType.Direct:    return null; // no MUC for DMs
    }
  }

  // ── Room lifecycle ─────────────────────────────────────────────────────

  async createRoom(
    roomJid: string,
    subject: string,
    ownerJid: string,
    ownerNickname = 'clark-api',
  ): Promise<void> {
    await this.joinRoom(roomJid, ownerJid, ownerNickname);
    await this.setRoomSubject(roomJid, ownerJid, subject);
  }

  async joinRoom(roomJid: string, participantJid: string, nickname: string): Promise<void> {
    const presenceXml = xml(
      'presence',
      { from: participantJid, to: `${roomJid}/${nickname}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client as any).xmpp?.send(presenceXml);
  }

  async leaveRoom(roomJid: string, participantJid: string, nickname: string): Promise<void> {
    const presenceXml = xml(
      'presence',
      { from: participantJid, to: `${roomJid}/${nickname}`, type: 'unavailable' },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client as any).xmpp?.send(presenceXml);
  }

  async setRoomSubject(roomJid: string, fromJid: string, subject: string): Promise<void> {
    const messageXml = xml(
      'message',
      { from: fromJid, to: roomJid, type: 'groupchat' },
      xml('subject', {}, subject),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client as any).xmpp?.send(messageXml);
  }

  async inviteParticipant(
    roomJid: string,
    inviterJid: string,
    inviteeJid: string,
    reason?: string,
  ): Promise<void> {
    const messageXml = xml(
      'message',
      { from: inviterJid, to: roomJid },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
        xml('invite', { to: inviteeJid },
          reason ? xml('reason', {}, reason) : null,
        ),
      ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client as any).xmpp?.send(messageXml);
  }
}
