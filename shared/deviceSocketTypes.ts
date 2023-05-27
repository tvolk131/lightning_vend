import {Device} from '../proto/lightning_vend/model';

export interface DeviceServerToClientEvents {
  updateDevice: (device?: Device) => void;
  invoicePaid: (invoice: string) => void;
}

export interface DeviceClientToServerEvents {
}

export interface DeviceInterServerEvents {
}

export interface DeviceSocketData {
}