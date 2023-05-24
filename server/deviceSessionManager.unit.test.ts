import {DeviceData} from '../proto/lightning_vend/model';
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

      const {deviceData, isNew} = deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      expect(deviceData).toEqual({
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
        deviceData: deviceData1,
        isNew: isNew1
      } = deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        lightningNodeOwnerPubkey,
        displayName,
        supportedExecutionCommands
      );

      deviceData1.displayName = 'Updated Display Name';

      const {
        deviceData: deviceData2,
        isNew: isNew2
      } = deviceSessionManager.getOrCreateDeviceSession(
        deviceSessionId,
        'newPubkey',
        'New Device',
        ['newCommand']
      );

      expect(deviceData2).toEqual({
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

  describe('getDeviceData', () => {
    it('should return the device data for an existing device session', () => {
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

      const deviceData = deviceSessionManager.getDeviceData(deviceSessionId);

      expect(deviceData).toEqual({
        deviceSessionId,
        displayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      });
    });

    it('should return undefined for a non-existing device session', () => {
      const deviceSessionId = 'nonExistingSession';

      const deviceData = deviceSessionManager.getDeviceData(deviceSessionId);

      expect(deviceData).toBeUndefined();
    });
  });

  describe('updateDeviceData', () => {
    it('should update the device data for a device session', async () => {
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

      const updatedDeviceData = await deviceSessionManager.updateDeviceData(
        deviceSessionId,
        (deviceData) => {
          deviceData.displayName = newDisplayName;
          return deviceData;
        }
      );

      expect(updatedDeviceData).toEqual({
        deviceSessionId,
        displayName: newDisplayName,
        lightningNodeOwnerPubkey,
        inventory: [],
        supportedExecutionCommands
      });
    });

    it('should reject if the device session ID is invalid', async () => {
      const deviceSessionId = 'invalidSession';

      await expect(deviceSessionManager.updateDeviceData(deviceSessionId, (deviceData) => {
        deviceData.displayName = 'Updated Display Name';
        return deviceData;
      })).rejects.toBeUndefined();
    });
  });

  describe('getDeviceSessionsBelongingToNodePubkey', () => {
    it('should return the device sessions belonging to a specific node pubkey', () => {
      const nodePubkey = 'pubkey1';

      const deviceData1: DeviceData = {
        deviceSessionId: 'session1',
        displayName: 'Device 1',
        lightningNodeOwnerPubkey: nodePubkey,
        inventory: [],
        supportedExecutionCommands: ['command1']
      };
      const deviceData2: DeviceData = {
        deviceSessionId: 'session2',
        displayName: 'Device 2',
        lightningNodeOwnerPubkey: nodePubkey,
        inventory: [],
        supportedExecutionCommands: ['command2']
      };

      deviceSessionManager.getOrCreateDeviceSession(
        deviceData1.deviceSessionId,
        deviceData1.lightningNodeOwnerPubkey,
        deviceData1.displayName,
        deviceData1.supportedExecutionCommands
      );

      deviceSessionManager.getOrCreateDeviceSession(
        deviceData2.deviceSessionId,
        deviceData2.lightningNodeOwnerPubkey,
        deviceData2.displayName,
        deviceData2.supportedExecutionCommands
      );

      const deviceSessions =
        deviceSessionManager.getDeviceSessionsBelongingToNodePubkey(nodePubkey);

      expect(deviceSessions).toHaveLength(2);
      expect(deviceSessions).toContainEqual(deviceData1);
      expect(deviceSessions).toContainEqual(deviceData2);
    });

    it('should return an empty array if there are no device sessions for the node pubkey', () => {
      const nodePubkey = 'nonExistingPubkey';

      const deviceSessions =
        deviceSessionManager.getDeviceSessionsBelongingToNodePubkey(nodePubkey);

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
