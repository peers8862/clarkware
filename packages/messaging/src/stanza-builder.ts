import { xml } from '@xmpp/client';

type XmlElement = ReturnType<typeof xml>;

export function buildChatMessage(from: string, to: string, body: string): XmlElement {
  return xml('message', { from, to, type: 'chat' }, xml('body', {}, body));
}

export function buildGroupchatMessage(from: string, room: string, body: string): XmlElement {
  return xml('message', { from, to: room, type: 'groupchat' }, xml('body', {}, body));
}

export function buildPresence(from: string, room: string, nickname: string): XmlElement {
  return xml(
    'presence',
    { from, to: `${room}/${nickname}` },
    xml('x', { xmlns: 'http://jabber.org/protocol/muc' }),
  );
}
