import {Socket, io} from 'socket.io-client';
import {useEffect, useState} from 'react';
import {EventsMap} from 'socket.io/dist/typed-events';
import {makeUuid} from '../../../shared/uuid';

type ConnectionStatus = 'connected' | 'disconnected';

/**
 * A wrapper around a Socket.IO socket that provides useful React
 * hooks/functions. All created instances should be treated as static for the
 * lifetime of the React app. The underlying socket is disconnected by default.
 * See `useSocket` for details.
 */
export class ReactSocket<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap
> {
  /** The underlying socket. */
  protected socket: Socket<ListenEvents, EmitEvents>;

  /**
   * List of callbacks used to update consumers of changes to the socket's
   * connection status.
   */
  private connectionStatusCallbacks:
    Map<string, ((connectionStatus: ConnectionStatus) => void)> = new Map();

  /**
   * The number of active uses of the `useSocket` hook.
   * This class will automatically open the socket whenever
   * this variable rises above 0, and will automatically
   * close the socket whenever this variable reaches 0 again.
   */
  private useSocketCount = 0;

  public constructor(path: string) {
    this.socket = io({path, autoConnect: false});

    this.socket.on('connect', () => {
      this.connectionStatusCallbacks.forEach((callback) => {
        callback('connected');
      });
    });
    this.socket.on('disconnect', () => {
      this.connectionStatusCallbacks.forEach((callback) => {
        callback('disconnected');
      });
    });
  }

  /**
   * A React hook that returns the current connection status to the backend
   * server.
   * @returns The current connection status to the backend server.
   */
  public useConnectionStatus(): ConnectionStatus {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
      this.socket.connected ? 'connected' : 'disconnected'
    );

    useEffect(() => {
      const callbackId = this.subscribeToConnectionStatus(
        (connectionStatus) => setConnectionStatus(connectionStatus)
      );

      return () => {
        this.unsubscribeFromConnectionStatus(callbackId);
      };
    }, []);

    return connectionStatus;
  }

  /**
   * Indicates to this class that the socket should be connected.
   * The underlying socket is disconnected by default, and whatever
   * component/page relies on the socket should call this, which will
   * connect the socket and disconnect it on component dismount.
   */
  public useSocket(): void {
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
      };
    }, []);
  }

  protected disconnectAndReconnectSocket() {
    if (this.useSocketCount) {
      this.socket.close();
      this.socket.open();
    }
  }

  /**
   * Sets up an event listener that is called any time
   * the connection status to the backend server changes.
   * @param callback A function that should be called any time the connection
   * status changes.
   * @returns A callback id, which can be passed to
   * `unsubscribeFromConnectionStatus` to remove the callback.
   */
  private subscribeToConnectionStatus(
    callback: (connectionStatus: ConnectionStatus) => void
  ): string {
    const callbackId = makeUuid();
    this.connectionStatusCallbacks.set(callbackId, callback);
    return callbackId;
  }

  /**
   * Removes an event listener created from `subscribeToConnectionStatus`.
   * @param callbackId The id of the callback, returned from
   * `subscribeToConnectionStatus`.
   * @returns Whether the callback was successfully removed. True means it was
   * removed.
   */
  private unsubscribeFromConnectionStatus(callbackId: string): boolean {
    return this.connectionStatusCallbacks.delete(callbackId);
  }
}

export class SubscribableEventManager<T> {
  private callbacks: Map<string, ((event: T) => void)> = new Map();

  public subscribe(callback: (event: T) => void): string {
    const callbackId = makeUuid();
    this.callbacks.set(callbackId, callback);
    return callbackId;
  }

  public unsubscribe(callbackId: string): boolean {
    return this.callbacks.delete(callbackId);
  }

  public emitEvent(event: T) {
    this.callbacks.forEach((callback) => {
      callback(event);
    });
  }
}

export class SubscribableDataManager<T> {
  private data: T;
  private eventManager: SubscribableEventManager<T>;

  public constructor(initialDataValue: T) {
    this.data = initialDataValue;
    this.eventManager = new SubscribableEventManager();
  }

  public subscribe(callback: (data: T) => void): string {
    // This is called to make sure that the subscriber's data is in sync.
    callback(this.data);

    return this.eventManager.subscribe(callback);
  }

  public unsubscribe(callbackId: string): boolean {
    return this.eventManager.unsubscribe(callbackId);
  }

  public setData(newData: T) {
    this.data = newData;
    this.eventManager.emitEvent(this.data);
  }

  public getData(): Readonly<T> {
    return this.data;
  }
}

export type AsyncLoadableData<T> =
  {state: 'loading'} |
  {state: 'error'} |
  {state: 'loaded', data: T};