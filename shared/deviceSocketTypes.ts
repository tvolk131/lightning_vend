import {Device, UnclaimedDevice} from '../proto_out/lightning_vend/model';
import {DeviceName, UnclaimedDeviceName} from './proto';
import {ExecutionCommands} from './commandExecutor';

export interface DeviceServerToClientEvents {
  updateDevice: (device: ClaimedOrUnclaimedDevice) => void;
  invoicePaid: (invoice: string, deviceAck: () => void) => void;
  // Indicates that the server is ready to receive messages from the client.
  // This is necessary because the client may send messages before the server
  // is ready to receive them, since the server needs to perform some async
  // initialization (such as loading the device from the database). Should be
  // the first message sent by the server to the client, and should only be
  // sent once for the lifetime of each socket.
  socketReady: () => void;
  // Indicates that no device session id was found during the socket handshake.
  // In this case, the server sets a device session id and send it back to the
  // client. Because of this, the client should just need to close and reopen
  // the socket.
  noDeviceSessionId: () => void;
}

export interface DeviceClientToServerEvents {
  getDevice: (callback: (device: ClaimedOrUnclaimedDevice) => void) => void;
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
  resourceName: ClaimedOrUnclaimedDeviceName | undefined;
}

export type ClaimedOrUnclaimedDeviceName =
  {deviceName: DeviceName} | {unclaimedDeviceName: UnclaimedDeviceName};

export type ClaimedOrUnclaimedDevice =
  {device: Device} | {unclaimedDevice: UnclaimedDevice};
