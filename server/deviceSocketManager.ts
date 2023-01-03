import {Server, Socket} from 'socket.io';
import {parse} from 'cookie';
import {deviceSessionCookieName} from '.';
import {DeviceData} from './deviceSessionManager';

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular devices or groups of devices.
 * Handles connections/disconnections automatically.
 */
export class DeviceSocketManager {
  private activeSocketsBySocketId: {[socketId: string]: Socket} = {};
  private activeSocketsByDeviceSessionId: {[deviceSessionId: string]: Socket} = {};

  constructor (server: Server, getDeviceData: (deviceSessionId: string) => DeviceData | undefined) {
    server.on('connection', (socket) => {
      this.addSocket(socket);

      const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
      if (deviceSessionId) {
        socket.emit('updateDeviceData', getDeviceData(deviceSessionId));
      } else {
        socket.emit('updateDeviceData', undefined);
      }
    
      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });
    });
  }

  /**
   * Sends an `invoicePaid` event to the specified device.
   * @param deviceSessionId The device to send the event to.
   * @param invoice The invoice that was successfully paid.
   * @returns Whether there is an open socket to the device.
   */
  emitInvoicePaid(deviceSessionId: string, invoice: string): boolean {
    return this.sendMessageToDevice(deviceSessionId, 'invoicePaid', invoice);
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

  isDeviceConnected(deviceSessionId: string): boolean {
    return !!this.activeSocketsByDeviceSessionId[deviceSessionId]
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
    const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
    if (deviceSessionId) {
      this.activeSocketsByDeviceSessionId[deviceSessionId] = socket;
    }
  }

  private removeSocket(socket: Socket) {
    delete this.activeSocketsBySocketId[socket.id];
    const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
    if (deviceSessionId) {
      delete this.activeSocketsByDeviceSessionId[deviceSessionId];
    }
  }

  private static getDeviceSessionId(socket: Socket): string | undefined {
    return parse(socket.handshake.headers.cookie || '', {})[deviceSessionCookieName];
  }
};