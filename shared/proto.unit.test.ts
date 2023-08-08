import {DeviceName, UnclaimedDeviceName, UserName} from './proto';

jest.mock('./uuid', () => ({
  makeUuid: jest.fn().mockReturnValue('mockedUuid')
}));

describe('UserName', () => {
  describe('parse', () => {
    it(
      'should return a UserName instance when a valid name is provided',
      () => {
        const name = 'users/user123';
        const userName = UserName.parse(name);
        expect(userName).toBeInstanceOf(UserName);
        expect(userName!.toString()).toBe(name);
      }
    );

    it('should return undefined when an invalid name is provided', () => {
      const name = 'invalidName';
      const userName = UserName.parse(name);
      expect(userName).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should return a UserName instance with a valid name', () => {
      const userName = UserName.create();
      expect(userName).toBeInstanceOf(UserName);
      expect(userName.toString()).toBe('users/mockedUuid');
    });
  });

  describe('toString', () => {
    it('should return the string representation of UserName', () => {
      const userName = UserName.parse('users/user123')!;
      expect(userName.toString()).toBe('users/user123');
    });
  });
});

describe('UnclaimedDeviceName', () => {
  describe('parse', () => {
    it(
      'should return a UnclaimedDeviceName instance when a valid name is ' +
      'provided',
      () => {
        const name = 'users/user123';
        const unclaimedDeviceName = UnclaimedDeviceName.parse(name);
        expect(unclaimedDeviceName).toBeInstanceOf(UnclaimedDeviceName);
        expect(unclaimedDeviceName!.toString()).toBe(name);
      }
    );

    it('should return undefined when an invalid name is provided', () => {
      const name = 'invalidName';
      const unclaimedDeviceName = UnclaimedDeviceName.parse(name);
      expect(unclaimedDeviceName).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should return a UnclaimedDeviceName instance with a valid name', () => {
      const unclaimedDeviceName = UnclaimedDeviceName.create();
      expect(unclaimedDeviceName).toBeInstanceOf(UnclaimedDeviceName);
      expect(unclaimedDeviceName.toString()).toBe('users/mockedUuid');
    });
  });

  describe('toString', () => {
    it('should return the string representation of UnclaimedDeviceName', () => {
      const unclaimedDeviceName = UnclaimedDeviceName.parse('users/user123')!;
      expect(unclaimedDeviceName.toString()).toBe('users/user123');
    });
  });
});

describe('DeviceName', () => {
  describe('parse', () => {
    it(
      'should return a DeviceName instance when a valid name is provided',
      () => {
        const name = 'users/user123/devices/device456';
        const deviceName = DeviceName.parse(name);
        expect(deviceName).toBeInstanceOf(DeviceName);
        expect(deviceName!.toString()).toBe(name);
      }
    );

    it('should return undefined when an invalid name is provided', () => {
      const name = 'invalidName';
      const deviceName = DeviceName.parse(name);
      expect(deviceName).toBeUndefined();
    });
  });

  describe('createFromParent', () => {
    it(
      'should return a DeviceName instance with a valid name and parent user',
      () => {
        const user = UserName.parse('users/user123')!;
        const deviceName = DeviceName.createFromParent(user);
        expect(deviceName).toBeInstanceOf(DeviceName);
        expect(deviceName.toString()).toBe('users/user123/devices/mockedUuid');
      }
    );
  });

  describe('toString', () => {
    it('should return the string representation of DeviceName', () => {
      const deviceName = DeviceName.parse('users/user123/devices/device456')!;
      expect(deviceName.toString()).toBe('users/user123/devices/device456');
    });
  });

  describe('getUserName', () => {
    it('should return the parent UserName', () => {
      const deviceName = DeviceName.parse('users/user123/devices/device456')!;
      const userName = deviceName.getUserName();
      expect(userName).toBeInstanceOf(UserName);
      expect(userName!.toString()).toBe('users/user123');
    });
  });

  describe('equals', () => {
    it('should return true when the names are equal', () => {
      const deviceName1 = DeviceName.parse('users/user123/devices/device456')!;
      const deviceName2 = DeviceName.parse('users/user123/devices/device456')!;
      expect(deviceName1.equals(deviceName2)).toBe(true);
    });

    it('should return false when the names are not equal', () => {
      const deviceName1 = DeviceName.parse('users/user123/devices/device456')!;
      const deviceName2 = DeviceName.parse('users/user123/devices/device789')!;
      expect(deviceName1.equals(deviceName2)).toBe(false);
    });
  });
});
