import {Device} from '../proto/lightning_vend/model';
import {DeviceSessionManager} from './deviceSessionManager';

describe('DeviceSessionManager', () => {
  let deviceSessionManager: DeviceSessionManager;

  beforeEach(() => {
    deviceSessionManager = new DeviceSessionManager();
  });

  describe('getOrCreateDeviceSession', () => {
    it('should create a new device session if it does not exist', () => {
      const deviceSessionId = 'session1';
      const lightningNodeOwnerPubkey = 'pubkey1';
      const displayName = 'Device 1';
      const supportedExecutionCommands = ['command1', 'command2'];

      const {device, isNew} = deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      expect(device).toEqual({
        deviceSessionId,
        displayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      });
      expect(isNew).toBe(true);
    });

    it('should not update an existing device session', () => {
      const deviceSessionId = 'session1';
      const lightningNodeOwnerPubkey = 'pubkey1';
      const displayName = 'Device 1';
      const supportedExecutionCommands = ['command1', 'command2'];

      const {
        device: device1,
        isNew: isNew1
      } = deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      device1.displayName = 'Updated Display Name';

      const {
        device: device2,
        isNew: isNew2
      } = deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        'newPubkey',
        'New Device',
        ['newCommand']
      );

      expect(device2).toEqual({
        deviceSessionId,
        displayName: 'Updated Display Name',
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      });
      expect(isNew1).toBe(true);
      expect(isNew2).toBe(false);
    });
  });

  describe('getDevice', () => {
    it('should return the device for an existing session', () => {
      const deviceSessionId = 'session1';
      const lightningNodeOwnerPubkey = 'pubkey1';
      const displayName = 'Device 1';
      const supportedExecutionCommands = ['command1', 'command2'];

      deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      const device = deviceSessionManager.getDevice(deviceSessionId);

      expect(device).toEqual({
        deviceSessionId,
        displayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      });
    });

    it('should return undefined for a non-existing device session', () => {
      const deviceSessionId = 'nonExistingSession';

      const device = deviceSessionManager.getDevice(deviceSessionId);

      expect(device).toBeUndefined();
    });
  });

  describe('updateDevice', () => {
    it('should update the device for a given session', async () => {
      const deviceSessionId = 'session1';
      const lightningNodeOwnerPubkey = 'pubkey1';
      const displayName = 'Device 1';
      const supportedExecutionCommands = ['command1', 'command2'];

      deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      const newDisplayName = 'Updated Display Name';

      const updatedDevice = await deviceSessionManager.updateDevice(
        deviceSessionId,
        (device) => {
          device.displayName = newDisplayName;
          return device;
        }
      );

      expect(updatedDevice).toEqual({
        deviceSessionId,
        displayName: newDisplayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      });
    });

    it('should reject if the device session ID is invalid', async () => {
      const deviceSessionId = 'invalidSession';

      await expect(deviceSessionManager.updateDevice(deviceSessionId, (device) => {
        device.displayName = 'Updated Display Name';
        return device;
      })).rejects.toBeUndefined();
    });
  });

  describe('getDevicesBelongingToNodePubkey', () => {
    it('should return the device sessions belonging to a specific node pubkey', () => {
      const nodePubkey = 'pubkey1';

      const device1: Device = {
        deviceSessionId: 'session1',
        displayName: 'Device 1',
        lightningNodeOwnerPubkey: nodePubkey,
        inventory: [],
        supportedExecutionCommands: ['command1']
      };
      const device2: Device = {
        deviceSessionId: 'session2',
        displayName: 'Device 2',
        lightningNodeOwnerPubkey: nodePubkey,
        inventory: [],
        supportedExecutionCommands: ['command2']
      };

      deviceSessionManager.getOrCreateDeviceSession(
        device1.deviceSessionId,
        device1.lightningNodeOwnerPubkey,
        device1.displayName,
        device1.supportedExecutionCommands
      );

      deviceSessionManager.getOrCreateDeviceSession(
        device2.deviceSessionId,
        device2.lightningNodeOwnerPubkey,
        device2.displayName,
        device2.supportedExecutionCommands
      );

      const deviceSessions =
        deviceSessionManager.getDevicesBelongingToNodePubkey(nodePubkey);

      expect(deviceSessions).toHaveLength(2);
      expect(deviceSessions).toContainEqual(device1);
      expect(deviceSessions).toContainEqual(device2);
    });

    it('should return an empty array if there are no device sessions for the node pubkey', () => {
      const nodePubkey = 'nonExistingPubkey';

      const deviceSessions =
        deviceSessionManager.getDevicesBelongingToNodePubkey(nodePubkey);

      expect(deviceSessions).toHaveLength(0);
    });
  });

  describe('getDeviceOwnerPubkey', () => {
    it('should return the lightningNodeOwnerPubkey for an existing device session', () => {
      const deviceSessionId = 'session1';
      const lightningNodeOwnerPubkey = 'pubkey1';
      const displayName = 'Device 1';
      const supportedExecutionCommands = ['command1', 'command2'];

      deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      const deviceOwnerPubkey = deviceSessionManager.getDeviceOwnerPubkey(deviceSessionId);

      expect(deviceOwnerPubkey).toBe(lightningNodeOwnerPubkey);
    });

    it('should return undefined for a non-existing device session', () => {
      const deviceSessionId = 'nonExistingSession';

      const deviceOwnerPubkey = deviceSessionManager.getDeviceOwnerPubkey(deviceSessionId);

      expect(deviceOwnerPubkey).toBeUndefined();
    });
  });
});
