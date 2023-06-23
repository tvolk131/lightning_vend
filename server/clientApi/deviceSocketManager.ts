import {
  DeviceClientToServerEvents,
  DeviceInterServerEvents,
  DeviceServerToClientEvents,
  DeviceSocketData
} from '../../shared/deviceSocketTypes';
import {EventNames, EventParams} from 'socket.io/dist/typed-events';
import {Server, Socket} from 'socket.io';
import {parse, serialize} from 'cookie';
import {Device} from '../../proto/lightning_vend/model';
import {DeviceName} from '../../shared/proto';
import {DeviceSessionManager} from '../persistence/deviceSessionManager';
import {InvoiceManager} from '../persistence/invoiceManager';
import {Request} from 'express';
import {SubscribableEventManager} from '../../client/src/api/sharedApi';
import {deviceSessionCookieName} from '..';
import {makeUuid} from '../../shared/uuid';

type DeviceSocket = Socket<DeviceClientToServerEvents,
                           DeviceServerToClientEvents,
                           DeviceInterServerEvents,
                           DeviceSocketData>;

/**
 * Manages and abstracts Socket.IO sockets, allowing messages
 * to be sent to particular devices or groups of devices.
 * Handles connections/disconnections automatically.
 */
export class DeviceSocketManager {
  private socketsByDeviceSessionId: Map<string, DeviceSocket> = new Map();
  private socketsByDeviceName: Map<string, DeviceSocket> = new Map();
  private onDeviceConnectionStatusChangeEventManager =
    new SubscribableEventManager<DeviceConnectionStatusEvent>();
  private invoiceManager: InvoiceManager;

  public constructor (
    invoiceManager: InvoiceManager,
    server: Server<DeviceClientToServerEvents,
                   DeviceServerToClientEvents,
                   DeviceInterServerEvents,
                   DeviceSocketData>,
    deviceSessionManager: DeviceSessionManager
  ) {
    this.invoiceManager = invoiceManager;

    // Initialize all incoming device sockets with a device session cookie.
    server.engine.on('initial_headers', (headers, req: Request, ...args) => {
      // console.log(headers, req, ...args);
      const cookie = req.headers.cookie ? parse(req.headers.cookie) : undefined;
      const deviceSessionId = cookie ?
        cookie[deviceSessionCookieName]
        :
        undefined;
      if (!deviceSessionId) {
        const now = new Date();
        const oneThousandYearsFromNow =
          new Date(now.getFullYear() + 1000, now.getMonth(), now.getDate());
        const newDeviceSessionId = makeUuid();
        headers['set-cookie'] = serialize(
          deviceSessionCookieName,
          newDeviceSessionId,
          {path: '/', expires: oneThousandYearsFromNow}
        );
      }
    });

    server.on('connection', (socket) => {
      // TODO - Emit an event to the socket if a `deviceSessionId` cookie is not
      // present so the device knows to restart the socket.
      const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
      const deviceName =
        deviceSessionId ?
          deviceSessionManager.getDeviceNameFromSessionId(deviceSessionId)
          :
          undefined;
      this.addSocket(socket, {deviceSessionId, deviceName});

      if (deviceName) {
        socket.emit(
          'updateDevice',
          deviceSessionManager.getDevice(deviceName) || null
        );
      } else {
        socket.emit('updateDevice', null);
      }

      socket.on('getDeviceSetupCode', (callback) => {
        const deviceSessionId = socket.data.deviceSessionId;
        if (deviceSessionId) {
          return callback(
            deviceSessionManager.createDeviceSetupCode(deviceSessionId)
          );
        } else {
          return callback(undefined);
        }
      });

      socket.on('createInvoice', (valueSats, callback) => {
        const deviceName = socket.data.deviceName;
        if (deviceName) {
          return invoiceManager.createInvoice(deviceName, valueSats)
            .then((invoice) => callback(invoice))
            .catch(() => callback(undefined));
        } else {
          return callback(undefined);
        }
      });

      socket.on('disconnect', () => {
        this.removeSocket(socket);
      });
    });
  }

  /**
   * Sends an `invoicePaid` event to the specified device.
   * @param deviceName The device to send the event to.
   * @param invoice The invoice that was successfully paid.
   * @returns Whether there is an open socket to the device.
   */
  public emitInvoicePaid(deviceName: DeviceName, invoice: string): boolean {
    return this.sendMessageToDevice(deviceName, 'invoicePaid', invoice);
  }

  /**
   * Sends an `updateDevice` event to the specified device.
   * @param deviceName The device to send the event to.
   * @param device The new device to send.
   * @returns Whether there is an open socket to the device.
   */
  public updateDevice(deviceName: DeviceName, device: Device): boolean {
    return this.sendMessageToDevice(deviceName, 'updateDevice', device);
  }

  public isDeviceConnected(deviceName: DeviceName): boolean {
    return this.socketsByDeviceName.has(deviceName.toString());
  }

  public linkDeviceSessionIdToDeviceName(
    deviceSessionId: string,
    deviceName: DeviceName
  ) {
    const socket = this.socketsByDeviceSessionId.get(deviceSessionId);
    if (socket) {
      this.socketsByDeviceName.set(deviceName.toString(), socket);
      socket.data.deviceName = deviceName;
    }
  }

  public subscribeToDeviceConnectionStatus(
    callback: (event: DeviceConnectionStatusEvent) => void
  ): string {
    return this.onDeviceConnectionStatusChangeEventManager.subscribe(callback);
  }

  public unsubscribeFromDeviceConnectionStatus(callbackId: string) {
    return this.onDeviceConnectionStatusChangeEventManager.unsubscribe(
      callbackId
    );
  }

  /**
   * Sends a Socket.IO event to the socket belonging to a particular device.
   * @param deviceName The device to send the event to.
   * @param eventName The event name.
   * @param args The event data arguments.
   * @returns Whether there is an open socket to the device.
   */
  private sendMessageToDevice<
    Ev extends EventNames<DeviceServerToClientEvents>
  >(
    deviceName: DeviceName,
    eventName: Ev,
    ...args: EventParams<DeviceServerToClientEvents, Ev>
  ): boolean {
    const socket = this.socketsByDeviceName.get(deviceName.toString());

    if (socket) {
      return socket.emit(eventName, ...args);
    }

    return false;
  }

  private addSocket(socket: DeviceSocket, socketData: DeviceSocketData) {
    socket.data = socketData;
    const {deviceSessionId, deviceName} = socket.data;

    if (deviceSessionId) {
      this.socketsByDeviceSessionId.set(deviceSessionId, socket);
    }

    if (deviceName) {
      this.socketsByDeviceName.set(deviceName.toString(), socket);
      this.onDeviceConnectionStatusChangeEventManager.emitEvent({
        deviceName,
        isOnline: true
      });
    }
  }

  private removeSocket(socket: DeviceSocket) {
    const {deviceSessionId, deviceName} = socket.data;

    if (deviceSessionId) {
      this.socketsByDeviceSessionId.delete(deviceSessionId);
    }

    if (deviceName) {
      this.socketsByDeviceName.delete(deviceName.toString());
      this.onDeviceConnectionStatusChangeEventManager.emitEvent({
        deviceName,
        isOnline: false
      });
    }
  }

  private static getDeviceSessionId(socket: DeviceSocket): string | undefined {
    const cookie = socket.handshake.headers.cookie;
    if (cookie) {
      return parse(cookie, {})[deviceSessionCookieName];
    }
  }
}

interface DeviceConnectionStatusEvent {
  deviceName: DeviceName,
  isOnline: boolean
}