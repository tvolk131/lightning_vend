import {Device} from '../proto/lightning_vend/model';
import {DeviceName} from './proto';

export interface DeviceServerToClientEvents {
  updateDevice: (device?: Device) => void;
  invoicePaid: (invoice: string) => void;
}

export interface DeviceClientToServerEvents {
  getDeviceSetupCode: (callback: (deviceSetupCode?: string) => void) => void;
}

export interface DeviceInterServerEvents {
}

export interface DeviceSocketData {
  deviceSessionId: string | undefined;
  deviceName: DeviceName | undefined;
}