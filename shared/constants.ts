export const adminPagePath = '/admin';
export const devicePagePath = '/device';
export const learnMorePagePath = '/learn-more';

export const socketIoAdminPath = '/socket.io-admin';
export const socketIoDevicePath = '/socket.io-device';

// All uppercase alphanumeric characters (except for 0, O, and I, to prevent
// confusion).
export const deviceSetupCodeAllowedCharacters =
  'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
export const deviceSetupCodeLength = 4;

// TODO - Do some testing using slow internet connections and see if we can
// safely reduce this.
export const socketIoClientRpcTimeoutMs = 5000;

export const userSessionTokenLifetimeMs = 1000 * 60 * 60 * 24 * 30; // 30 days.
