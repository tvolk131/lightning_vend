import {Device, UnclaimedDevice} from '../proto_out/lightning_vend/model';
import {DeviceName, UnclaimedDeviceName} from './proto';
import {ExecutionCommands} from './commandExecutor';

export interface DeviceServerToClientEvents {
  updateDevice: (device: EncodedClaimedOrUnclaimedDevice) => void;
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
  getDevice: (
    callback: (device: EncodedClaimedOrUnclaimedDevice) => void
  ) => void;
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

/**
 * We need to send encoded versions of Device and UnclaimedDevice over the
 * socket since they each contain Date objects, which are not supported by
 * JSON.stringify (which is used by socket.io to encode messages). See
 * https://github.com/socketio/socket.io/issues/3405.
 */
export type EncodedClaimedOrUnclaimedDevice =
  {device: Uint8Array} | {unclaimedDevice: Uint8Array};

export const encodeClaimedOrUnclaimedDevice = (
  claimedOrUnclaimedDevice: ClaimedOrUnclaimedDevice
): EncodedClaimedOrUnclaimedDevice => {
  if ('device' in claimedOrUnclaimedDevice) {
    return {device: Device.encode(claimedOrUnclaimedDevice.device).finish()};
  } else {
    return {
      unclaimedDevice: UnclaimedDevice.encode(
        claimedOrUnclaimedDevice.unclaimedDevice
      ).finish()
    };
  }
};

export const decodeClaimedOrUnclaimedDevice = (
  encodedClaimedOrUnclaimedDevice: EncodedClaimedOrUnclaimedDevice
): ClaimedOrUnclaimedDevice => {
  if ('device' in encodedClaimedOrUnclaimedDevice) {
    return {
      device: Device.decode(
        new Uint8Array(encodedClaimedOrUnclaimedDevice.device)
      )
    };
  } else {
    return {
      unclaimedDevice: UnclaimedDevice.decode(
        new Uint8Array(encodedClaimedOrUnclaimedDevice.unclaimedDevice)
      )
    };
  }
};
