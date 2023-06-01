import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';
import {
  DeviceClientToServerEvents,
  DeviceServerToClientEvents
} from '../../../shared/deviceSocketTypes';
import {useEffect, useState} from 'react';
import {Device} from '../../../proto/lightning_vend/model';
import axios from 'axios';
import {makeUuid} from '../../../shared/uuid';
import {socketIoDevicePath} from '../../../shared/constants';

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

  public async registerDevice(
    lightningNodeOwnerPubkey: string,
    displayName: string,
    supportedExecutionCommands: string[]
  ): Promise<void> {
    await axios.post('/api/registerDevice', {
      lightningNodeOwnerPubkey,
      displayName,
      supportedExecutionCommands
    });
    this.disconnectAndReconnectSocket();
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

  /**
   * Fetches a Lightning Network invoice that can be subscribed to for further payment updates
   * using `subscribeToInvoicePaid`.
   * @param valueSats The value in satoshis that the invoice is for.
   * @returns A Lightning Network invoice.
   */
  public async createInvoice(valueSats: number): Promise<string> {
    return (await axios.post('/api/createInvoice', {valueSats})).data;
  }
}

export const deviceApi = new DeviceApi();