import {Server, Socket} from 'socket.io';
import {parse} from 'cookie';
import {adminSessionCookieName} from '.';

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular users.
 * Handles connections/disconnections automatically.
 */
export class AdminSocketManager {
  private activeSocketsBySocketId: {[socketId: string]: {socket: Socket, nodePubkey: string | undefined}} = {};
  private activeSocketsByNodePubkey: {[nodePubkey: string]: Socket[]} = {};
  private getNodePubkeyFromAdminSessionId: (adminSessionId: string) => string | undefined;

  constructor (server: Server, getNodePubkeyFromAdminSessionId: (adminSessionId: string) => string | undefined) {
    this.getNodePubkeyFromAdminSessionId = getNodePubkeyFromAdminSessionId;

    server.on('connection', (socket) => {
      this.addSocket(socket);
    
      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });
    });
  }

  private addSocket(socket: Socket) {
    const adminSessionId = AdminSocketManager.getAdminSessionId(socket);
    let nodePubkey;
    if (adminSessionId) {
      nodePubkey = this.getNodePubkeyFromAdminSessionId(adminSessionId);
    }

    this.activeSocketsBySocketId[socket.id] = {socket, nodePubkey};

    if (nodePubkey) {
      if (this.activeSocketsByNodePubkey[nodePubkey] === undefined) {
        this.activeSocketsByNodePubkey[nodePubkey] = [];
      }

      this.activeSocketsByNodePubkey[nodePubkey].push(socket);
    }
  }

  private removeSocket(socket: Socket) {
    const {nodePubkey} = this.activeSocketsBySocketId[socket.id];
    delete this.activeSocketsBySocketId[socket.id];

    if (nodePubkey) {
      this.activeSocketsByNodePubkey[nodePubkey] = this.activeSocketsByNodePubkey[nodePubkey].filter((s) => s !== socket);

      if (this.activeSocketsByNodePubkey[nodePubkey].length === 0) {
        delete this.activeSocketsByNodePubkey[nodePubkey];
      }
    }
  }

  private static getAdminSessionId(socket: Socket): string | undefined {
    return parse(socket.handshake.headers.cookie || '', {})[adminSessionCookieName];
  }
};