import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { CFX_STATUS_PATH, CFXConnectionStatus } from '../common/cfx-types';

const STATUS_BAR_ID = 'clark-cfx-status';

@injectable()
export class CFXStatusBarContribution implements FrontendApplicationContribution {

  @inject(StatusBar)
  protected readonly statusBar: StatusBar;

  @inject(WebSocketConnectionProvider)
  protected readonly connectionProvider: WebSocketConnectionProvider;

  private statusProxy: { getStatus(): Promise<CFXConnectionStatus> };

  @postConstruct()
  protected init(): void {
    this.statusProxy = this.connectionProvider.createProxy<{ getStatus(): Promise<CFXConnectionStatus> }>(CFX_STATUS_PATH);
  }

  onStart(): void {
    this.updateStatusBar('disconnected');
    this.pollStatus();
  }

  private pollStatus(): void {
    setInterval(async () => {
      try {
        const status = await this.statusProxy.getStatus();
        this.updateStatusBar(status);
      } catch {
        this.updateStatusBar('disconnected');
      }
    }, 5_000);
  }

  private updateStatusBar(status: CFXConnectionStatus): void {
    const icons: Record<CFXConnectionStatus, string> = {
      connected: '$(radio-tower)',
      disconnected: '$(warning)',
      reconnecting: '$(sync~spin)',
    };
    const labels: Record<CFXConnectionStatus, string> = {
      connected: 'CFX',
      disconnected: 'CFX Offline',
      reconnecting: 'CFX…',
    };
    this.statusBar.setElement(STATUS_BAR_ID, {
      text: `${icons[status]} ${labels[status]}`,
      tooltip: `IPC-CFX Broker: ${status}`,
      alignment: StatusBarAlignment.RIGHT,
      priority: 100,
    });
  }
}
