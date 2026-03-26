import { injectable, postConstruct } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import { ICFXPublisher, CFXConnectionStatus } from '../common/cfx-types';

/** Routing key prefix for standard CFX messages */
const CFX_EXCHANGE = 'clark.cfx';
const RECONNECT_INITIAL_MS = 500;
const RECONNECT_MAX_MS = 30_000;

interface OutboxEntry {
  id: string;
  messageName: string;
  routingKey: string;
  payload: object;
}

@injectable()
export class CFXPublisher implements ICFXPublisher, BackendApplicationContribution {

  private connection: amqp.Connection | undefined;
  private channel: amqp.Channel | undefined;
  private _status: CFXConnectionStatus = 'disconnected';
  private reconnectMs = RECONNECT_INITIAL_MS;
  private flushTimer: NodeJS.Timeout | undefined;

  /** In-memory outbox — in production this would be backed by PostgreSQL cfx_outbox */
  private readonly outbox: OutboxEntry[] = [];

  private readonly statusEmitter = new Emitter<CFXConnectionStatus>();
  readonly onConnectionChange: Event<CFXConnectionStatus> = this.statusEmitter.event;

  get connectionStatus(): CFXConnectionStatus {
    return this._status;
  }

  @postConstruct()
  protected init(): void {
    // Initialization deferred to initialize() so the backend is fully booted
  }

  async initialize(): Promise<void> {
    await this.connect();
    this.startFlushLoop();
  }

  onStop(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.channel?.close().catch(() => undefined);
    this.connection?.close().catch(() => undefined);
  }

  publish(messageName: string, payload: object): void {
    const routingKey = this.buildRoutingKey(messageName);
    const entry: OutboxEntry = { id: randomUUID(), messageName, routingKey, payload };
    this.outbox.push(entry);
    // Attempt immediate flush — if broker is unavailable the entry stays in the outbox
    this.flushOutbox().catch(() => undefined);
  }

  private buildRoutingKey(messageName: string): string {
    // Standard CFX: 'CFX.WorkOrderStarted'
    // Clark extensions: 'com.clark.ipe.FirmwareProvisioned'
    return messageName.startsWith('CFX.') ? messageName : messageName;
  }

  private buildEnvelope(entry: OutboxEntry): object {
    return {
      MessageName: entry.messageName,
      Version: '2.0',
      TimeStamp: new Date().toISOString(),
      UniqueIdentifier: entry.id,
      Source: process.env.CLARK_CFX_HANDLE ?? 'clark.ipe.dev',
      ...entry.payload,
    };
  }

  private async connect(): Promise<void> {
    const url = process.env.AMQP_URL ?? 'amqp://clark:clark_dev@localhost:5672';
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(CFX_EXCHANGE, 'topic', { durable: true });
      this.setStatus('connected');
      this.reconnectMs = RECONNECT_INITIAL_MS;

      this.connection.on('close', () => this.onDisconnect('connection closed'));
      this.connection.on('error', (err) => this.onDisconnect(String(err)));
    } catch (err) {
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    }
  }

  private onDisconnect(reason: string): void {
    console.warn(`[CFXPublisher] Disconnected: ${reason}`);
    this.channel = undefined;
    this.connection = undefined;
    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    setTimeout(async () => {
      await this.connect();
    }, this.reconnectMs);
    this.reconnectMs = Math.min(this.reconnectMs * 2, RECONNECT_MAX_MS);
  }

  private startFlushLoop(): void {
    this.flushTimer = setInterval(() => {
      this.flushOutbox().catch(() => undefined);
    }, 5_000);
  }

  private async flushOutbox(): Promise<void> {
    if (!this.channel || this._status !== 'connected') return;
    const pending = [...this.outbox];
    for (const entry of pending) {
      try {
        const envelope = this.buildEnvelope(entry);
        const content = Buffer.from(JSON.stringify(envelope));
        this.channel.publish(CFX_EXCHANGE, entry.routingKey, content, {
          persistent: true,
          contentType: 'application/json',
          messageId: entry.id,
        });
        const idx = this.outbox.indexOf(entry);
        if (idx !== -1) this.outbox.splice(idx, 1);
      } catch (err) {
        console.warn(`[CFXPublisher] Failed to publish ${entry.messageName}:`, err);
        break; // Stop flushing on error — reconnect will retry
      }
    }
  }

  private setStatus(status: CFXConnectionStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.statusEmitter.fire(status);
    }
  }
}
