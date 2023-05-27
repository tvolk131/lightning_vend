import {Device, InventoryItem} from '../proto/lightning_vend/model';

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
  private deviceSessionsBySessionId: Map<string, Device> = new Map();
  private deviceSessionIdsByNodePubkey: Map<string, string[]> = new Map();

  getDeviceSessionsBelongingToNodePubkey(nodePubkey: string): Device[] {
    const deviceSessionIds = this.deviceSessionIdsByNodePubkey.get(nodePubkey);

    if (deviceSessionIds === undefined) {
      return [];
    }

    const devices: Device[] = [];
    deviceSessionIds.forEach((deviceSessionId) => {
      const device = this.getDevice(deviceSessionId);
      if (device) {
        devices.push(device);
      }
    });
    return devices;
  }

  /**
   * Performs a find-or-create for a device, fetching an existing
   * device or initializing one if it doesn't exist yet.
   * @param deviceSessionId The session ID of the device we're fetching.
   * @param displayName The display name for the device.
   * @param lightningNodeOwnerPubkey The Lightning Network node that owns
   * this device, and that payments to this device should pay out to.
   * If the device already exists, this field is ignored and _not_ updated
   * or validated.
   * @returns The device, and flag indicating whether it already existed.
   */
  getOrCreateDeviceSession(
    deviceSessionId: string,
    lightningNodeOwnerPubkey: string,
    displayName: string,
    supportedExecutionCommands: string[]
  ): {device: Device, isNew: boolean} {
    let isNew = false;

    let device = this.deviceSessionsBySessionId.get(deviceSessionId);

    if (!device) {
      device = {
        deviceSessionId,
        displayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      };

      this.deviceSessionsBySessionId.set(deviceSessionId, device);

      let deviceIds = this.deviceSessionIdsByNodePubkey.get(lightningNodeOwnerPubkey);
      if (!deviceIds) {
        deviceIds = [];
        this.deviceSessionIdsByNodePubkey.set(lightningNodeOwnerPubkey, deviceIds);
      }
      deviceIds.push(deviceSessionId);

      isNew = true;
    }

    return {
      device,
      isNew
    };
  }

  /**
   * Retrieves an existing device.
   * @param deviceSessionId The session ID of the device we're fetching.
   * @returns The device, or `undefined` if the device does not exist.
   */
  getDevice(deviceSessionId: string): Device | undefined {
    return this.deviceSessionsBySessionId.get(deviceSessionId);
  }

  /**
   * Updates a device.
   * @param deviceSessionId The session ID of the device we're updating.
   * @param mutateFn A function that mutates a given device.
   * Whatever is returned from this function is written to storage.
   * @returns A promise that resolves to the updated device if the update was
   * successfully written, or rejects if the `deviceSessionId` is invalid or
   * the write failed for any reason.
   */
  updateDevice(
    deviceSessionId: string,
    mutateFn: (device: Device) => Device
  ): Promise<Device> {
    return new Promise((resolve, reject) => {
      const device = this.deviceSessionsBySessionId.get(deviceSessionId);
      if (device) {
        const mutatedDevice = mutateFn(device);
        this.deviceSessionsBySessionId.set(deviceSessionId, mutatedDevice);
        resolve(mutatedDevice);
      } else {
        reject();
      }
    });
  }

  getDeviceOwnerPubkey(deviceSessionId: string): string | undefined {
    const device = this.deviceSessionsBySessionId.get(deviceSessionId);
    if (device) {
      return device.lightningNodeOwnerPubkey;
    }
  }
}