import {DeviceData} from '../proto/lightning_vend/model';

export interface DeviceServerToClientEvents {
  updateDeviceData: (deviceData?: DeviceData) => void;
  invoicePaid: (invoice: string) => void;
}

export interface DeviceClientToServerEvents {
}

export interface DeviceInterServerEvents {
}

export interface DeviceSocketData {
}