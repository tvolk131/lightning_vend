import {io} from 'socket.io-client';
import {makeUuid} from '../../../shared/uuid';
import {useState, useEffect} from 'react';

export const socket = io();

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