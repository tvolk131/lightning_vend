export interface DeviceData {
  displayName?: string,
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
  private deviceSessions: {[deviceSessionId: string]: DeviceData} = {};

  /**
   * Performs a find-or-create for a device, initializing basic device
   * data for a new device or fetching existing device data.
   * @param deviceSessionId The session ID of the device we're fetching.
   * @param lightningNodeOwnerPubkey The Lightning Network node that owns
   * this device, and that payments to this device should pay out to.
   * If the device already exists, this field is ignored and _not_ updated
   * or validated.
   * @returns The device data, and flag indicating whether `deviceSessionId`
   * mapped to an existing device.
   */
  getOrCreateDeviceSession(deviceSessionId: string, lightningNodeOwnerPubkey: string): {deviceData: DeviceData, isNew: boolean} {
    let isNew = false;

    if (!this.deviceSessions[deviceSessionId]) {
      this.deviceSessions[deviceSessionId] = {
        lightningNodeOwnerPubkey,
        inventory: []
      };
      isNew = true;
    }

    return {
      deviceData: this.deviceSessions[deviceSessionId],
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
    return this.deviceSessions[deviceSessionId];
  }

  /**
   * Updates the device data for a single device. Guaranteed to call either
   * `mutateFn` or `notFoundFn` exactly once.
   * @param deviceSessionId The session ID of the device we're updating.
   * @param mutateFn A function that mutates the device data for a given device.
   * Whatever is returned from this function is written to storage.
   * This is called if device data is found for the given `deviceSessionId`.
   * @param notFoundFn A function that is called if no device data is found
   * for the given `deviceSessionId`.
   */
  updateDeviceData(deviceSessionId: string, mutateFn: (deviceData: DeviceData) => DeviceData, notFoundFn: () => void) {
    const deviceData = this.deviceSessions[deviceSessionId];
    if (deviceData) {
      this.deviceSessions[deviceSessionId] = mutateFn(deviceData);
    } else {
      notFoundFn();
    }
  }
};