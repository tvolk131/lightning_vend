import {
  AdminClientToServerEvents,
  AdminServerToClientEvents
} from '../../../shared/adminSocketTypes';
import {
  AsyncLoadableData,
  ReactSocket,
  SubscribableDataManager
} from './sharedApi';
import {
  socketIoAdminPath,
  socketIoClientRpcTimeoutMs
} from '../../../shared/constants';
import {useEffect, useState} from 'react';
import {AdminData} from '../../../server/persistence/adminSessionManager';
import {DeviceName} from '../../../shared/proto';
import {InventoryItem} from '../../../proto/lightning_vend/model';
import axios from 'axios';

class AdminApi extends ReactSocket<
  AdminServerToClientEvents,
  AdminClientToServerEvents
> {
  private adminDataManager =
    new SubscribableDataManager<
      AsyncLoadableData<AdminData>
    >({state: 'loading'});

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

  public async registerAdmin(
    message: string,
    signature: string
  ): Promise<void> {
    await axios.get(`/api/registerAdmin/${message}/${signature}`);
    this.disconnectAndReconnectSocket();
  }

  public async getLnAuthMessage(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'getLnAuthMessage',
        (err, message) => {
          if (err) {
            return reject(err);
          } else {
            resolve(message);
          }
        }
      );
    });
  }

  public async claimDevice(
    deviceSetupCode: string,
    displayName: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'claimDevice',
        deviceSetupCode,
        displayName,
        (err, result) => {
          if (err) {
            return reject(err);
          }

          switch (result) {
            case 'ok':
              resolve();
              return;
            case 'unauthenticatedError':
              reject(new Error('unauthenticatedError'));
              return;
          }
        }
      );
    });
  }

  public async updateDeviceDisplayName(
    deviceName: DeviceName,
    displayName: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'updateDeviceDisplayName',
        deviceName.toString(),
        displayName,
        (err, result) => {
          if (err) {
            return reject(err);
          }

          switch (result) {
            case 'ok':
              resolve();
              return;
            case 'unauthenticatedError':
              reject(new Error('unauthenticatedError'));
              return;
            case 'unknownError':
              reject(new Error('unknownError'));
              return;
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
      this.socket.timeout(socketIoClientRpcTimeoutMs).emit(
        'updateDeviceInventory',
        deviceName.toString(),
        inventory.map(InventoryItem.toJSON),
        (err, result) => {
          if (err) {
            return reject(err);
          }

          switch (result) {
            case 'ok':
              resolve();
              return;
            case 'unauthenticatedError':
              reject(new Error('unauthenticatedError'));
              return;
            case 'unknownError':
              reject(new Error('unknownError'));
              return;
          }
        }
      );
    });
  }

  public useLoadableAdminData(): AsyncLoadableData<AdminData> {
    const [data, setData] =
      useState<AsyncLoadableData<AdminData>>(this.adminDataManager.getData());

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