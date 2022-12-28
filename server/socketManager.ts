import {Server, Socket} from 'socket.io';
import {parse} from 'cookie';

export class SocketManager {
  private activeSockets: {[socketId: string]: Socket} = {};

  constructor (server: Server) {
    server.on('connection', (socket) => {
      this.activeSockets[socket.id] = socket;
    
      socket.on('disconnect', () => {
        delete this.activeSockets[socket.id];
      });
    });
  }

  sendMessageToAllSockets(eventName: string, eventData: string) {
    for (const socketId in this.activeSockets) {
      const socket = this.activeSockets[socketId];
      socket.emit(eventName, eventData);
    }
  }
};