import {AdminData} from '../server/adminSessionManager';

export interface AdminServerToClientEvents {
  updateAdminData: (adminData?: AdminData) => void;
}

export interface AdminClientToServerEvents {
}

export interface AdminInterServerEvents {
}

export interface AdminSocketData {
}