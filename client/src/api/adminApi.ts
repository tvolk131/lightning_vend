import {
  AdminClientToServerEvents,
  AdminServerToClientEvents
} from '../../../shared/adminSocketTypes';
import {AsyncLoadableData, ReactSocket, SubscribableDataManager} from './sharedApi';
import {useEffect, useState} from 'react';
import {AdminData} from '../../../server/persistence/adminSessionManager';
import {DeviceName} from '../../../shared/proto';
import {InventoryItem} from '../../../proto/lightning_vend/model';
import axios from 'axios';
import {socketIoAdminPath} from '../../../shared/constants';

class AdminApi extends ReactSocket<AdminServerToClientEvents, AdminClientToServerEvents> {
  private adminDataManager =
    new SubscribableDataManager<AsyncLoadableData<AdminData>>({state: 'loading'});

  public constructor() {
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

  public async getLnAuthMessage(): Promise<string> {
    return (await axios.get('/api/getLnAuthMessage')).data;
  }

  public async registerAdmin(message: string, signature: string): Promise<void> {
    await axios.get(`/api/registerAdmin/${message}/${signature}`);
    this.disconnectAndReconnectSocket();
  }

  public async claimDevice(deviceSetupCode: string, displayName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('claimDevice', deviceSetupCode, displayName, (result) => {
        switch (result) {
          case 'ok':
            resolve();
            break;
          case 'unauthenticatedError':
            reject(new Error('unauthenticatedError'));
            break;
        }
      });
    });
  }

  public async updateDeviceDisplayName(
    deviceName: DeviceName,
    displayName: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'updateDeviceDisplayName',
        deviceName.toString(),
        displayName,
        (result) => {
          switch (result) {
            case 'ok':
              resolve();
              break;
            case 'unauthenticatedError':
              reject(new Error('unauthenticatedError'));
              break;
            case 'unknownError':
              reject(new Error('unknownError'));
              break;
          }
        }
      );
    });
  }

  public async updateDeviceInventory(
    deviceName: DeviceName,
    inventory: InventoryItem[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'updateDeviceInventory',
        deviceName.toString(),
        inventory.map(InventoryItem.toJSON),
        (result) => {
          switch (result) {
            case 'ok':
              resolve();
              break;
            case 'unauthenticatedError':
              reject(new Error('unauthenticatedError'));
              break;
            case 'unknownError':
              reject(new Error('unknownError'));
              break;
          }
        }
      );
    });
  }

  public useLoadableAdminData(): AsyncLoadableData<AdminData> {
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