export interface DeviceData {
  // TODO - Replace `deviceSessionId` with `deviceSessionIdHash` since this value should not be sent over the wire except as a cookie.
  deviceSessionId: string,
  displayName: string,
  lightningNodeOwnerPubkey: string,
  inventory: InventoryItem[]
}

export interface InventoryItem {
  name: string,
  priceSats: number
}

/**
 * Manages the persistence of device sessions and all related device data.
 * Currently stores everything in memory, but will eventually use MongoDB to persist this data.
 * TODO - Read/write using non-volatile storage.
 */
export class DeviceSessionManager {
  private deviceSessionsBySessionId: {[deviceSessionId: string]: DeviceData} = {};
  private deviceSessionIdsByNodePubkey: {[nodePubkey: string]: string[]} = {};

  getDeviceSessionsBelongingToNodePubkey(nodePubkey: string): DeviceData[] {
    const deviceSessionIds = this.deviceSessionIdsByNodePubkey[nodePubkey] || [];

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
  getOrCreateDeviceSession(deviceSessionId: string, lightningNodeOwnerPubkey: string, displayName: string): {deviceData: DeviceData, isNew: boolean} {
    let isNew = false;

    if (!this.deviceSessionsBySessionId[deviceSessionId]) {
      this.deviceSessionsBySessionId[deviceSessionId] = {
        deviceSessionId,
        displayName,
        lightningNodeOwnerPubkey,
        inventory: []
      };

      if (!this.deviceSessionIdsByNodePubkey[lightningNodeOwnerPubkey]) {
        this.deviceSessionIdsByNodePubkey[lightningNodeOwnerPubkey] = [];
      }
      this.deviceSessionIdsByNodePubkey[lightningNodeOwnerPubkey].push(deviceSessionId);

      isNew = true;
    }

    return {
      deviceData: this.deviceSessionsBySessionId[deviceSessionId],
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
    return this.deviceSessionsBySessionId[deviceSessionId];
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
  updateDeviceData(deviceSessionId: string, mutateFn: (deviceData: DeviceData) => DeviceData): Promise<DeviceData> {
    return new Promise((resolve, reject) => {
      const deviceData = this.deviceSessionsBySessionId[deviceSessionId];
      if (deviceData) {
        this.deviceSessionsBySessionId[deviceSessionId] = mutateFn(deviceData);
        resolve(deviceData);
      } else {
        reject();
      }
    });
  }

  getDeviceOwnerPubkey(deviceSessionId: string): string | undefined {
    const deviceData = this.deviceSessionsBySessionId[deviceSessionId];
    if (deviceData) {
      return deviceData.lightningNodeOwnerPubkey;
    }
  }
};