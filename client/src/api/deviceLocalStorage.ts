import {Device, UnclaimedDevice} from '../../../proto_out/lightning_vend/model';
import {ClaimedOrUnclaimedDevice} from '../../../shared/deviceSocketTypes';

const deviceKey = 'device';
const unclaimedDeviceKey = 'unclaimedDevice';

export const loadDevice = (): ClaimedOrUnclaimedDevice | undefined => {
  const deviceJson = window.localStorage.getItem(deviceKey);
  if (deviceJson) {
    return {device: Device.fromJSON(JSON.parse(deviceJson))};
  }

  const unclaimedDeviceJson = window.localStorage.getItem(unclaimedDeviceKey);
  if (unclaimedDeviceJson) {
    return {
      unclaimedDevice: UnclaimedDevice.fromJSON(JSON.parse(unclaimedDeviceJson))
    };
  }
};

export const storeDevice = (device: ClaimedOrUnclaimedDevice) => {
  clearDevice();

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
};

export const clearDevice = () => {
  window.localStorage.removeItem(deviceKey);
  window.localStorage.removeItem(unclaimedDeviceKey);
};
