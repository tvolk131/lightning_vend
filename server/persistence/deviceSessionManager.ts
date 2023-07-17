import {DeviceName, UserName} from '../../shared/proto';
import {Device} from '../../proto_out/lightning_vend/model';
import {DeviceSetupCodeManager} from './deviceSetupCodeManager';
import {ExecutionCommands} from '../../shared/commandExecutor';

/**
 * Manages the persistence of device sessions and all related device data.
 * Currently stores everything in memory, but will eventually use MongoDB to
 * persist this data.
 * TODO - Read/write using non-volatile storage.
 */
export class DeviceSessionManager {
  private deviceSetupCodeManager: DeviceSetupCodeManager =
    new DeviceSetupCodeManager();
  private deviceSessionIdsToDeviceNames: Map<string, DeviceName> = new Map();
  private devicesByName: Map<string, Device> = new Map();
  private deviceNamesByUserName: Map<string, DeviceName[]> = new Map();

  /**
   * Creates a device setup code and links it to a device session ID.
   * @param deviceSessionId A unique identifier for the device session.
   * @returns A device setup code that can be used to claim a device.
   * Or undefined if the device session ID is already in use.
   */
  public createDeviceSetupCode(deviceSessionId: string): string | undefined {
    if (this.deviceSessionIdsToDeviceNames.has(deviceSessionId)) {
      return undefined;
    }

    return this.deviceSetupCodeManager.generateCode(deviceSessionId);
  }

  /**
   * Claims a device for a particular user.
   * @param deviceSetupCode The device setup code that was generated by
   * `createDeviceSetupCode`.
   * @param userName The user that is claiming the device.
   * @param deviceDisplayName The displayed name that the user wants to give the
   * device.
   * @returns The claimed device, or `undefined` if the device setup code is
   * invalid.
   */
  public claimDevice(
    deviceSetupCode: string,
    userName: UserName,
    deviceDisplayName: string
  ): {device: Device, deviceSessionId: string} | undefined {
    const deviceSessionId =
      this.deviceSetupCodeManager.getIdFromCode(deviceSetupCode);

    if (!deviceSessionId) {
      return undefined;
    }

    // TODO - Check that `userName` maps to existing user.

    const deviceName = DeviceName.createFromParent(userName);

    this.deviceSetupCodeManager.clearCode(deviceSetupCode);

    this.deviceSessionIdsToDeviceNames.set(deviceSessionId, deviceName);

    let deviceNames = this.deviceNamesByUserName.get(userName.toString());
    if (!deviceNames) {
      deviceNames = [];
    }
    deviceNames.push(deviceName);
    this.deviceNamesByUserName.set(userName.toString(), deviceNames);

    const device: Device = {
      name: deviceName.toString(),
      displayName: deviceDisplayName,
      createTime: new Date(),
      inventory: [],
      nullExecutionCommands: [],
      boolExecutionCommands: []
    };

    this.devicesByName.set(deviceName.toString(), device);

    return {device, deviceSessionId};
  }

  public getDeviceNameFromSessionId(
    deviceSessionId: string
  ): DeviceName | undefined {
    return this.deviceSessionIdsToDeviceNames.get(deviceSessionId);
  }

  /**
   * Retrieves a device by its name.
   * @param deviceName The name of the device we're fetching.
   * @returns The device, or undefined if the device doesn't exist.
   */
  public getDevice(deviceName: DeviceName): Device | undefined {
    return this.devicesByName.get(deviceName.toString());
  }

  /**
   * Retrieves all devices for a particular user.
   * @param userName The user whose devices we're fetching.
   * @returns All devices belonging to the user.
   */
  public getDevices(userName: UserName): Device[] {
    const deviceNames = this.deviceNamesByUserName.get(userName.toString());

    if (!deviceNames) {
      return [];
    }

    const devices: Device[] = [];
    deviceNames.forEach((deviceName) => {
      const device = this.devicesByName.get(deviceName.toString());
      if (device) {
        devices.push(device);
      }
    });
    return devices;
  }

  /**
   * Updates a device.
   * @param deviceName The name of the device we're updating.
   * @param mutateFn A function that mutates the device.
   * Whatever is returned from this function will be the new device data.
   * @returns A promise that resolves to the updated device, or rejects
   * if the device doesn't exist (or if an unknown error occurs).
   */
  public updateDevice(
    deviceName: DeviceName,
    mutateFn: (device: Device) => Device
  ): Promise<Device> {
    return new Promise((resolve, reject) => {
      const device = this.devicesByName.get(deviceName.toString());
      if (!device) {
        return reject();
      }

      const mutatedDevice = mutateFn(device);
      this.devicesByName.set(deviceName.toString(), mutatedDevice);
      return resolve(mutatedDevice);
    });
  }

  public setDeviceExecutionCommands(
    deviceName: DeviceName,
    executionCommands: ExecutionCommands
  ): Promise<void> {
    return this.updateDevice(deviceName, (device) => {
      device.nullExecutionCommands = executionCommands.nullCommands;
      device.boolExecutionCommands = executionCommands.boolCommands;
      return device;
    }).then(() => {});
  }
}
