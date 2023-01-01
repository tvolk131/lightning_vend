import axios from 'axios';
import {useState, useEffect} from 'react';
import {DeviceData} from '../../../server/deviceSessionManager';
import {socketIoDevicePath} from '../../../shared/constants';
import {makeUuid} from '../../../shared/uuid';
import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';

class DeviceApi extends ReactSocket {
  private invoicePaidCallbacks: {[key: string]: ((invoice: string) => void)} = {};

  // TODO - Create a way to ensure that, even when updated potentially out of order, the most recent
  // received version of the device data is always set and never reverted to an older version, and to
  // acknowledge to the server that the version was successfully updated on-device. And on the server,
  // we should add a way to keep track of changes that were made on the server and whether or not they
  // have been reflected on the device. That way, an admin can make changes to a device that is offline
  // and be confident that those changes will sync and be confirmed whenever the device is reconnected.
  private deviceDataManager = new SubscribableDataManager<AsyncLoadableData<DeviceData>>({state: 'loading'});

  constructor() {
    super(socketIoDevicePath);

    this.socket.on('updateDeviceData', (deviceData: DeviceData | undefined) => {
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
      for (let callbackId in this.invoicePaidCallbacks) {
        this.invoicePaidCallbacks[callbackId](invoice);
      }
    });
  }

  /**
   * Sets up an event listener that is called any time an invoice related to this client is paid.
   * @param callback A function that should be called any time an invoice is paid.
   * @returns A callback id, which can be passed to `unsubscribeFromInvoicePaid` to remove the callback. 
   */
  subscribeToInvoicePaid(callback: (invoice: string) => void): string {
    const callbackId = makeUuid();
    this.invoicePaidCallbacks[callbackId] = callback;
    return callbackId;
  };

  /**
   * Removes an event listener created from `subscribeToInvoicePaid`.
   * @param callbackId The id of the callback, returned from `subscribeToInvoicePaid`.
   * @returns Whether the callback was successfully removed. True means it was removed.
   */
  unsubscribeFromInvoicePaid(callbackId: string): boolean {
    return delete this.invoicePaidCallbacks[callbackId];
  };

  async registerDevice(lightningNodeOwnerPubkey: string): Promise<void> {
    await axios.get(`/api/registerDevice/${lightningNodeOwnerPubkey}`);
    this.disconnectAndReconnectSocket();
  }

  useLoadableDeviceData(): AsyncLoadableData<DeviceData> {
    const [data, setData] = useState<AsyncLoadableData<DeviceData>>(this.deviceDataManager.getData());
  
    useEffect(() => {
      const callbackId = this.deviceDataManager.subscribe(setData);
      return () => {
        this.deviceDataManager.unsubscribe(callbackId);
      };
    }, []);
  
    return data;
  };

  /**
   * Fetches a Lightning Network invoice that can be subscribed to for further payment updates using `subscribeToInvoicePaid`.
   * @returns A Lightning Network invoice.
   */
  async getInvoice(): Promise<string> {
    return (await axios.get('/api/getInvoice')).data;
  }
}

export const deviceApi = new DeviceApi();