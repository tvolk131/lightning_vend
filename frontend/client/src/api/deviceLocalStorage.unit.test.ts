import {Device, UnclaimedDevice} from '../../../proto_out/lightning_vend/model';
import {loadDevice, storeDevice} from './deviceLocalStorage';

describe('Device management', () => {
  let localStorageShouldThrow = {
    getItem: false,
    setItem: false,
    removeItem: false,
    clear: false
  };
  let localStorageData: { [key: string]: string };

  beforeEach(() => {
    localStorageShouldThrow = {
      getItem: false,
      setItem: false,
      removeItem: false,
      clear: false
    };
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => {
          if (localStorageShouldThrow.getItem) {
            throw new Error('Hello from localStorage.getItem()!');
          }
          return localStorageData[key] || null;
        },
        setItem: (key: string, value: string) => {
          if (localStorageShouldThrow.setItem) {
            throw new Error('Hello from localStorage.setItem()!');
          }
          localStorageData[key] = value;
        },
        removeItem: (key: string) => {
          if (localStorageShouldThrow.removeItem) {
            throw new Error('Hello from localStorage.removeItem()!');
          }
          delete localStorageData[key];
        },
        clear: () => {
          if (localStorageShouldThrow.clear) {
            throw new Error('Hello from localStorage.clear()!');
          }
          localStorageData = {};
        }
      }
    });
  });

  it('loads, stores, and clears a device', () => {
    const device = {device: Device.create({name: 'users/test'})};

    // Test that there is no device initially.
    expect(loadDevice()._unsafeUnwrap()).toBeUndefined();

    // Test storing the device.
    storeDevice(device)._unsafeUnwrap();
    expect(loadDevice()._unsafeUnwrap()).toEqual(device);
  });

  it('loads, stores, and clears an unclaimed device', () => {
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Test that there is no device initially.
    expect(loadDevice()._unsafeUnwrap()).toBeUndefined();

    // Test storing the unclaimed device.
    storeDevice(unclaimedDevice)._unsafeUnwrap();
    expect(loadDevice()._unsafeUnwrap()).toEqual(unclaimedDevice);
  });

  it('overwrites a device with an unclaimed device', () => {
    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Test storing the device.
    storeDevice(device)._unsafeUnwrap();
    expect(loadDevice()._unsafeUnwrap()).toEqual(device);

    // Test storing the unclaimed device.
    storeDevice(unclaimedDevice)._unsafeUnwrap();
    expect(loadDevice()._unsafeUnwrap()).toEqual(unclaimedDevice);
  });

  it('overwrites an unclaimed device with a device', () => {
    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Test storing the unclaimed device.
    storeDevice(unclaimedDevice)._unsafeUnwrap();
    expect(loadDevice()._unsafeUnwrap()).toEqual(unclaimedDevice);

    // Test storing the device.
    storeDevice(device)._unsafeUnwrap();
    expect(loadDevice()._unsafeUnwrap()).toEqual(device);
  });

  it('never throws an error from calling localStorage.getItem()', () => {
    // Test loading the device when localStorage.getItem() throws an error.
    localStorageShouldThrow.getItem = true;

    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Should successfully store the device.
    expect(() => storeDevice(device)._unsafeUnwrap()).not.toThrow();
    // Should fail to load the device, but not throw an error.
    expect(() => loadDevice()._unsafeUnwrapErr()).not.toThrow();

    // Should successfully store the unclaimed device.
    expect(() => storeDevice(unclaimedDevice)._unsafeUnwrap()).not.toThrow();
    // Should fail to load the unclaimed device, but not throw an error.
    expect(() => loadDevice()._unsafeUnwrapErr()).not.toThrow();
  });

  it('never throws an error from calling localStorage.setItem()', () => {
    // Test loading the device when localStorage.setItem() throws an error.
    localStorageShouldThrow.setItem = true;

    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Should fail to store the device, but not throw an error.
    expect(() => storeDevice(device)._unsafeUnwrapErr()).not.toThrow();
    // Should successfully read from localStorage, but return undefined since
    // the device was not stored.
    expect(loadDevice()._unsafeUnwrap()).toEqual(undefined);

    // Should fail to store the unclaimed device, but not throw an error.
    expect(() => storeDevice(unclaimedDevice)._unsafeUnwrapErr()).not.toThrow();
    // Should successfully read from localStorage, but return undefined since
    // the unclaimed device was not stored.
    expect(loadDevice()._unsafeUnwrap()).toEqual(undefined);
  });

  it('never throws an error from calling localStorage.removeItem()', () => {
    // Test loading the device when localStorage.removeItem() throws an error.
    localStorageShouldThrow.removeItem = true;

    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Should fail to store the device, but not throw an error.
    expect(() => storeDevice(device)._unsafeUnwrapErr()).not.toThrow();
    // Should successfully read from localStorage, but return undefined since
    // the device was not stored.
    expect(loadDevice()._unsafeUnwrap()).toEqual(undefined);

    // Should fail to store the unclaimed device, but not throw an error.
    expect(() => storeDevice(unclaimedDevice)._unsafeUnwrapErr()).not.toThrow();
    // Should successfully read from localStorage, but return undefined since
    // the unclaimed device was not stored.
    expect(loadDevice()._unsafeUnwrap()).toEqual(undefined);
  });
});
