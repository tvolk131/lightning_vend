import {DeviceData, InventoryItem} from '../proto/lightning_vend/model';

// TODO - Move this somewhere that makes more sense.
export const tryCastToInventoryArray = (inventory: any): InventoryItem[] | undefined => {
  if (!Array.isArray(inventory)) {
    return undefined;
  }

  return inventory.map(InventoryItem.fromJSON);
};

/**
 * Manages the persistence of device sessions and all related device data.
 * Currently stores everything in memory, but will eventually use MongoDB to persist this data.
 * TODO - Read/write using non-volatile storage.
 */
export class DeviceSessionManager {
  private deviceSessionsBySessionId: Map<string, DeviceData> = new Map();
  private deviceSessionIdsByNodePubkey: Map<string, string[]> = new Map();

  getDeviceSessionsBelongingToNodePubkey(nodePubkey: string): DeviceData[] {
    const deviceSessionIds = this.deviceSessionIdsByNodePubkey.get(nodePubkey);

    if (deviceSessionIds === undefined) {
      return [];
    }

    const deviceDataList: DeviceData[] = [];
    deviceSessionIds.forEach((deviceSessionId) => {
      const deviceData = this.getDeviceData(deviceSessionId);
      if (deviceData) {
        deviceDataList.push(deviceData);
      }
    });
    return deviceDataList;
  }

  /**
   * Performs a find-or-create for a device, initializing basic device
   * data for a new device or fetching existing device data.
   * @param deviceSessionId The session ID of the device we're fetching.
   * @param displayName The display name for the device.
   * @param lightningNodeOwnerPubkey The Lightning Network node that owns
   * this device, and that payments to this device should pay out to.
   * If the device already exists, this field is ignored and _not_ updated
   * or validated.
   * @returns The device data, and flag indicating whether `deviceSessionId`
   * mapped to an existing device.
   */
  getOrCreateDeviceSession(
    deviceSessionId: string,
    lightningNodeOwnerPubkey: string,
    displayName: string,
    supportedExecutionCommands: string[]
  ): {deviceData: DeviceData, isNew: boolean} {
    let isNew = false;

    let deviceData = this.deviceSessionsBySessionId.get(deviceSessionId);

    if (!deviceData) {
      deviceData = {
        deviceSessionId,
        displayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      };

      this.deviceSessionsBySessionId.set(deviceSessionId, deviceData);

      let deviceIds = this.deviceSessionIdsByNodePubkey.get(lightningNodeOwnerPubkey);
      if (!deviceIds) {
        deviceIds = [];
        this.deviceSessionIdsByNodePubkey.set(lightningNodeOwnerPubkey, deviceIds);
      }
      deviceIds.push(deviceSessionId);

      isNew = true;
    }

    return {
      deviceData,
      isNew
    };
  }

  /**
   * Retrieves device data for an existing device.
   * @param deviceSessionId The session ID of the device we're fetching.
   * @returns The device data, or `undefined` if the device
   * with the given `deviceSessionId` does not exist.
   */
  getDeviceData(deviceSessionId: string): DeviceData | undefined {
    return this.deviceSessionsBySessionId.get(deviceSessionId);
  }

  /**
   * Updates the device data for a single device.
   * @param deviceSessionId The session ID of the device we're updating.
   * @param mutateFn A function that mutates the device data for a given device.
   * Whatever is returned from this function is written to storage.
   * @returns A promise that resolves to the new device data if the update was
   * successfully written, or rejects if the `deviceSessionId` is invalid or the
   * write failed for any reason.
   */
  updateDeviceData(
    deviceSessionId: string,
    mutateFn: (deviceData: DeviceData) => DeviceData
  ): Promise<DeviceData> {
    return new Promise((resolve, reject) => {
      const deviceData = this.deviceSessionsBySessionId.get(deviceSessionId);
      if (deviceData) {
        const mutatedDeviceData = mutateFn(deviceData);
        this.deviceSessionsBySessionId.set(deviceSessionId, mutatedDeviceData);
        resolve(mutatedDeviceData);
      } else {
        reject();
      }
    });
  }

  getDeviceOwnerPubkey(deviceSessionId: string): string | undefined {
    const deviceData = this.deviceSessionsBySessionId.get(deviceSessionId);
    if (deviceData) {
      return deviceData.lightningNodeOwnerPubkey;
    }
  }
}