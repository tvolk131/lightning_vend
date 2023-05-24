import {Server, Socket} from 'socket.io';
import {AdminData} from './adminSessionManager';
import {adminSessionCookieName} from '.';
import {parse} from 'cookie';

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular users.
 * Handles connections/disconnections automatically.
 */
export class AdminSocketManager {
  private nodePubkeysBySocketId: Map<string, string> = new Map();
  private socketsByNodePubkey: Map<string, Socket[]> = new Map();
  private getNodePubkeyFromAdminSessionId:
    (adminSessionId: string) => string | undefined;
  private getAdminData: (lightningNodePubkey: string) => AdminData | undefined;

  constructor (
    server: Server,
    getNodePubkeyFromAdminSessionId: (adminSessionId: string) => string | undefined,
    getAdminData: (lightningNodePubkey: string) => AdminData | undefined
  ) {
    this.getNodePubkeyFromAdminSessionId = getNodePubkeyFromAdminSessionId;
    this.getAdminData = getAdminData;

    server.on('connection', (socket) => {
      this.addSocket(socket);

      socket.emit('updateAdminData', this.getAdminDataForSocket(socket));

      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });
    });
  }

  private getAdminDataForSocket(socket: Socket): AdminData | undefined {
    const adminSessionId = AdminSocketManager.getAdminSessionId(socket);
    if (adminSessionId) {
      const lightningNodePubkey = this.getNodePubkeyFromAdminSessionId(adminSessionId);
      if (lightningNodePubkey) {
        return this.getAdminData(lightningNodePubkey);
      }
    }
  }

  /**
   * Sends an `updateAdminData` event to the specified admin.
   * @param nodePubkey The node pubkey user to send the event to.
   * @param adminData The new admin data to send.
   * @returns Whether there are any open sockets to the admin.
   */
  updateAdminData(nodePubkey: string): boolean {
    const sockets = this.socketsByNodePubkey.get(nodePubkey);

    // Only get admin data if a relevant admin is currently connected.
    if (sockets && sockets.length) {
      const adminData = this.getAdminData(nodePubkey);
      sockets.forEach((socket) => socket.emit('updateAdminData', adminData));
      return true;
    }

    return false;
  }

  private addSocket(socket: Socket) {
    const adminSessionId = AdminSocketManager.getAdminSessionId(socket);
    let nodePubkey;
    if (adminSessionId) {
      nodePubkey = this.getNodePubkeyFromAdminSessionId(adminSessionId);
    }

    if (nodePubkey) {
      this.nodePubkeysBySocketId.set(socket.id, nodePubkey);
    }

    if (nodePubkey) {
      let sockets = this.socketsByNodePubkey.get(nodePubkey);
      if (!sockets) {
        sockets = [];
        this.socketsByNodePubkey.set(nodePubkey, sockets);
      }
      sockets.push(socket);
    }
  }

  private removeSocket(socket: Socket) {
    const nodePubkey = this.nodePubkeysBySocketId.get(socket.id);
    this.nodePubkeysBySocketId.delete(socket.id);

    if (nodePubkey) {
      let sockets = this.socketsByNodePubkey.get(nodePubkey);
      if (sockets) {
        sockets = sockets.filter((s) => s !== socket);
        if (sockets.length) {
          this.socketsByNodePubkey.set(nodePubkey, sockets);
        } else {
          this.socketsByNodePubkey.delete(nodePubkey);
        }
      }
    }
  }

  private static getAdminSessionId(socket: Socket): string | undefined {
    return parse(socket.handshake.headers.cookie || '', {})[adminSessionCookieName];
  }
}