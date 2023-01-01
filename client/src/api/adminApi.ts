import axios from 'axios';
import {socketIoAdminPath} from '../../../shared/constants';
import {ReactSocket} from './sharedApi';

class AdminApi extends ReactSocket {
  constructor() {
    super(socketIoAdminPath);
  }

  async registerAdmin(lightningNodePubkey: string): Promise<void> {
    await axios.get(`/api/registerAdmin/${lightningNodePubkey}`);
  
    this.disconnectAndReconnectSocket();
  }
}

export const adminApi = new AdminApi();