import {AdminData} from '../server/adminSessionManager';
import {UserName} from './proto';

export interface AdminServerToClientEvents {
  updateAdminData: (adminData?: AdminData) => void;
}

export interface AdminClientToServerEvents {
  claimDevice: (
    deviceSetupCode: string,
    displayName: string,
    callback: (result: 'ok' | 'unauthenticatedError') => void
  ) => void;
}

export interface AdminInterServerEvents {
}

export interface AdminSocketData {
  userName: UserName | undefined;
}