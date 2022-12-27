import axios from 'axios';
import {useState, useEffect} from 'react';
import {io} from 'socket.io-client';

const socket = io();

const makeId = (length: number): string => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Generates a 20-character ID where each character is one of 62 possible characters.
// 62^20 is approximately 7*10^35 possibilities, which is safe enough that we're not
// worrying about collisions.
const makeUniqueId = () => makeId(20);

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
  const callbackId = makeUniqueId();
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
  const callbackId = makeUniqueId();
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
export const useConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(socket.connected ? 'connected' : 'disconnected');

  useEffect(() => {
    const callbackId = subscribeToConnectionStatus((connectionStatus) => {
      setConnectionStatus(connectionStatus);
    });

    return () => {
      unsubscribeFromConnectionStatus(callbackId);
    }
  });

  return connectionStatus;
};