import {
  AdminClientToServerEvents,
  AdminServerToClientEvents
} from '../../../shared/adminSocketTypes';
import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';
import {useEffect, useState} from 'react';
import {AdminData} from '../../../server/adminSessionManager';
import {InventoryItem} from '../../../proto/lightning_vend/model';
import axios from 'axios';
import {socketIoAdminPath} from '../../../shared/constants';

class AdminApi extends ReactSocket<AdminServerToClientEvents, AdminClientToServerEvents> {
  private adminDataManager =
    new SubscribableDataManager<AsyncLoadableData<AdminData>>({state: 'loading'});

  constructor() {
    super(socketIoAdminPath);

    this.socket.on('updateAdminData', (adminData) => {
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

  async getLnAuthMessage(): Promise<string> {
    return (await axios.get('/api/getLnAuthMessage')).data;
  }

  async registerAdmin(message: string, signature: string): Promise<void> {
    await axios.get(`/api/registerAdmin/${message}/${signature}`);
    this.disconnectAndReconnectSocket();
  }

  async updateDeviceDisplayName(deviceSessionId: string, displayName: string): Promise<void> {
    return await axios.post('/api/updateDeviceDisplayName', {
      deviceSessionId,
      displayName
    });
  }

  async updateDeviceInventory(deviceSessionId: string, inventory: InventoryItem[]): Promise<void> {
    return await axios.post('/api/updateDeviceInventory', {
      deviceSessionId,
      inventory
    });
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
  }
}

export const adminApi = new AdminApi();