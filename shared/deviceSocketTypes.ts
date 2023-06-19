import {Device} from '../proto/lightning_vend/model';
import {DeviceName} from './proto';

export interface DeviceServerToClientEvents {
  updateDevice: (device: Device | null) => void;
  invoicePaid: (invoice: string, deviceAck: () => void) => void;
}

export interface DeviceClientToServerEvents {
  getDevice: (callback: (device: Device | null) => void) => void;
  getDeviceSetupCode: (callback: (deviceSetupCode?: string) => void) => void;
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