declare module '@xmpp/client' {
  export function client(options: {
    service: string;
    domain: string;
    username: string;
    password: string;
  }): XmppClient;

  export function xml(
    name: string,
    attrs?: Record<string, string | null | undefined>,
    ...children: (XmlElement | string | null | undefined)[]
  ): XmlElement;

  export interface XmlElement {
    is(name: string): boolean;
    getChild(name: string): XmlElement | undefined;
    getChildText(name: string): string | null;
    attrs: Record<string, string | undefined>;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  export interface XmppClient {
    start(): Promise<void>;
    stop(): Promise<void>;
    send(stanza: XmlElement): Promise<void>;
    on(event: 'stanza', handler: (stanza: XmlElement) => void): void;
    on(event: 'error', handler: (err: Error) => void): void;
    on(event: 'online', handler: () => void): void;
    on(event: 'offline', handler: () => void): void;
  }
}

declare module '@xmpp/debug' {
  import type { XmppClient } from '@xmpp/client';
  export default function debug(client: XmppClient, force?: boolean): void;
}
