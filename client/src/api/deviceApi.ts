import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';
import {
  DeviceClientToServerEvents,
  DeviceServerToClientEvents
} from '../../../shared/deviceSocketTypes';
import {socketIoClientRpcTimeoutMs, socketIoDevicePath} from '../../../shared/constants';
import {useEffect, useState} from 'react';
import {Device} from '../../../proto/lightning_vend/model';
import {makeUuid} from '../../../shared/uuid';

class DeviceApi extends ReactSocket<DeviceServerToClientEvents, DeviceClientToServerEvents> {
  private invoicePaidCallbacks: Map<string, ((invoice: string) => void)> = new Map();
  private deviceDataManager =
    new SubscribableDataManager<AsyncLoadableData<Device>>({state: 'loading'});

  public constructor() {
    super(socketIoDevicePath);

    this.socket.on('updateDevice', (device) => {
      if (device) {
        this.deviceDataManager.setData({
          state: 'loaded',
          data: device
        });
      } else {
        this.deviceDataManager.setData({
          state: 'error'
        });
      }
    });

    this.socket.on('invoicePaid', (invoice) => {
      this.invoicePaidCallbacks.forEach((callback) => {
        callback(invoice);
      });
    });
  }

  /**
   * Sets up an event listener that is called any time an invoice related to this client is paid.
   * @param callback A function that should be called any time an invoice is paid.
   * @returns A callback id, which can be passed to `unsubscribeFromInvoicePaid` to remove the
   * callback.
   */
  public subscribeToInvoicePaid(callback: (invoice: string) => void): string {
    const callbackId = makeUuid();
    this.invoicePaidCallbacks.set(callbackId, callback);
    return callbackId;
  }

  /**
   * Removes an event listener created from `subscribeToInvoicePaid`.
   * @param callbackId The id of the callback, returned from `subscribeToInvoicePaid`.
   * @returns Whether the callback was successfully removed. True means it was removed.
   */
  public unsubscribeFromInvoicePaid(callbackId: string): boolean {
    return this.invoicePaidCallbacks.delete(callbackId);
  }

  public useLoadableDevice(): AsyncLoadableData<Device> {
    const [data, setData] =
      useState<AsyncLoadableData<Device>>(this.deviceDataManager.getData());

    useEffect(() => {
      const callbackId = this.deviceDataManager.subscribe(setData);
      return () => {
        this.deviceDataManager.unsubscribe(callbackId);
      };
    }, []);

    return data;
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

  /**
   * Fetches a Lightning Network invoice that can be subscribed to for further payment updates
   * using `subscribeToInvoicePaid`.
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