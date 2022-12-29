import {Server, Socket} from 'socket.io';
import {parse} from 'cookie';
import {deviceSessionCookieName} from '.';
import {DeviceData} from './deviceSessionManager';

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular devices or groups of devices.
 * Handles connections/disconnections automatically.
 */
export class SocketManager {
  private activeSocketsBySocketId: {[socketId: string]: Socket} = {};
  private activeSocketsByDeviceSessionId: {[deviceSessionId: string]: Socket} = {};

  constructor (server: Server) {
    server.on('connection', (socket) => {
      this.addSocket(socket);
    
      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });
    });
  }

  /**
   * Sends a Socket.IO event to all active sockets.
   * @param eventName The event name.
   * @param eventData The event data.
   */
  sendMessageToAllSockets(eventName: string, eventData: string) {
    for (const socketId in this.activeSocketsBySocketId) {
      const socket = this.activeSocketsBySocketId[socketId];
      socket.emit(eventName, eventData);
    }
  }

  /**
   * Sends an `updateDeviceData` event to the specified device.
   * @param deviceSessionId The device to send the event to.
   * @param deviceData The new device data to send.
   * @returns Whether there is an open socket to the device.
   */
  updateDeviceData(deviceSessionId: string, deviceData: DeviceData): boolean {
    return this.sendMessageToDevice(deviceSessionId, 'updateDeviceData', deviceData);
  }

  /**
   * Sends a Socket.IO event to the socket belonging to a particular device.
   * @param deviceSessionId The device to send the event to.
   * @param eventName The event name.
   * @param eventData The event data.
   * @returns Whether there is an open socket to the device.
   */
  private sendMessageToDevice(deviceSessionId: string, eventName: string, eventData: any): boolean {
    const socket = this.activeSocketsByDeviceSessionId[deviceSessionId];

    if (socket) {
      return socket.emit(eventName, eventData);
    }

    return false;
  }

  private addSocket(socket: Socket) {
    this.activeSocketsBySocketId[socket.id] = socket;
    const deviceSessionId = SocketManager.getDeviceSessionId(socket);
    if (deviceSessionId) {
      this.activeSocketsByDeviceSessionId[deviceSessionId] = socket;
    }
  }

  private removeSocket(socket: Socket) {
    delete this.activeSocketsBySocketId[socket.id];
    const deviceSessionId = SocketManager.getDeviceSessionId(socket);
    if (deviceSessionId) {
      delete this.activeSocketsByDeviceSessionId[deviceSessionId];
    }
  }

  private static getDeviceSessionId(socket: Socket): string | undefined {
    return parse(socket.handshake.headers.cookie || '', {})[deviceSessionCookieName];
  }
};