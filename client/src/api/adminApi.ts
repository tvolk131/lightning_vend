import axios from 'axios';
import {useState, useEffect} from 'react';
import {AdminData} from '../../../server/adminSessionManager';
import {socketIoAdminPath} from '../../../shared/constants';
import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';

class AdminApi extends ReactSocket {
  private adminDataManager = new SubscribableDataManager<AsyncLoadableData<AdminData>>({state: 'loading'});

  constructor() {
    super(socketIoAdminPath);

    this.socket.on('updateAdminData', (adminData: AdminData | undefined) => {
      if (adminData) {
        this.adminDataManager.setData({
          state: 'loaded',
          data: adminData
        });
      } else {
        this.adminDataManager.setData({
          state: 'error'
        });
      }
    });
  }

  async registerAdmin(lightningNodePubkey: string): Promise<void> {
    await axios.get(`/api/registerAdmin/${lightningNodePubkey}`);
    this.disconnectAndReconnectSocket();
  }

  useLoadableAdminData(): AsyncLoadableData<AdminData> {
    const [data, setData] = useState<AsyncLoadableData<AdminData>>(this.adminDataManager.getData());
  
    useEffect(() => {
      const callbackId = this.adminDataManager.subscribe(setData);
      return () => {
        this.adminDataManager.unsubscribe(callbackId);
      };
    }, []);
  
    return data;
  };
}

export const adminApi = new AdminApi();