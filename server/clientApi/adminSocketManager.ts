import {
  AdminClientToServerEvents,
  AdminInterServerEvents,
  AdminServerToClientEvents,
  AdminSocketData
} from '../../shared/adminSocketTypes';
import {Device, InventoryItem} from '../../proto_out/lightning_vend/model';
import {DeviceName, UserName} from '../../shared/proto';
import {Server, Socket} from 'socket.io';
import {AdminData} from '../persistence/adminSessionManager';
import {adminSessionCookieName} from '..';
import {createSignableMessageWithTTL} from '../lnAuth';
import {parse} from 'cookie';

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
  private getUserNameFromAdminSessionId: (
    adminSessionId: string
  ) => UserName | undefined;
  private getAdminData: (userName: UserName) => AdminData | undefined;

  public constructor (
    server: Server<AdminClientToServerEvents,
                   AdminServerToClientEvents,
                   AdminInterServerEvents,
                   AdminSocketData>,
    getUserNameFromAdminSessionId: (
      adminSessionId: string
    ) => UserName | undefined,
    getAdminData: (userName: UserName) => AdminData | undefined,
    claimDevice: (
      deviceSetupCode: string,
      userName: UserName,
      deviceDisplayName: string
    ) => void,
    updateDevice: (
      deviceName: DeviceName,
      mutateFn: (device: Device) => Device
    ) => Promise<Device>
  ) {
    this.getUserNameFromAdminSessionId = getUserNameFromAdminSessionId;
    this.getAdminData = getAdminData;

    server.on('connection', (socket) => {
      const adminSessionId = AdminSocketManager.getAdminSessionId(socket);
      const userName = adminSessionId ?
        this.getUserNameFromAdminSessionId(adminSessionId)
        :
        undefined;
      this.addSocket(socket, {userName});

      socket.emit(
        'updateAdminData',
        this.getAdminDataForSocket(socket) || null
      );

      socket.on('getLnAuthMessage', (callback) => {
        // Generate an unsigned message that's valid for 5 minutes.
        callback(createSignableMessageWithTTL(60 * 5));
      });

      socket.on('claimDevice', (deviceSetupCode, displayName, callback) => {
        const adminData = this.getAdminDataForSocket(socket);
        if (adminData && userName) {
          claimDevice(deviceSetupCode, userName, displayName);
          callback('ok');
          socket.emit(
            'updateAdminData',
            this.getAdminDataForSocket(socket) || null
          );
        } else {
          callback('unauthenticatedError');
        }
      });

      socket.on(
        'updateDeviceDisplayName',
        (deviceNameString, displayName, callback) => {
          const userName = socket.data.userName;
          const deviceName = DeviceName.parse(deviceNameString);
          if (!userName || !deviceName ||
              userName.toString() !== deviceName.getUserName().toString()) {
            return callback('unauthenticatedError');
          }

          return updateDevice(deviceName, (device) => {
            device.displayName = displayName;
            return device;
          })
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

          return updateDevice(deviceName, (device) => {
            device.inventory =
              inventoryItemJsonArray.map(InventoryItem.fromJSON);
            return device;
          })
            .then(() => callback('ok'))
            .catch((err) => callback('unknownError'));
        }
      );

      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });
    });
  }

  private getAdminDataForSocket(socket: AdminSocket): AdminData | undefined {
    const adminSessionId = AdminSocketManager.getAdminSessionId(socket);
    if (adminSessionId) {
      const userName = this.getUserNameFromAdminSessionId(adminSessionId);
      if (userName) {
        return this.getAdminData(userName);
      }
    }
  }

  /**
   * Sends an `updateAdminData` event to the specified admin.
   * @param userName The admin to send the event to.
   * @param adminData The new admin data to send.
   * @returns Whether there are any open sockets to the admin.
   */
  public updateAdminData(userName: UserName): boolean {
    const sockets = this.socketsByUserName.get(userName.toString());

    // Only get admin data if a relevant admin is currently connected.
    if (sockets && sockets.length) {
      const adminData = this.getAdminData(userName);
      sockets.forEach((socket) =>
        socket.emit('updateAdminData', adminData || null));
      return true;
    }

    return false;
  }

  private addSocket(socket: AdminSocket, socketData: AdminSocketData) {
    socket.data = socketData;
    const adminSessionId = AdminSocketManager.getAdminSessionId(socket);
    let userName;
    if (adminSessionId) {
      userName = this.getUserNameFromAdminSessionId(adminSessionId);
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

  private static getAdminSessionId(socket: AdminSocket): string | undefined {
    const cookie = socket.handshake.headers.cookie;
    if (cookie) {
      return parse(cookie, {})[adminSessionCookieName];
    }
  }
}