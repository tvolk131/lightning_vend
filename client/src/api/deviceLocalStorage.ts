import {Device} from '../../../proto/lightning_vend/model';

const deviceKey = 'device';

export const loadDevice = (): Device | undefined => {
  const deviceJson = window.localStorage.getItem(deviceKey);
  if (deviceJson) {
    return Device.fromJSON(JSON.parse(deviceJson));
  }
};

export const storeDevice = (device: Device | undefined) => {
  if (device) {
    window.localStorage.setItem(
      deviceKey,
      JSON.stringify(Device.toJSON(device))
    );
  } else {
    window.localStorage.removeItem(deviceKey);
  }
};
