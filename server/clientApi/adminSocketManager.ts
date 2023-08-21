import {
  AdminClientToServerEvents,
  AdminData,
  AdminInterServerEvents,
  AdminServerToClientEvents,
  AdminSocketData
} from '../../shared/adminSocketTypes';
import {Device, InventoryItem} from '../../proto_out/lightning_vend/model';
import {DeviceName, UserName} from '../../shared/proto';
import {Server, Socket} from 'socket.io';
import {
  UpdateDeviceRequest
} from '../../proto_out/lightning_vend/device_service';
import {createSignableMessageWithTTL} from '../lnAuth';
import {parse} from 'cookie';
import {userSessionCookieName} from '..';

type AdminSocket = Socket<AdminClientToServerEvents,
                          AdminServerToClientEvents,
                          AdminInterServerEvents,
                          AdminSocketData>;

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular users.
 * Handles connections/disconnections automatically.
 */
export class AdminSocketManager {
  private socketsBySocketId: Map<
    string, {socket: AdminSocket, userName: UserName | undefined}
  > = new Map();
  private socketsByUserName: Map<string, AdminSocket[]> = new Map();
  private getUserNameFromUserSessionToken: (
    userSessionToken: string
  ) => UserName | undefined;
  private getAdminData: (userName: UserName) => Promise<AdminData | undefined>;

  public constructor (
    server: Server<AdminClientToServerEvents,
                   AdminServerToClientEvents,
                   AdminInterServerEvents,
                   AdminSocketData>,
    getUserNameFromUserSessionToken: (
      userSessionToken: string
    ) => UserName | undefined,
    getAdminData: (userName: UserName) => Promise<AdminData | undefined>,
    claimDevice: (
      deviceSetupCode: string,
      userName: UserName,
      deviceDisplayName: string
    ) => Promise<void>,
    updateDevice: (request: UpdateDeviceRequest) => Promise<Device>
  ) {
    this.getUserNameFromUserSessionToken = getUserNameFromUserSessionToken;
    this.getAdminData = getAdminData;

    server.on('connection', async (socket) => {
      const userSessionToken = AdminSocketManager.getUserSessionToken(socket);
      const userName = userSessionToken ?
        this.getUserNameFromUserSessionToken(userSessionToken)
        :
        undefined;
      this.addSocket(socket, {userName});

      socket.on('getLnAuthMessage', (callback) => {
        // Generate an unsigned message that's valid for 5 minutes.
        callback(createSignableMessageWithTTL(60 * 5));
      });

      socket.on(
        'claimDevice',
        async (deviceSetupCode, displayName, callback) => {
          const adminData = await this.getAdminDataForSocket(socket);
          if (adminData && userName) {
            // TODO - `claimDevice` can throw an error, but we don't handle it
            // here yet. Let's do a try/catch and send an error back to the
            // client.
            await claimDevice(deviceSetupCode, userName, displayName);
            callback('ok');
            socket.emit(
              'updateAdminData',
              await this.getAdminDataForSocket(socket) || null
            );
          } else {
            callback('unauthenticatedError');
          }
        }
      );

      socket.on(
        'updateDeviceDisplayName',
        (deviceNameString, displayName, callback) => {
          const userName = socket.data.userName;
          const deviceName = DeviceName.parse(deviceNameString);
          if (!userName || !deviceName ||
              userName.toString() !== deviceName.getUserName().toString()) {
            return callback('unauthenticatedError');
          }

          const updateDeviceRequest = UpdateDeviceRequest.create({
            device: Device.create({
              name: deviceName.toString(),
              displayName
            }),
            updateMask: ['display_name']
          });

          return updateDevice(updateDeviceRequest)
            .then(() => callback('ok'))
            .catch((err) => callback('unknownError'));
        }
      );

      socket.on(
        'updateDeviceInventory',
        (deviceNameString, inventoryItemJsonArray, callback) => {
          const userName = socket.data.userName;
          const deviceName = DeviceName.parse(deviceNameString);
          if (!userName || !deviceName ||
              userName.toString() !== deviceName.getUserName().toString()) {
            return callback('unauthenticatedError');
          }

          const updateDeviceRequest = UpdateDeviceRequest.create({
            device: Device.create({
              name: deviceName.toString(),
              inventory: inventoryItemJsonArray.map(InventoryItem.fromJSON)
            }),
            updateMask: ['inventory']
          });

          return updateDevice(updateDeviceRequest)
            .then(() => callback('ok'))
            .catch((err) => callback('unknownError'));
        }
      );

      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });

      socket.emit(
        'updateAdminData',
        await this.getAdminDataForSocket(socket) || null
      );
    });
  }

  private async getAdminDataForSocket(
    socket: AdminSocket
  ): Promise<AdminData | undefined> {
    const userSessionToken = AdminSocketManager.getUserSessionToken(socket);
    if (userSessionToken) {
      const userName = this.getUserNameFromUserSessionToken(userSessionToken);
      if (userName) {
        return await this.getAdminData(userName);
      }
    }
  }

  /**
   * Sends an `updateAdminData` event to the specified admin.
   * @param userName The admin to send the event to.
   * @param adminData The new admin data to send.
   * @returns Whether there are any open sockets to the admin.
   */
  public async updateAdminData(userName: UserName): Promise<boolean> {
    const sockets = this.socketsByUserName.get(userName.toString());

    // Only get admin data if a relevant admin is currently connected.
    if (sockets && sockets.length) {
      const adminData = await this.getAdminData(userName);
      sockets.forEach((socket) =>
        socket.emit('updateAdminData', adminData || null));
      return true;
    }

    return false;
  }

  private addSocket(socket: AdminSocket, socketData: AdminSocketData) {
    socket.data = socketData;
    const userSessionToken = AdminSocketManager.getUserSessionToken(socket);
    let userName;
    if (userSessionToken) {
      userName = this.getUserNameFromUserSessionToken(userSessionToken);
    }

    this.socketsBySocketId.set(socket.id, {socket, userName});

    if (userName) {
      let sockets = this.socketsByUserName.get(userName.toString());
      if (!sockets) {
        sockets = [];
        this.socketsByUserName.set(userName.toString(), sockets);
      }
      sockets.push(socket);
    }
  }

  private removeSocket(socket: AdminSocket) {
    const {userName} = this.socketsBySocketId.get(socket.id) || {};
    this.socketsBySocketId.delete(socket.id);

    if (userName) {
      let sockets = this.socketsByUserName.get(userName.toString());
      if (sockets) {
        sockets = sockets.filter((s) => s !== socket);
        if (sockets.length) {
          this.socketsByUserName.set(userName.toString(), sockets);
        } else {
          this.socketsByUserName.delete(userName.toString());
        }
      }
    }
  }

  private static getUserSessionToken(socket: AdminSocket): string | undefined {
    const cookie = socket.handshake.headers.cookie;
    if (cookie) {
      return parse(cookie, {})[userSessionCookieName];
    }
  }
}