import {
  AdminClientToServerEvents,
  AdminInterServerEvents,
  AdminServerToClientEvents,
  AdminSocketData
} from '../shared/adminSocketTypes';
import {AdminData, AdminSessionManager} from './persistence/adminSessionManager';
import {
  DeviceClientToServerEvents,
  DeviceInterServerEvents,
  DeviceServerToClientEvents,
  DeviceSocketData
} from '../shared/deviceSocketTypes';
import {DeviceName, UserName} from '../shared/proto';
import {
  Invoice_InvoiceState as InvoiceState,
  InvoiceSubscription,
  LightningClientImpl
} from '../proto/lnd/lnrpc/lightning';
import {socketIoAdminPath, socketIoDevicePath} from '../shared/constants';
import {AdminSocketManager} from './clientApi/adminSocketManager';
import {Device} from '../proto/lightning_vend/model';
import {DeviceSessionManager} from './persistence/deviceSessionManager';
import {DeviceSocketManager} from './clientApi/deviceSocketManager';
import {Server as HttpServer} from 'http';
import {InvoiceManager} from './persistence/invoiceManager';
import {Server as SocketServer} from 'socket.io';

export class Coordinator {
  private adminSocketManager: AdminSocketManager;
  private deviceSocketManager: DeviceSocketManager;
  private adminSessionManager: AdminSessionManager;
  private deviceSessionManager: DeviceSessionManager;
  private invoiceManager: InvoiceManager;

  public constructor(httpServer: HttpServer, lightning: LightningClientImpl) {
    this.adminSessionManager = new AdminSessionManager();
    this.deviceSessionManager = new DeviceSessionManager();
    this.invoiceManager = new InvoiceManager(lightning);

    this.adminSocketManager = new AdminSocketManager(
      new SocketServer<AdminClientToServerEvents,
                 AdminServerToClientEvents,
                 AdminInterServerEvents,
                 AdminSocketData>(httpServer, {
        path: socketIoAdminPath,
        pingInterval: 5000,
        pingTimeout: 4000
      }),
      this.adminSessionManager.getUserNameFromAdminSessionId.bind(this.adminSessionManager),
      this.getAdminData.bind(this),
      this.claimDevice.bind(this)
    );
    this.deviceSocketManager = new DeviceSocketManager(
      this.invoiceManager,
      new SocketServer<DeviceClientToServerEvents,
                 DeviceServerToClientEvents,
                 DeviceInterServerEvents,
                 DeviceSocketData>(httpServer, {
        path: socketIoDevicePath,
        pingInterval: 5000,
        pingTimeout: 4000
      }),
      this.deviceSessionManager
    );

    this.deviceSocketManager.subscribeToDeviceConnectionStatus((event) => {
      this.adminSocketManager.updateAdminData(event.deviceName.getUserName());
    });

    lightning.SubscribeInvoices(InvoiceSubscription.create())
      .subscribe((invoice) => {
        if (invoice.state === InvoiceState.SETTLED && invoice.paymentRequest) {
          const deviceName = this.invoiceManager.getInvoiceCreator(invoice.paymentRequest);
          if (deviceName) {
            // TODO - Check if this message was sent (i.e. if the device is online) and
            // save the event to retry later if the device is currently offline.
            this.deviceSocketManager.emitInvoicePaid(deviceName, invoice.paymentRequest);
          }
        }
      });
  }

  public getUserNameFromAdminSessionId(adminSessionId: string): UserName | undefined {
    return this.adminSessionManager.getUserNameFromAdminSessionId(adminSessionId);
  }

  public async updateDevice(
    deviceName: DeviceName,
    mutateFn: (device: Device) => Device
  ): Promise<Device> {
    return await this.deviceSessionManager.updateDevice(deviceName, mutateFn).then((device) => {
      this.deviceSocketManager.updateDevice(deviceName, device);
      this.adminSocketManager.updateAdminData(deviceName.getUserName());
      return device;
    });
  }

  public getOrCreateAdminSession(adminSessionId: string, lightningNodePubkey: string) {
    return this.adminSessionManager.getOrCreateAdminSession(adminSessionId, lightningNodePubkey);
  }

  private claimDevice(deviceSetupCode: string, userName: UserName, deviceDisplayName: string) {
    const claimDeviceRes =
      this.deviceSessionManager.claimDevice(deviceSetupCode, userName, deviceDisplayName);
    if (claimDeviceRes) {
      const {device, deviceSessionId} = claimDeviceRes;
      const deviceName = DeviceName.parse(device.name);
      if (deviceName) {
        this.deviceSocketManager.linkDeviceSessionIdToDeviceName(deviceSessionId, deviceName);
        this.deviceSocketManager.updateDevice(deviceName, device);
      }
    }
  }

  private getAdminData(userName: UserName): AdminData | undefined {
    return {
      userName,
      deviceViews: this.deviceSessionManager
        .getDevices(userName)
        .map((device) => {
          const deviceName = DeviceName.parse(device.name);
          return {
            isOnline: deviceName ?
              this.deviceSocketManager.isDeviceConnected(deviceName)
              :
              false,
            device
          };
        })
    };
  }
}
