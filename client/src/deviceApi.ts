import axios from 'axios';
import {useState, useEffect} from 'react';
import {io} from 'socket.io-client';
import {DeviceData} from '../../server/deviceSessionManager';
import {makeUuid} from '../../shared/uuid';

const socket = io();

class SubscribableDataManager<T> {
  private data: T;
  private callbacks: {[key: string]: ((data: T) => void)} = {};

  constructor(initialDataValue: T) {
    this.data = initialDataValue;
  }

  subscribe(callback: (data: T) => void): string {
    const callbackId = makeUuid();
    this.callbacks[callbackId] = callback;
    return callbackId;
  }

  unsubscribe(callbackId: string): boolean {
    return delete this.callbacks[callbackId];
  };

  setData(newData: T) {
    this.data = newData;
    for (let callbackId in this.callbacks) {
      this.callbacks[callbackId](this.data);
    }
  }

  getData(): Readonly<T> {
    return this.data;
  }
}

type AsyncLoadableData<T> = {state: 'loading'} | {state: 'error'} | {state: 'loaded', data: T};

const getDeviceData = async (): Promise<DeviceData> => {
  const res = await axios.get('/api/deviceData');
  return res.data;
};
// TODO - Create a way to ensure that, even when updated potentially out of order, the most recent
// received version of the device data is always set and never reverted to an older version, and to
// acknowledge to the server that the version was successfully updated on-device. And on the server,
// we should add a way to keep track of changes that were made on the server and whether or not they
// have been reflected on the device. That way, an admin can make changes to a device that is offline
// and be confident that those changes will sync and be confirmed whenever the device is reconnected.
const deviceDataManager = new SubscribableDataManager<AsyncLoadableData<DeviceData>>({state: 'loading'});
getDeviceData()
  .then((deviceData) => {
    deviceDataManager.setData({
      state: 'loaded',
      data: deviceData
    });
  })
  .catch(() => {
    deviceDataManager.setData({
      state: 'error'
    });
  });
socket.on('updateDeviceData', (deviceData: DeviceData, callback) => {
  deviceDataManager.setData({
    state: 'loaded',
    data: deviceData
  });
  callback();
});
export const registerDevice = async (lightningNodeOwnerPubkey: string): Promise<void> => {
  const deviceData = (await axios.get(`/api/registerDevice/${lightningNodeOwnerPubkey}`)).data as DeviceData;

  socket.close();
  socket.open();

  deviceDataManager.setData({
    state: 'loaded',
    data: deviceData
  });
}
export const useLoadableDeviceData = (): AsyncLoadableData<DeviceData> => {
  const [data, setData] = useState<Readonly<AsyncLoadableData<DeviceData>>>(deviceDataManager.getData());

  useEffect(() => {
    const callbackId = deviceDataManager.subscribe(setData);
    return () => {
      deviceDataManager.unsubscribe(callbackId);
    };
  }, []);

  return data;
};

/**
 * Fetches a Lightning Network invoice that can be subscribed to for further payment updates using `subscribeToInvoicePaid`.
 * @returns A Lightning Network invoice.
 */
export const getInvoice = async (): Promise<string> => {
  return (await axios.get('/api/getInvoice')).data;
}

let invoicePaidCallbacks: {[key: string]: ((invoice: string) => void)} = {};
socket.on('invoicePaid', (invoice) => {
  for (let callbackId in invoicePaidCallbacks) {
    invoicePaidCallbacks[callbackId](invoice);
  }
});
/**
 * Sets up an event listener that is called any time an invoice related to this client is paid.
 * @param callback A function that should be called any time an invoice is paid.
 * @returns A callback id, which can be passed to `unsubscribeFromInvoicePaid` to remove the callback. 
 */
export const subscribeToInvoicePaid = (callback: (invoice: string) => void): string => {
  const callbackId = makeUuid();
  invoicePaidCallbacks[callbackId] = callback;
  return callbackId;
};
/**
 * Removes an event listener created from `subscribeToInvoicePaid`.
 * @param callbackId The id of the callback, returned from `subscribeToInvoicePaid`.
 * @returns Whether the callback was successfully removed. True means it was removed.
 */
export const unsubscribeFromInvoicePaid = (callbackId: string): boolean => {
  return delete invoicePaidCallbacks[callbackId];
};

type ConnectionStatus = 'connected' | 'disconnected';
const connectionStatusCallbacks: {[key: string]: ((connectionStatus: ConnectionStatus) => void)} = {};
socket.on('connect', (...args) => {
  for (let callbackId in connectionStatusCallbacks) {
    connectionStatusCallbacks[callbackId]('connected');
  }
});
socket.on('disconnect', (...args) => {
  for (let callbackId in connectionStatusCallbacks) {
    connectionStatusCallbacks[callbackId]('disconnected');
  }
});
/**
 * Sets up an event listener that is called any time the connection status to the backend server changes.
 * @param callback A function that should be called any time the connection status changes.
 * @returns A callback id, which can be passed to `unsubscribeFromConnectionStatus` to remove the callback. 
 */
export const subscribeToConnectionStatus = (callback: (connectionStatus: ConnectionStatus) => void) => {
  const callbackId = makeUuid();
  connectionStatusCallbacks[callbackId] = callback;
  return callbackId;
}
/**
 * Removes an event listener created from `subscribeToConnectionStatus`.
 * @param callbackId The id of the callback, returned from `subscribeToConnectionStatus`.
 * @returns Whether the callback was successfully removed. True means it was removed.
 */
export const unsubscribeFromConnectionStatus = (callbackId: string): boolean => {
  return delete connectionStatusCallbacks[callbackId];
};

/**
 * A React hook that returns the current connection status to the backend server.
 * @returns The current connection status to the backend server.
 */
export const useConnectionStatus = (): ConnectionStatus => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(socket.connected ? 'connected' : 'disconnected');

  useEffect(() => {
    const callbackId = subscribeToConnectionStatus((connectionStatus) => {
      setConnectionStatus(connectionStatus);
    });

    return () => {
      unsubscribeFromConnectionStatus(callbackId);
    }
  }, []);

  return connectionStatus;
};