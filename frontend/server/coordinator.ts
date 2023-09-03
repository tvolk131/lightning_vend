import {
  AdminClientToServerEvents,
  AdminData,
  AdminInterServerEvents,
  AdminServerToClientEvents,
  AdminSocketData
} from '../shared/adminSocketTypes';
import {
  ClaimUnclaimedDeviceRequest,
  GetDeviceSessionIdRequest,
  ListDevicesRequest,
  UpdateDeviceRequest
} from '../proto_out/lightning_vend/device_service';
import {Device, User, User_AuthId} from '../proto_out/lightning_vend/model';
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
} from '../proto_out/lnd/lnrpc/lightning';
import {socketIoAdminPath, socketIoDevicePath} from '../shared/constants';
import {AdminSocketManager} from './clientApi/adminSocketManager';
import {Db} from 'mongodb';
import {DeviceCollection} from './persistence/deviceCollection';
import {DeviceSocketManager} from './clientApi/deviceSocketManager';
import {
  GetOrCreateUserByAuthIdRequest
} from '../proto_out/lightning_vend/user_service';
import {Server as HttpServer} from 'http';
import {InvoiceManager} from './persistence/invoiceManager';
import {Server as SocketServer} from 'socket.io';
import {UserCollection} from './persistence/userCollection';
import {UserSessionManager} from './persistence/userSessionManager';
import {userSessionJwtSecret} from './lndApi';

export class Coordinator {
  private adminSocketManager: AdminSocketManager;
  private deviceSocketManager: DeviceSocketManager;
  private userSessionManager: UserSessionManager;
  private userCollection: UserCollection;
  private deviceCollection: DeviceCollection;
  private invoiceManager: InvoiceManager;

  public static async create(
    httpServer: HttpServer,
    lightning: LightningClientImpl,
    db: Db
  ): Promise<Coordinator> {
    const userCollection = await UserCollection.create(db.collection('users'));

    const deviceCollection =
      await DeviceCollection.create(db.collection('devices'));

    return new Coordinator(
      httpServer,
      lightning,
      userCollection,
      deviceCollection
    );
  }

  private constructor(
    httpServer: HttpServer,
    lightning: LightningClientImpl,
    userCollection: UserCollection,
    deviceCollection: DeviceCollection
  ) {
    this.userSessionManager = new UserSessionManager(userSessionJwtSecret);
    this.userCollection = userCollection;
    this.deviceCollection = deviceCollection;
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
      this.userSessionManager.verifyUserSessionToken.bind(
        this.userSessionManager
      ),
      this.getAdminData.bind(this),
      this.claimDevice.bind(this),
      this.updateDevice.bind(this)
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
      this.deviceCollection
    );

    this.deviceSocketManager.subscribeToDeviceConnectionStatus((event) => {
      try {
        this.adminSocketManager.updateAdminData(event.deviceName.getUserName());
      } catch (err) {
        // TODO - Log an error here.
      }
    });

    lightning.SubscribeInvoices(InvoiceSubscription.create())
      .subscribe((invoice) => {
        if (invoice.state === InvoiceState.SETTLED && invoice.paymentRequest) {
          const deviceName =
            this.invoiceManager.getInvoiceCreator(invoice.paymentRequest);

          // If we know the device that created the invoice, save it as an
          // unacked settled invoice linked to that device. This will ensure
          // that the device is notified even if it is not connected when the
          // invoice is paid.
          if (deviceName) {
            this.invoiceManager
              .addUnackedSettledInvoice(deviceName, invoice.paymentRequest);

              // Tell the device that the invoice has been paid. If the socket
              // is not connected, no event will be emitted here. In that case,
              // the device will be notified when it connects thanks to the
              // `deviceUnackedSettledInvoiceManager`.
            this.deviceSocketManager.emitInvoicePaid(
              deviceName,
              invoice.paymentRequest,
              () => {
                // If the device acks the invoice, we can delete it.
                this.invoiceManager
                  .ackAndDeleteSettledInvoice(invoice.paymentRequest);
              }
            );
          }
        }
      });
  }

  private async updateDevice(request: UpdateDeviceRequest): Promise<Device> {
    const device = await this.deviceCollection.UpdateDevice(request);
    const deviceName = DeviceName.parse(device.name);
    if (deviceName) {
      this.deviceSocketManager.updateDevice(deviceName, device);
      await this.adminSocketManager.updateAdminData(deviceName.getUserName());
    }
    return device;
  }

  public async createUserSessionToken(
    authId: User_AuthId
  ): Promise<string | undefined> {
    const user = await this.userCollection.GetOrCreateUserByAuthId(
      GetOrCreateUserByAuthIdRequest.create({
        user: User.create({authId})
      })
    );

    const userName = UserName.parse(user.name);
    if (userName === undefined) {
      return undefined;
    }

    return this.userSessionManager.createUserSessionToken(userName);
  }

  private async claimDevice(
    deviceSetupCode: string,
    userName: UserName,
    deviceDisplayName: string
  ) {
    const claimDeviceReq = ClaimUnclaimedDeviceRequest.create({
      parent: userName.toString(),
      setupCode: deviceSetupCode,
      device: Device.create({
        displayName: deviceDisplayName
      })
    });
    const device =
      await this.deviceCollection.ClaimUnclaimedDevice(claimDeviceReq);
    const getDeviceSessionIdReq = GetDeviceSessionIdRequest.create({
      name: device.name
    });
    const getDeviceSessionIdRes =
      await this.deviceCollection.GetDeviceSessionId(getDeviceSessionIdReq);
    const deviceName = DeviceName.parse(device.name);
    if (deviceName) {
      this.deviceSocketManager.linkDeviceSessionIdToDeviceName(
        getDeviceSessionIdRes.deviceSessionId,
        deviceName
      );
      this.deviceSocketManager.updateDevice(deviceName, device);
    }
  }

  private async getAdminData(
    userName: UserName
  ): Promise<AdminData | undefined> {
    const listDevicesRequest = ListDevicesRequest.create({
      parent: userName.toString()
    });

    // TODO - Utilize pagination. Currently this is being called as if it
    // returns all devices, but it will only return the first page of devices.
    const listDevicesRes =
      await this.deviceCollection.ListDevices(listDevicesRequest);

    return {
      userName,
      deviceViews: listDevicesRes.devices.map((device) => {
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
