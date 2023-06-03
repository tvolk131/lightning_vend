import {DeviceName, UserName} from '../../shared/proto';
import {DeviceSessionManager} from './deviceSessionManager';

describe('DeviceSessionManager', () => {
  let deviceSessionManager: DeviceSessionManager;

  beforeEach(() => {
    deviceSessionManager = new DeviceSessionManager();
  });

  describe('createDeviceSetupCode', () => {
    it('should create a device setup code', () => {
      const deviceSessionId = 'session-id';
      const code = deviceSessionManager.createDeviceSetupCode(deviceSessionId);
      expect(code).toBeDefined();
    });

    it('should overwrite previous setup code if the device session ID is already in use', () => {
      const deviceSessionId = 'session-id';
      const initialSetupCode = deviceSessionManager.createDeviceSetupCode(deviceSessionId);
      const newSetupCode = deviceSessionManager.createDeviceSetupCode(deviceSessionId);
      expect(initialSetupCode).toBeDefined();
      expect(newSetupCode).toBeDefined();
      expect(initialSetupCode).not.toEqual(newSetupCode);
      const userName = UserName.create();
      // Initial setup code should not work because it has been replaced.
      let result = deviceSessionManager.claimDevice(initialSetupCode!, userName, 'Device 1');
      expect(result).toBeUndefined();
      // New setup code should work.
      result = deviceSessionManager.claimDevice(newSetupCode!, userName, 'Device 1');
      expect(result).toBeDefined();
    });
  });

  describe('claimDevice', () => {
    const deviceSessionId = 'session-id';
    const userName = UserName.create();
    const deviceDisplayName = 'Device 1';

    it('should claim a device for a particular user', () => {
      const code = deviceSessionManager.createDeviceSetupCode(deviceSessionId);
      const result = deviceSessionManager.claimDevice(code!, userName, deviceDisplayName);
      expect(result).toBeDefined();
      expect(result!.device).toBeDefined();
      expect(result!.deviceSessionId).toEqual(deviceSessionId);
    });

    it('should return undefined if the device setup code is invalid', () => {
      const result = deviceSessionManager.claimDevice(
        'invalid-code',
        userName,
        deviceDisplayName
      );
      expect(result).toBeUndefined();
    });
  });

  describe('getDeviceNameFromSessionId', () => {
    it('should return the device name associated with the session ID', () => {
      const deviceSessionId = 'session-id';
      const userName = UserName.create();
      const deviceDisplayName = 'Device 1';
      const code = deviceSessionManager.createDeviceSetupCode(deviceSessionId);
      const result = deviceSessionManager.claimDevice(code!, userName, deviceDisplayName);
      expect(result).toBeDefined();
      const {device} = result!;
      const deviceName = deviceSessionManager.getDeviceNameFromSessionId(deviceSessionId);
      expect(deviceName).toBeDefined();
      expect(deviceName!.toString()).toEqual(device.name);
    });

    it('should return undefined if the session ID is not found', () => {
      const deviceName = deviceSessionManager.getDeviceNameFromSessionId('unknown-id');
      expect(deviceName).toBeUndefined();
    });
  });

  describe('getDevice', () => {
    it('should retrieve a device by its name', () => {
      const userName = UserName.create();
      const deviceDisplayName = 'Device 1';
      const code = deviceSessionManager.createDeviceSetupCode('session-id');
      const result = deviceSessionManager.claimDevice(
        code!,
        userName,
        deviceDisplayName
      );
      const deviceName = result!.device.name;
      const device = deviceSessionManager.getDevice(DeviceName.parse(deviceName)!);
      expect(device).toBeDefined();
      expect(device!.name).toEqual(deviceName);
      expect(device!.displayName).toEqual(deviceDisplayName);
    });

    it('should return undefined if the device does not exist', () => {
      const userName = UserName.create();
      const deviceName = DeviceName.createFromParent(userName);
      const device = deviceSessionManager.getDevice(deviceName);
      expect(device).toBeUndefined();
    });
  });

  describe('getDevices', () => {
    it('should retrieve all devices for a particular user', () => {
      const userName = UserName.create();
      const deviceDisplayName1 = 'Device 1';
      const code1 = deviceSessionManager.createDeviceSetupCode('session-id-1');
      deviceSessionManager.claimDevice(code1!, userName, deviceDisplayName1);
      const deviceDisplayName2 = 'Device 2';
      const code2 = deviceSessionManager.createDeviceSetupCode('session-id-2');
      deviceSessionManager.claimDevice(code2!, userName, deviceDisplayName2);

      const devices = deviceSessionManager.getDevices(userName);
      expect(devices).toHaveLength(2);
      expect(devices[0].displayName).toEqual(deviceDisplayName1);
      expect(devices[1].displayName).toEqual(deviceDisplayName2);
    });

    it('should return an empty array if the user has no devices', () => {
      const userName = UserName.create();
      const devices = deviceSessionManager.getDevices(userName);
      expect(devices).toHaveLength(0);
    });
  });

  describe('updateDevice', () => {
    it('should update a device', async () => {
      const userName = UserName.create();
      const deviceDisplayName = 'Device 1';
      const code = deviceSessionManager.createDeviceSetupCode('session-id');
      const result = deviceSessionManager.claimDevice(
        code!,
        userName,
        deviceDisplayName
      );
      const deviceName = result!.device.name;

      const updatedDevice = {
        ...result!.device,
        displayName: 'Updated Device'
      };

      const updated = await deviceSessionManager.updateDevice(
        DeviceName.parse(deviceName)!,
        () => updatedDevice
      );

      expect(updated).toEqual(updatedDevice);
    });

    it('should reject if the device does not exist', async () => {
      const deviceName = DeviceName.parse('users/user/devices/unknown');
      await expect(
        deviceSessionManager.updateDevice(
          deviceName!, (device) => ({...device, name: 'Updated Device'})
        )
      ).rejects.toBeUndefined();
    });
  });
});
