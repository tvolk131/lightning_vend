import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';
import {
  DeviceClientToServerEvents,
  DeviceServerToClientEvents
} from '../../../shared/deviceSocketTypes';
import {useEffect, useState} from 'react';
import {DeviceData} from '../../../proto/lightning_vend/model';
import axios from 'axios';
import {makeUuid} from '../../../shared/uuid';
import {socketIoDevicePath} from '../../../shared/constants';

class DeviceApi extends ReactSocket<DeviceServerToClientEvents, DeviceClientToServerEvents> {
  private invoicePaidCallbacks: Map<string, ((invoice: string) => void)> = new Map();
  private deviceDataManager =
    new SubscribableDataManager<AsyncLoadableData<DeviceData>>({state: 'loading'});

  constructor() {
    super(socketIoDevicePath);

    this.socket.on('updateDeviceData', (deviceData) => {
      if (deviceData) {
        this.deviceDataManager.setData({
          state: 'loaded',
          data: deviceData
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
  subscribeToInvoicePaid(callback: (invoice: string) => void): string {
    const callbackId = makeUuid();
    this.invoicePaidCallbacks.set(callbackId, callback);
    return callbackId;
  }

  /**
   * Removes an event listener created from `subscribeToInvoicePaid`.
   * @param callbackId The id of the callback, returned from `subscribeToInvoicePaid`.
   * @returns Whether the callback was successfully removed. True means it was removed.
   */
  unsubscribeFromInvoicePaid(callbackId: string): boolean {
    return this.invoicePaidCallbacks.delete(callbackId);
  }

  async registerDevice(
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

  useLoadableDeviceData(): AsyncLoadableData<DeviceData> {
    const [data, setData] =
      useState<AsyncLoadableData<DeviceData>>(this.deviceDataManager.getData());

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
  async createInvoice(valueSats: number): Promise<string> {
    return (await axios.post('/api/createInvoice', {valueSats})).data;
  }
}

export const deviceApi = new DeviceApi();