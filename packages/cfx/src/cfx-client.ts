import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';

const EXCHANGE = 'clark.cfx';
const RECONNECT_INITIAL_MS = 500;
const RECONNECT_MAX_MS = 30_000;

export interface CFXClientOptions {
  amqpUrl: string;
  cfxHandle: string;
}

/**
 * Lightweight IPC-CFX publisher over AMQP 0.9.1.
 * Maintains a persistent connection to RabbitMQ with auto-reconnect.
 * Publish calls are fire-and-forget — messages are buffered in memory
 * if the broker is unreachable and flushed on reconnection.
 *
 * For production use, swap the in-memory outbox for the cfx_outbox PostgreSQL table.
 */
export type CFXConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export class CFXClient {
  private connection: amqp.Connection | undefined;
  private channel: amqp.Channel | undefined;
  private readonly outbox: Array<{ routingKey: string; envelope: object }> = [];
  private reconnectMs = RECONNECT_INITIAL_MS;
  private flushInterval: NodeJS.Timeout | undefined;
  private _status: CFXConnectionStatus = 'disconnected';

  get connectionStatus(): CFXConnectionStatus {
    return this._status;
  }

  constructor(private readonly opts: CFXClientOptions) {}

  async connect(): Promise<void> {
    await this.tryConnect();
    this.flushInterval = setInterval(() => {
      this.flush().catch(() => undefined);
    }, 5_000);
  }

  async close(): Promise<void> {
    if (this.flushInterval) clearInterval(this.flushInterval);
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  /**
   * Build and enqueue a CFX message with a new envelope.
   * For ad-hoc publishing (e.g. firmware flash from the IPE backend).
   * For guaranteed delivery, use writeToOutbox() + CfxOutboxFlusher instead.
   */
  publish(messageName: string, payload: Record<string, unknown>): void {
    const envelope = {
      MessageName: messageName,
      Version: '2.0',
      TimeStamp: new Date().toISOString(),
      UniqueIdentifier: randomUUID(),
      Source: this.opts.cfxHandle,
      ...payload,
    };
    this.outbox.push({ routingKey: messageName, envelope });
    this.flush().catch(() => undefined);
  }

  /**
   * Publish a pre-built envelope (e.g. from cfx_outbox table).
   * Used by CfxOutboxFlusher — the envelope was already constructed when the
   * message was written to the outbox inside the domain transaction.
   */
  publishRaw(routingKey: string, envelope: object): void {
    this.outbox.push({ routingKey, envelope });
    this.flush().catch(() => undefined);
  }

  private async tryConnect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.opts.amqpUrl);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      this.reconnectMs = RECONNECT_INITIAL_MS;

      this.connection.on('close', () => this.onDisconnect('closed'));
      this.connection.on('error', (err: Error) => this.onDisconnect(err.message));

      this._status = 'connected';
      await this.flush();
    } catch {
      this._status = 'reconnecting';
      this.scheduleReconnect();
    }
  }

  private onDisconnect(reason: string): void {
    console.warn(`[CFXClient] Disconnected: ${reason}. Reconnecting...`);
    this.channel = undefined;
    this.connection = undefined;
    this._status = 'reconnecting';
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    setTimeout(() => this.tryConnect().catch(() => undefined), this.reconnectMs);
    this.reconnectMs = Math.min(this.reconnectMs * 2, RECONNECT_MAX_MS);
  }

  private async flush(): Promise<void> {
    if (!this.channel) return;
    const pending = [...this.outbox];
    for (const item of pending) {
      try {
        this.channel.publish(
          EXCHANGE,
          item.routingKey,
          Buffer.from(JSON.stringify(item.envelope)),
          { persistent: true, contentType: 'application/json' },
        );
        const idx = this.outbox.indexOf(item);
        if (idx !== -1) this.outbox.splice(idx, 1);
      } catch {
        break; // Stop on first error — will retry on next flush
      }
    }
  }
}
