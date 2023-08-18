import {Device, UnclaimedDevice} from '../../../proto_out/lightning_vend/model';
import {clearDevice, loadDevice, storeDevice} from './deviceLocalStorage';

describe('Device management', () => {
  let localStorageData: { [key: string]: string };

  beforeEach(() => {
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageData[key] || null,
        setItem: (key: string, value: string) => localStorageData[key] = value,
        removeItem: (key: string) => delete localStorageData[key],
        clear: () => localStorageData = {}
      }
    });
  });

  it('loads, stores, and clears a device', () => {
    const device = {device: Device.create({name: 'users/test'})};

    // Test that there is no device initially.
    expect(loadDevice()).toBeUndefined();

    // Test storing the device.
    storeDevice(device);
    expect(loadDevice()).toEqual(device);

    // Test clearing the device.
    clearDevice();
    expect(loadDevice()).toBeUndefined();
  });

  it('loads, stores, and clears an unclaimed device', () => {
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Test that there is no device initially.
    expect(loadDevice()).toBeUndefined();

    // Test storing the unclaimed device.
    storeDevice(unclaimedDevice);
    expect(loadDevice()).toEqual(unclaimedDevice);

    // Test clearing the unclaimed device.
    clearDevice();
    expect(loadDevice()).toBeUndefined();
  });

  it('overwrites a device with an unclaimed device', () => {
    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Test storing the device.
    storeDevice(device);
    expect(loadDevice()).toEqual(device);

    // Test storing the unclaimed device.
    storeDevice(unclaimedDevice);
    expect(loadDevice()).toEqual(unclaimedDevice);
  });

  it('overwrites an unclaimed device with a device', () => {
    const device = {device: Device.create({name: 'users/test'})};
    const unclaimedDevice = {
      unclaimedDevice: UnclaimedDevice.create({name: 'users/test'})
    };

    // Test storing the unclaimed device.
    storeDevice(unclaimedDevice);
    expect(loadDevice()).toEqual(unclaimedDevice);

    // Test storing the device.
    storeDevice(device);
    expect(loadDevice()).toEqual(device);
  });
});
