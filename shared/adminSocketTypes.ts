import {AdminData} from '../server/persistence/adminSessionManager';
import {UserName} from './proto';

export interface AdminServerToClientEvents {
  updateAdminData: (adminData: AdminData | null) => void;
}

export interface AdminClientToServerEvents {
  getLnAuthMessage: (callback: (message: string) => void) => void;
  claimDevice: (
    deviceSetupCode: string,
    displayName: string,
    callback: (result: 'ok' | 'unauthenticatedError') => void
  ) => void;
  updateDeviceDisplayName: (
    deviceNameString: string,
    displayName: string,
    callback: (result: 'ok' | 'unauthenticatedError' | 'unknownError') => void
  ) => void;
  updateDeviceInventory: (
    deviceNameString: string,
    inventoryItemJsonArray: any[], // TODO - Find a better type for this.
    callback: (result: 'ok' | 'unauthenticatedError' | 'unknownError') => void
  ) => void;
}

export interface AdminInterServerEvents {
}

export interface AdminSocketData {
  userName: UserName | undefined;
}