import { client as createXmppClient, xml } from '@xmpp/client';
import debug from '@xmpp/debug';

export interface XmppClientConfig {
  service: string;     // e.g. "xmpp://localhost:5222"
  domain: string;      // e.g. "clark.local"
  username: string;
  password: string;
}

export interface XmppMessage {
  from: string;
  to: string;
  body: string;
  stanzaId: string;
}

type MessageHandler = (message: XmppMessage) => void;

export class XmppClient {
  private xmpp: ReturnType<typeof createXmppClient>;
  private messageHandlers: MessageHandler[] = [];

  constructor(config: XmppClientConfig) {
    this.xmpp = createXmppClient({
      service: config.service,
      domain: config.domain,
      username: config.username,
      password: config.password,
    });

    if (process.env['NODE_ENV'] !== 'production') {
      debug(this.xmpp, false);
    }

    this.xmpp.on('stanza', (stanza: ReturnType<typeof xml>) => {
      if (stanza.is('message') && stanza.getChild('body')) {
        const body = stanza.getChildText('body');
        const from = stanza.attrs['from'] as string;
        const to = stanza.attrs['to'] as string;
        const stanzaId =
          (stanza.getChild('stanza-id')?.attrs['id'] as string | undefined) ??
          `${Date.now()}-${Math.random()}`;

        if (body) {
          for (const handler of this.messageHandlers) {
            handler({ from, to, body, stanzaId });
          }
        }
      }
    });
  }

  async connect(): Promise<void> {
    await this.xmpp.start();
  }

  async disconnect(): Promise<void> {
    await this.xmpp.stop();
  }

  async sendMessage(to: string, body: string): Promise<void> {
    await this.xmpp.send(
      xml('message', { to, type: 'chat' }, xml('body', {}, body)),
    );
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }
}
