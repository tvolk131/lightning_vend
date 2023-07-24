export const adminPagePath = '/admin';
export const devicePagePath = '/device';
export const learnMorePagePath = '/learn-more';

export const socketIoAdminPath = '/socket.io-admin';
export const socketIoDevicePath = '/socket.io-device';

// The character set allowed in device setup codes. This is used to generate
// setup codes, and is also used in the client to validate setup codes. Contains
// all uppercase alphanumeric characters (except for 0, O, and I, to prevent
// confusion). Use caution when changing this value. It is used to generate
// setup codes that are stored in the database, so removing characters could
// invalidate existing setup codes. It is also used in the client, so updating
// this value will also require that all clients run the latest version of the
// code to be able to use valid setup codes. So don't change this value unless
// there is a good reason to do so.
export const deviceSetupCodeAllowedCharacters =
  'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';

// The character length of device setup codes. Updating this value will
// invalidate existing setup codes for unclaimed devices since they are stored
// in the database with a setup code of this length. This value is also used
// in the client, so updating this value will also require that all clients run
// the latest version of the code to be able to use valid setup codes. So don't
// change this value unless there is a good reason to do so.
export const deviceSetupCodeLength = 4;

// TODO - Do some testing using slow internet connections and see if we can
// safely reduce this.
export const socketIoClientRpcTimeoutMs = 5000;

export const userSessionTokenLifetimeMs = 1000 * 60 * 60 * 24 * 30; // 30 days.
