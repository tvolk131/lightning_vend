import {
  ClaimedOrUnclaimedDeviceName,
  DeviceClientToServerEvents,
  DeviceInterServerEvents,
  DeviceServerToClientEvents,
  DeviceSocketData,
  encodeClaimedOrUnclaimedDevice
} from '../../shared/deviceSocketTypes';
import {
  CreateUnclaimedDeviceRequest,
  GetDeviceByDeviceSessionIdRequest,
  GetDeviceRequest,
  GetUnclaimedDeviceByDeviceSessionIdRequest,
  UpdateDeviceRequest
} from '../../proto_out/lightning_vend/device_service';
import {Device, UnclaimedDevice} from '../../proto_out/lightning_vend/model';
import {DeviceName, UnclaimedDeviceName} from '../../shared/proto';
import {EventNames, EventParams} from 'socket.io/dist/typed-events';
import {Server, Socket} from 'socket.io';
import {parse, serialize} from 'cookie';
import {DeviceCollection} from '../persistence/deviceCollection';
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
  private socketsByResourceName: Map<string, DeviceSocket> = new Map();
  private onDeviceConnectionStatusChangeEventManager =
    new SubscribableEventManager<DeviceConnectionStatusEvent>();
  private invoiceManager: InvoiceManager;

  public constructor (
    invoiceManager: InvoiceManager,
    server: Server<DeviceClientToServerEvents,
                   DeviceServerToClientEvents,
                   DeviceInterServerEvents,
                   DeviceSocketData>,
    deviceCollection: DeviceCollection
  ) {
    this.invoiceManager = invoiceManager;

    invoiceManager.subscribeToInvoiceSettlements(({
      deviceName,
      invoicePaymentRequest
    }) => {
      // Tell the device that the invoice has been paid. If the socket
      // is not connected, no event will be emitted here. In that case,
      // the device will be notified when it connects (see the `connection`
      // event handler below).
      this.emitInvoicePaid(
        deviceName,
        invoicePaymentRequest,
        () => {
          // If the device acks the invoice, we can delete it.
          invoiceManager.ackAndDeleteSettledInvoice(invoicePaymentRequest);
        }
      );
    });

    // Initialize all incoming device sockets with a device session cookie.
    server.engine.on('initial_headers', (headers, req: Request, ...args) => {
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

    server.on('connection', async (socket) => {
      // Setup disconnection handler and record if the socket disconnects before
      // we call `addSocket`. This way, if the socket disconnects before calling
      // `addSocket`, we don't end up with a socket that never gets cleaned up.
      let hasDisconnected = false;
      socket.on('disconnect', () => {
        this.removeSocket(socket);
        hasDisconnected = true;
      });

      const deviceSessionId = DeviceSocketManager.getDeviceSessionId(socket);
      if (!deviceSessionId) {
        // The socket has no device session id, so it cannot be registered as a
        // database-backed device. Initial socket handshake sets a device
        // session id cookie if one doesn't already exist, so the socket client
        // should just need to disconnect and reconnect the socket.
        socket.emit('noDeviceSessionId');
        // There's no device session id, so we can't register bind socket to any
        // device, claimed or unclaimed. Once the socket reconnects with a
        // device session id, we'll be able to bind it to a device.
        return;
      }

      let resourceName: ClaimedOrUnclaimedDeviceName | undefined = undefined;
      try {
        const deviceName = DeviceName.parse(
          (
            await deviceCollection.GetDeviceByDeviceSessionId(
              GetDeviceByDeviceSessionIdRequest.create({
                deviceSessionId
              })
            )
          ).name
        );
        if (deviceName) {
          resourceName = {deviceName};
        }
      } catch (err) {
        // This error probably means that the device session id doesn't yet
        // exist in the database, or it maps to an unclaimed device. Either
        // way, we can leave `deviceName` as undefined.
        // TODO - Treat database read errors differently from other errors.
        // If the database is down, we don't want to treat that as a
        // non-existent device session id.
      }

      try {
        const unclaimedDeviceName = UnclaimedDeviceName.parse(
          (
            await deviceCollection.GetUnclaimedDeviceByDeviceSessionId(
              GetUnclaimedDeviceByDeviceSessionIdRequest.create({
                deviceSessionId
              })
            )
          ).name
        );
        if (unclaimedDeviceName) {
          resourceName = {unclaimedDeviceName};
        }
      } catch (err) {
        try {
          const unclaimedDevice =
            await deviceCollection.CreateUnclaimedDevice(
            CreateUnclaimedDeviceRequest.create({
                unclaimedDevice: UnclaimedDevice.create({
                  deviceSessionId
                })
              })
            );

          const unclaimedDeviceName =
            UnclaimedDeviceName.parse(unclaimedDevice.name);
          if (unclaimedDeviceName) {
            resourceName = {unclaimedDeviceName};
          }
        } catch (err) {
          // TODO - This is probably due to a database error. We can leave
          // `unclaimedDeviceName` as undefined. Let's handle this later.
        }
      }

      // The device may have disconnected while we were waiting for the
      // deviceSessionId to be retrieved from the database, so check again.
      if (!hasDisconnected) {
        this.addSocket(socket, {deviceSessionId, resourceName});
      }

      this.initiateSocketHandlers(socket, deviceCollection, invoiceManager);

      // The socket is ready to receive events. This must be called only after
      // all event handlers have been registered.
      socket.emit('socketReady');

      if (resourceName && 'deviceName' in resourceName) {
        // Send any unacked settled invoices to the device. This is necessary
        // because the device may have missed an `invoicePaid` event if it was
        // offline when an invoice was paid.
        const unackedInvoices = invoiceManager
          .getUnackedSettledInvoicesForDevice(resourceName.deviceName);
        unackedInvoices.forEach((unackedInvoice) => {
          socket.emit('invoicePaid', unackedInvoice, () => {
            invoiceManager.ackAndDeleteSettledInvoice(unackedInvoice);
          });
        });
      }
    });
  }

  /**
   * Sends an `invoicePaid` event to the specified device.
   * @param deviceName The device to send the event to.
   * @param invoice The invoice that was successfully paid.
   * @returns Whether there is an open socket to the device.
   */
  public emitInvoicePaid(
    deviceName: DeviceName,
    invoice: string,
    deviceAck: () => void
  ): boolean {
    return this.sendMessageToDevice(
      deviceName,
      'invoicePaid',
      invoice,
      deviceAck
    );
  }

  /**
   * Sends an `updateDevice` event to the specified device.
   * @param deviceName The device to send the event to.
   * @param device The new device to send.
   * @returns Whether there is an open socket to the device.
   */
  public updateDevice(deviceName: DeviceName, device: Device): boolean {
    return this.sendMessageToDevice(
      deviceName,
      'updateDevice',
      encodeClaimedOrUnclaimedDevice({device})
    );
  }

  public isDeviceConnected(deviceName: DeviceName): boolean {
    return this.socketsByResourceName.has(deviceName.toString());
  }

  public linkDeviceSessionIdToDeviceName(
    deviceSessionId: string,
    deviceName: DeviceName
  ) {
    const socket = this.socketsByDeviceSessionId.get(deviceSessionId);
    if (socket) {
      this.socketsByResourceName.set(deviceName.toString(), socket);
      socket.data.resourceName = {deviceName};
    }
  }

  public linkDeviceSessionIdToUnclaimedDeviceName(
    deviceSessionId: string,
    unclaimedDeviceName: UnclaimedDeviceName
  ) {
    const socket = this.socketsByDeviceSessionId.get(deviceSessionId);
    if (socket) {
      this.socketsByResourceName.set(unclaimedDeviceName.toString(), socket);
      socket.data.resourceName = {unclaimedDeviceName};
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
    const socket = this.socketsByResourceName.get(deviceName.toString());

    if (socket) {
      return socket.emit(eventName, ...args);
    }

    return false;
  }

  private initiateSocketHandlers(
    socket: DeviceSocket,
    deviceCollection: DeviceCollection,
    invoiceManager: InvoiceManager
  ) {
    socket.on('getDevice', async (callback) => {
      try {
        if (socket.data.resourceName &&
            'deviceName' in socket.data.resourceName) {
          const device = await deviceCollection.GetDevice(
            GetDeviceRequest.create({
              name: socket.data.resourceName.deviceName.toString()
            })
          );
          return callback(encodeClaimedOrUnclaimedDevice({device}));
        } else {
          const unclaimedDevice =
            await deviceCollection.GetUnclaimedDeviceByDeviceSessionId(
              GetUnclaimedDeviceByDeviceSessionIdRequest.create({
                deviceSessionId: socket.data.deviceSessionId
              })
            );
          return callback(encodeClaimedOrUnclaimedDevice({unclaimedDevice}));
        }
      } catch (err) {
        // TODO - Add a way to invoke the callback to indicate an error.
        // Currently the client will just never receive a response.
      }
    });

    socket.on('setDeviceExecutionCommands', (commands, callback) => {
      if (socket.data.resourceName &&
          'deviceName' in socket.data.resourceName) {
        const deviceName = socket.data.resourceName.deviceName;
        const request = UpdateDeviceRequest.create({
          device: Device.create({
            name: deviceName.toString(),
            nullExecutionCommands: commands.nullCommands,
            boolExecutionCommands: commands.boolCommands
          }),
          updateMask: ['null_execution_commands', 'bool_execution_commands']
        });

        deviceCollection.UpdateDevice(request);

        return callback(true);
      } else {
        return callback(false);
      }
    });

    socket.on('createInvoice', (valueSats, callback) => {
      if (socket.data.resourceName &&
          'deviceName' in socket.data.resourceName) {
        const deviceName = socket.data.resourceName.deviceName;
        return invoiceManager.createInvoice(deviceName, valueSats)
          .then((invoice) => callback(invoice))
          .catch(() => callback(undefined));
      } else {
        return callback(undefined);
      }
    });
  }

  private addSocket(socket: DeviceSocket, socketData: DeviceSocketData) {
    socket.data = socketData;
    const {deviceSessionId, resourceName} = socket.data;

    if (deviceSessionId) {
      this.socketsByDeviceSessionId.set(deviceSessionId, socket);
    }

    if (resourceName) {
      if ('deviceName' in resourceName) {
        const deviceName = resourceName.deviceName;

        this.socketsByResourceName.set(deviceName.toString(), socket);
        this.onDeviceConnectionStatusChangeEventManager.emitEvent({
          deviceName,
          isOnline: true
        });
      } else {
        const unclaimedDeviceName = resourceName.unclaimedDeviceName;

        this.socketsByResourceName.set(unclaimedDeviceName.toString(), socket);
      }
    }
  }

  private removeSocket(socket: DeviceSocket) {
    const {deviceSessionId, resourceName} = socket.data;

    if (deviceSessionId) {
      this.socketsByDeviceSessionId.delete(deviceSessionId);
    }

    if (resourceName) {
      if ('deviceName' in resourceName) {
        const deviceName = resourceName.deviceName;

        this.socketsByResourceName.delete(deviceName.toString());
        this.onDeviceConnectionStatusChangeEventManager.emitEvent({
          deviceName,
          isOnline: false
        });
      } else {
        const unclaimedDeviceName = resourceName.unclaimedDeviceName;

        this.socketsByResourceName.delete(unclaimedDeviceName.toString());
      }
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