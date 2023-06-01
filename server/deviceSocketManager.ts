import {
  DeviceClientToServerEvents,
  DeviceInterServerEvents,
  DeviceServerToClientEvents,
  DeviceSocketData
} from '../shared/deviceSocketTypes';
import {Server, Socket} from 'socket.io';
import {Device} from '../proto/lightning_vend/model';
import {EventNames} from 'socket.io/dist/typed-events';
import {SubscribableEventManager} from '../client/src/api/sharedApi';
import {deviceSessionCookieName} from '.';
import {parse} from 'cookie';

type DeviceSocket = Socket<DeviceClientToServerEvents, DeviceServerToClientEvents>;

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular devices or groups of devices.
 * Handles connections/disconnections automatically.
 */
export class DeviceSocketManager {
  private socketsByDeviceSessionId: Map<string, DeviceSocket> = new Map();
  private onDeviceConnectionStatusChangeEventManager =
    new SubscribableEventManager<DeviceConnectionStatusEvent>();

  public constructor (
    server: Server<DeviceClientToServerEvents,
                   DeviceServerToClientEvents,
                   DeviceInterServerEvents,
                   DeviceSocketData>,
    getDevice: (deviceSessionId: string) => Device | undefined
  ) {
    server.on('connection', (socket) => {
      this.addSocket(socket);

      const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
      if (deviceSessionId) {
        socket.emit('updateDevice', getDevice(deviceSessionId));
      } else {
        socket.emit('updateDevice', undefined);
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
  public emitInvoicePaid(deviceSessionId: string, invoice: string): boolean {
    return this.sendMessageToDevice(deviceSessionId, 'invoicePaid', invoice);
  }

  /**
   * Sends an `updateDevice` event to the specified device.
   * @param deviceSessionId The device to send the event to.
   * @param device The new device to send.
   * @returns Whether there is an open socket to the device.
   */
  public updateDevice(deviceSessionId: string, device: Device): boolean {
    return this.sendMessageToDevice(deviceSessionId, 'updateDevice', device);
  }

  public isDeviceConnected(deviceSessionId: string): boolean {
    return this.socketsByDeviceSessionId.has(deviceSessionId);
  }

  public subscribeToDeviceConnectionStatus(
    callback: (event: DeviceConnectionStatusEvent) => void
  ): string {
    return this.onDeviceConnectionStatusChangeEventManager.subscribe(callback);
  }

  public unsubscribeFromDeviceConnectionStatus(callbackId: string) {
    return this.onDeviceConnectionStatusChangeEventManager.unsubscribe(callbackId);
  }

  /**
   * Sends a Socket.IO event to the socket belonging to a particular device.
   * @param deviceSessionId The device to send the event to.
   * @param eventName The event name.
   * @param eventData The event data.
   * @returns Whether there is an open socket to the device.
   */
  private sendMessageToDevice(
    deviceSessionId: string,
    eventName: EventNames<DeviceServerToClientEvents>,
    eventData: any
  ): boolean {
    const socket = this.socketsByDeviceSessionId.get(deviceSessionId);

    if (socket) {
      return socket.emit(eventName, eventData);
    }

    return false;
  }

  private addSocket(socket: DeviceSocket) {
    const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
    if (deviceSessionId) {
      this.socketsByDeviceSessionId.set(deviceSessionId, socket);
      this.onDeviceConnectionStatusChangeEventManager.emitEvent({
        deviceSessionId,
        isOnline: true
      });
    }
  }

  private removeSocket(socket: DeviceSocket) {
    const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
    if (deviceSessionId) {
      this.socketsByDeviceSessionId.delete(deviceSessionId);
      this.onDeviceConnectionStatusChangeEventManager.emitEvent({
        deviceSessionId,
        isOnline: false
      });
    }
  }

  private static getDeviceSessionId(socket: DeviceSocket): string | undefined {
    return parse(socket.handshake.headers.cookie || '', {})[deviceSessionCookieName];
  }
}

interface DeviceConnectionStatusEvent {
  deviceSessionId: string,
  isOnline: boolean
}