import { xml } from '@xmpp/client';
import type { XmppClient } from './client.js';

/**
 * Manages MUC (Multi-User Chat) rooms for job conversations.
 * Rooms are named: job-{jobId}@conference.clark.local
 */
export class RoomManager {
  private readonly conferenceDomain: string;

  constructor(
    private readonly client: XmppClient,
    conferenceDomain = 'conference.clark.local',
  ) {
    this.conferenceDomain = conferenceDomain;
  }

  roomJid(jobId: string): string {
    return `job-${jobId}@${this.conferenceDomain}`;
  }

  async createJobRoom(jobId: string, jobName: string, participantJid: string): Promise<string> {
    const roomJid = this.roomJid(jobId);
    await this.joinRoom(roomJid, participantJid, 'clark-api');

    // Set room subject to job name
    await this.setRoomSubject(roomJid, participantJid, jobName);

    return roomJid;
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

  async setRoomSubject(roomJid: string, fromJid: string, subject: string): Promise<void> {
    const messageXml = xml(
      'message',
      { from: fromJid, to: roomJid, type: 'groupchat' },
      xml('subject', {}, subject),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.client as any).xmpp?.send(messageXml);
  }
}
