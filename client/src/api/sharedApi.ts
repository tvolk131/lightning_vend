import {io, Socket} from 'socket.io-client';
import {makeUuid} from '../../../shared/uuid';
import {useState, useEffect} from 'react';

type ConnectionStatus = 'connected' | 'disconnected';

/**
 * A wrapper around a Socket.IO socket that provides useful React hooks/functions.
 * All created instances should be treated as static for the lifetime of the React app.
 * The underlying socket is disconnected by default - see `useSocket` for details.
 */
export class ReactSocket {
  /** The underlying socket. */
  protected socket: Socket;

  /** List of callbacks used to update consumers of changes to the socket's connection status. */
  private connectionStatusCallbacks: {[key: string]: ((connectionStatus: ConnectionStatus) => void)} = {};

  /**
   * The number of active uses of the `useSocket` hook.
   * This class will automatically open the socket whenever
   * this variable rises above 0, and will automatically
   * close the socket whenever this variable reaches 0 again.
   */
  private useSocketCount = 0;

  constructor(path: string) {
    this.socket = io({path, autoConnect: false});

    this.socket.on('connect', () => {
      for (let callbackId in this.connectionStatusCallbacks) {
        this.connectionStatusCallbacks[callbackId]('connected');
      }
    });
    this.socket.on('disconnect', () => {
      for (let callbackId in this.connectionStatusCallbacks) {
        this.connectionStatusCallbacks[callbackId]('disconnected');
      }
    });
  }

  /**
   * A React hook that returns the current connection status to the backend server.
   * @returns The current connection status to the backend server.
   */
  useConnectionStatus(): ConnectionStatus {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(this.socket.connected ? 'connected' : 'disconnected');

    useEffect(() => {
      const callbackId = this.subscribeToConnectionStatus((connectionStatus) => {
        setConnectionStatus(connectionStatus);
      });
  
      return () => {
        this.unsubscribeFromConnectionStatus(callbackId);
      }
    }, []);
  
    return connectionStatus;
  }

  /**
   * Indicates to this class that the socket should be connected.
   * The underlying socket is disconnected by default, and whatever
   * component/page relies on the socket should call this, which will
   * connect the socket and disconnect it on component dismount.
   */
  useSocket(): void {
    useEffect(() => {
      if (this.useSocketCount === 0) {
        this.socket.connect();
      }

      this.useSocketCount += 1;
  
      return () => {
        this.useSocketCount -= 1;
        if (this.useSocketCount === 0) {
          this.socket.disconnect();
        }
      }
    }, []);
  }

  protected disconnectAndReconnectSocket() {
    if (this.useSocketCount) {
      this.socket.close();
      this.socket.open();
    }
  }

  /**
   * Sets up an event listener that is called any time the connection status to the backend server changes.
   * @param callback A function that should be called any time the connection status changes.
   * @returns A callback id, which can be passed to `unsubscribeFromConnectionStatus` to remove the callback. 
   */
  private subscribeToConnectionStatus(callback: (connectionStatus: ConnectionStatus) => void): string {
    const callbackId = makeUuid();
    this.connectionStatusCallbacks[callbackId] = callback;
    return callbackId;
  }

  /**
   * Removes an event listener created from `subscribeToConnectionStatus`.
   * @param callbackId The id of the callback, returned from `subscribeToConnectionStatus`.
   * @returns Whether the callback was successfully removed. True means it was removed.
   */
  private unsubscribeFromConnectionStatus(callbackId: string): boolean {
    return delete this.connectionStatusCallbacks[callbackId];
  }
}

export class SubscribableDataManager<T> {
  private data: T;
  private callbacks: {[key: string]: ((data: T) => void)} = {};

  constructor(initialDataValue: T) {
    this.data = initialDataValue;
  }

  subscribe(callback: (data: T) => void): string {
    const callbackId = makeUuid();
    this.callbacks[callbackId] = callback;
    callback(this.data); // This is called just to make sure that the subscriber's data is in sync.
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

export type AsyncLoadableData<T> = {state: 'loading'} | {state: 'error'} | {state: 'loaded', data: T};