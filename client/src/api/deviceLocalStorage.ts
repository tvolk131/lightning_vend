import {Device, UnclaimedDevice} from '../../../proto_out/lightning_vend/model';
import {Result, err, ok} from 'neverthrow';
import {ClaimedOrUnclaimedDevice} from '../../../shared/deviceSocketTypes';

const deviceKey = 'device';
const unclaimedDeviceKey = 'unclaimedDevice';

export const loadDevice = (
): Result<ClaimedOrUnclaimedDevice | undefined, void> => {
  try {
    const deviceJson = window.localStorage.getItem(deviceKey);
    if (deviceJson) {
      return ok({device: Device.fromJSON(JSON.parse(deviceJson))});
    }

    const unclaimedDeviceJson = window.localStorage.getItem(unclaimedDeviceKey);
    if (unclaimedDeviceJson) {
      return ok(
        {
          unclaimedDevice: UnclaimedDevice.fromJSON(
            JSON.parse(unclaimedDeviceJson)
          )
        }
      );
    }

    return ok(undefined);
  } catch (e) {
    console.log('Failed to load device from local storage.', e);
        console.log('Failed to store device in local storage.');
    return err(undefined);
  }
};

export const storeDevice = (
  device: ClaimedOrUnclaimedDevice
): Result<void, void> => {
  return clearDevice().match<Result<void, void>>(() => {
    try {
      if ('device' in device) {
        window.localStorage.setItem(
          deviceKey,
          JSON.stringify(Device.toJSON(device.device))
        );
      } else if ('unclaimedDevice' in device) {
        window.localStorage.setItem(
          unclaimedDeviceKey,
          JSON.stringify(UnclaimedDevice.toJSON(device.unclaimedDevice))
        );
      }
      return ok(undefined);
    } catch (e) {
      console.log('Failed to store device in local storage.', e);
      return err(undefined);
    }
  }, (e) => err(e));
};

const clearDevice = (): Result<void, void> => {
  try {
    window.localStorage.removeItem(unclaimedDeviceKey);
    window.localStorage.removeItem(deviceKey);
    return ok(undefined);
  } catch (e) {
    console.log('Failed to clear device from local storage.');
    return err(undefined);
  }
};
