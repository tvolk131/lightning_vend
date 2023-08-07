import {Device} from '../proto_out/lightning_vend/model';
import {DeviceName} from './proto';
import {ExecutionCommands} from './commandExecutor';

export interface DeviceServerToClientEvents {
  updateDevice: (device: Device | null) => void;
  invoicePaid: (invoice: string, deviceAck: () => void) => void;
  // Indicates that the server is ready to receive messages from the client.
  // This is necessary because the client may send messages before the server
  // is ready to receive them, since the server needs to perform some async
  // initialization (such as loading the device from the database). Should be
  // the first message sent by the server to the client, and should only be
  // sent once for the lifetime of each socket.
  socketReady: () => void;
}

export interface DeviceClientToServerEvents {
  getDevice: (callback: (device: Device | null) => void) => void;
  getDeviceSetupCode: (callback: (deviceSetupCode?: string) => void) => void;
  setDeviceExecutionCommands: (
    executionCommands: ExecutionCommands,
    callback: (success: boolean) => void
  ) => void;
  createInvoice: (
    valueSats: number,
    callback: (invoice?: string) => void
  ) => void;
}

export interface DeviceInterServerEvents {
}

export interface DeviceSocketData {
  deviceSessionId: string | undefined;
  deviceName: DeviceName | undefined;
}