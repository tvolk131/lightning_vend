import {
  AsyncLoadableData,
  ReactSocket,
  SubscribableDataManager
} from './sharedApi';
import {
  DeviceClientToServerEvents,
  DeviceServerToClientEvents
} from '../../../shared/deviceSocketTypes';
import {loadDevice, storeDevice} from './deviceLocalStorage';
import {
  socketIoClientRpcTimeoutMs,
  socketIoDevicePath
} from '../../../shared/constants';
import {useEffect, useState} from 'react';
import {Device} from '../../../proto/lightning_vend/model';
import {ExecutionCommands} from '../../../shared/commandExecutor';
import {makeUuid} from '../../../shared/uuid';

class DeviceApi extends ReactSocket<
  DeviceServerToClientEvents,
  DeviceClientToServerEvents
> {
  private invoicePaidCallbacks: Map<
    string,
    ((invoice: string) => void)
  > = new Map();
  private deviceDataManager =
    new SubscribableDataManager<AsyncLoadableData<Device | null>>({
      state: 'loading',
      cachedData: loadDevice()
    });

  public constructor() {
    super(socketIoDevicePath);

    // Any time the socket connects (or reconnects), we want to fetch the device
    // from the server. This will ensure that we always have the latest device
    // state even if it was updated while the socket was disconnected. Note that
    // this will handle updating the device in the app state and local storage.
    // TODO - The server should ack `updateDevice` messages so that the client
    // isn't responsible for fetching the device on reconnect. This will also
    // make the client more resilient to out of order updates.
    this.socket.on('connect', () => {
      this.getDevice();
    });

    this.socket.on('updateDevice', this.updateAndStoreDevice.bind(this));

    this.socket.on('invoicePaid', (invoice, deviceAck) => {
      this.invoicePaidCallbacks.forEach((callback) => {
        callback(invoice);
      });

      // Acknowledge to the server that this event
      // has been fully processed by the client.
      deviceAck();
    });
  }

  /**
   * Sets up an event listener that is called any time an invoice related to
   * this client is paid.
   * @param callback A function that should be called any time an invoice is
   * paid.
   * @returns A callback id, which can be passed to `unsubscribeFromInvoicePaid`
   * to remove the callback.
   */
  public subscribeToInvoicePaid(callback: (invoice: string) => void): string {
    const callbackId = makeUuid();
    this.invoicePaidCallbacks.set(callbackId, callback);
    return callbackId;
  }

  /**
   * Removes an event listener created from `subscribeToInvoicePaid`.
   * @param callbackId The id of the callback, returned from
   * `subscribeToInvoicePaid`.
   * @returns Whether the callback was successfully removed. True means it was
   * removed.
   */
  public unsubscribeFromInvoicePaid(callbackId: string): boolean {
    return this.invoicePaidCallbacks.delete(callbackId);
  }

  public useLoadableDevice(): AsyncLoadableData<Device | null> {
    const [data, setData] = useState<AsyncLoadableData<Device | null>>(
      this.deviceDataManager.getData()
    );

    useEffect(() => {
      const callbackId = this.deviceDataManager.subscribe(setData);
      return () => {
        this.deviceDataManager.unsubscribe(callbackId);
      };
    }, []);

    return data;
  }

  /**
   * Fetches the device from the server and updates the app state and local
   * storage.
   * @returns A promise that resolves to the device, or null if the device
   * doesn't exist.
   */
  public async getDevice(): Promise<Device | null> {
    this.deviceDataManager.setData({
      state: 'loading',
      cachedData: loadDevice()
    });

    return new Promise<Device | null>((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'getDevice',
        (err, device) => {
          if (err) {
            return reject(err);
          }

          return resolve(device);
        }
      );
    }).then<Device | null>((device) => {
      this.updateAndStoreDevice(device);
      return device;
    }).catch((err) => {
      this.updateAndStoreDevice(undefined);
      throw err;
    });
  }

  /**
   * Updates the device in the app state and local storage.
   *
   * TODO - Make this resilient to out of order updates. It's possible that this
   * will be called out of order if the device is updated twice in quick
   * succession and the second update is received before the first one. This
   * will cause the second update to then be overwritten by the first one and
   * the device will be stored in the wrong state. We should fix this by using
   * an `update_time` proto field and only storing the device if the update time
   * is newer than on the cached device.
   * @param device The device to update to. A null value means the device should
   * be deleted. An undefined value means the device failed to load, which will
   * cause the device to be kept in the current state.
   */
  private updateAndStoreDevice(device: Device | null | undefined) {
    if (device === undefined) {
      // If the device is undefined, it means we got an error from the server.
      // In this case, we want to keep and render the previously cached device
      // if it exists.
      this.deviceDataManager.setData({
        state: 'error',
        cachedData: loadDevice()
      });
    } else {
      // If the device is null, it means the server told us that the device
      // doesn't exist. In this case, `storeDevice()` will clear the cache. If
      // the device is not null, we want to update the cache. Either way, the
      // data is in a final state, so we can set the state to 'loaded'.
      storeDevice(device || undefined);

      this.deviceDataManager.setData({
        state: 'loaded',
        data: device
      });
    }
  }

  public async getDeviceSetupCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'getDeviceSetupCode',
        (err, deviceSetupCode) => {
          if (err) {
            return reject(err);
          }

          if (deviceSetupCode) {
            return resolve(deviceSetupCode);
          } else {
            return reject();
          }
        }
      );
    });
  }

  public async setDeviceExecutionCommands(
    commands: ExecutionCommands
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'setDeviceExecutionCommands',
        commands,
        (err, success) => {
          if (err) {
            return reject(err);
          }

          if (!success) {
            return reject();
          }

          return resolve();
        }
      );
    });
  }

  /**
   * Fetches a Lightning Network invoice that can be subscribed to for further
   * payment updates using `subscribeToInvoicePaid`.
   * @param valueSats The value in satoshis that the invoice is for.
   * @returns A Lightning Network invoice.
   */
  public async createInvoice(valueSats: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'createInvoice',
        valueSats,
        (err, invoice) => {
          if (err) {
            return reject(err);
          }

          if (invoice) {
            return resolve(invoice);
          } else {
            return reject();
          }
        }
      );
    });
  }
}

export const deviceApi = new DeviceApi();