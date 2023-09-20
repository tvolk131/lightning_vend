import {
  ClaimUnclaimedDeviceRequest,
  CreateUnclaimedDeviceRequest,
  DeviceService,
  GetDeviceByDeviceSessionIdRequest,
  GetDeviceRequest,
  GetDeviceSessionIdRequest,
  GetDeviceSessionIdResponse,
  GetUnclaimedDeviceByDeviceSessionIdRequest,
  ListDevicesRequest,
  ListDevicesResponse,
  UnclaimDeviceRequest,
  UpdateDeviceRequest
} from '../../proto_out/lightning_vend/device_service';
import {Collection, Filter, ObjectId, WithId} from 'mongodb';
import {
  Device,
  InventoryItem,
  UnclaimedDevice
} from '../../proto_out/lightning_vend/model';
import {DeviceName, UnclaimedDeviceName, UserName} from '../../shared/proto';
import {createPageToken, getBoundedPageSize, parsePageToken} from './aipHelper';
import {generateDeviceSetupCode} from '../../shared/constants';

export interface DeviceCollectionSchema {
  // This should always be present, but we can't guarantee that it will be
  // present in the database and we don't want to crash if it isn't.
  deviceSessionId?: string;
  setupCode?: string;
  ownerUserId?: ObjectId;
  displayName?: string;
  // InventoryItem is a proto message, so it could be updated in the future.
  // Using Partial<InventoryItem> allows us to update the proto message without
  // having to update the schema by withholding any guarantees about the
  // presence of fields.
  inventory?: Partial<InventoryItem>[];
  nullExecutionCommands?: string[];
  boolExecutionCommands?: string[];
  colorScheme?: number;
}

const deviceCollectionDocumentToProto = (
  document: WithId<DeviceCollectionSchema>
) => {
  const createTime = document._id.getTimestamp();

  if (document.setupCode !== undefined) {
    return {
      unclaimedDevice: UnclaimedDevice.create({
        name: `unclaimedDevices/${document._id.toString()}`,
        createTime,
        setupCode: document.setupCode
      })
    };
  } else {
    let name = '';
    if (document.ownerUserId) {
      name = `users/${document.ownerUserId.toString()}` +
             `/devices/${document._id.toString()}`;
    }

    return {
      device: Device.create({
        name,
        createTime,
        displayName: document.displayName,
        inventory: document.inventory,
        nullExecutionCommands: document.nullExecutionCommands,
        boolExecutionCommands: document.boolExecutionCommands,
        colorScheme: document.colorScheme
      })
    };
  }
};

const partialDeviceToDocument = (
  device?: Device,
  ownerUserId?: ObjectId,
  deviceSessionId?: string
): Partial<DeviceCollectionSchema> => {
  const deviceSchemaInstance: Partial<DeviceCollectionSchema> = {};

  if (deviceSessionId) {
    deviceSchemaInstance.deviceSessionId = deviceSessionId;
  }

  if (ownerUserId) {
    deviceSchemaInstance.ownerUserId = ownerUserId;
  }

  if (device?.displayName) {
    deviceSchemaInstance.displayName = device.displayName;
  }

  if (device?.inventory) {
    deviceSchemaInstance.inventory = device.inventory;
  }

  if (device?.nullExecutionCommands) {
    deviceSchemaInstance.nullExecutionCommands = device.nullExecutionCommands;
  }

  if (device?.boolExecutionCommands) {
    deviceSchemaInstance.boolExecutionCommands = device.boolExecutionCommands;
  }

  if (device && device.colorScheme.valueOf() !== 0) {
    deviceSchemaInstance.colorScheme = device.colorScheme;
  }

  return deviceSchemaInstance;
};

// Returns a string that can be used as a signature for a ListDevicesRequest.
// This signature is used to ensure that all request parameters are the same
// between calls to ListDevices when paging through results.
const getListDevicesRequestPageTokenSignature = (
  request: ListDevicesRequest
): string => {
  // All fields except for `pageToken` are used to generate the signature.
  return `${request.pageSize}-${request.parent}`;
};

export class DeviceCollection implements DeviceService {
  private collection: Collection<DeviceCollectionSchema>;

  public static async create(collection: Collection<DeviceCollectionSchema>) {
    const deviceCollection = new DeviceCollection(collection);
    await deviceCollection.initializeIndexes();
    return deviceCollection;
  }

  private constructor(collection: Collection<DeviceCollectionSchema>) {
    this.collection = collection;
  }

  private async initializeIndexes(): Promise<void> {
    // Ensures quick lookup of devices by their `deviceSessionId` and uniqueness
    // of the field.
    await this.collection.createIndex({deviceSessionId: 1}, {unique: true});

    // Ensures quick lookup of devices by their owner.
    await this.collection.createIndex({ownerUserId: 1});

    // Ensures quick lookup of unclaimed devices by their setup code, and
    // uniqueness of setup codes. Unclaimed devices will automatically be
    // deleted after 24 hours to free up database space and allow for the re-use
    // of setup codes. The partialFilterExpression option (in combination with
    // the unique option) allows for claimed devices to exist in the same
    // collection without having to worry about uniqueness constraints on the
    // `setupCode` field.
    const secondsPerDay = 60 * 60 * 24;
    await this.collection.createIndex(
      // The `setupCode` field is only present on unclaimed devices, so we can
      // use it to filter out claimed devices.
      {setupCode: 1},
      {
        // Ensure that setup codes are unique per unclaimed device.
        unique: true,
        // Only apply the uniqueness constraint to unclaimed devices.
        partialFilterExpression: {setupCode: {$exists: true}},
        // Ensure that unclaimed devices are automatically deleted after 24
        // hours.
        expireAfterSeconds: secondsPerDay
      }
    );
  }

  public async GetDevice(
    request: GetDeviceRequest
  ): Promise<Device> {
    if (request.name.length === 0) {
      throw new Error('Name must not be empty.');
    }

    const deviceName = DeviceName.parse(request.name);
    if (deviceName === undefined) {
      throw new Error('Name must be a valid device name (must be formatted ' +
                      'as `users/{user}/devices/{device}`).'
      );
    }

    let ownerUserId;
    try {
      ownerUserId = new ObjectId(deviceName.getUserSegment());
    } catch (err) {
      throw new Error('Name must be a valid device name (`{user}` segment in ' +
                      '`users/{user}/devices/{device}` must be a valid ' +
                      'MongoDB ObjectId).'
      );
    }

    let deviceId;
    try {
      deviceId = new ObjectId(deviceName.getDeviceSegment());
    } catch (err) {
      throw new Error('Name must be a valid device name (`{device}` segment ' +
                      'in `users/{user}/devices/{device}` must be a valid ' +
                      'MongoDB ObjectId).'
      );
    }

    const res = await this.collection.findOne({
      ownerUserId,
      _id: deviceId
    });

    if (!res) {
      throw new Error(`Device not found: ${request.name}.`);
    }

    const documentProto = deviceCollectionDocumentToProto(res);
    if (documentProto.unclaimedDevice) {
      // This should never happen because we're finding a device by its owner
      // and id, which means it must be claimed.
      throw new Error('Failed to get device, because it is not yet claimed.');
    }

    return documentProto.device;
  }

  public async ListDevices(
    request: ListDevicesRequest
  ): Promise<ListDevicesResponse> {
    // -------------------
    // Request validation.
    // -------------------

    if (request.parent.length === 0) {
      throw new Error('Parent must not be empty.');
    }

    const parentUserName = UserName.parse(request.parent);
    if (!parentUserName) {
      throw new Error('Parent must be a valid user name (must be formatted ' +
                      'as `users/{user}`).'
      );
    }

    let ownerUserId;
    try {
      ownerUserId = new ObjectId(parentUserName.getUserSegment());
    } catch (err) {
      throw new Error('Parent must be a valid user name (`{user}` segment in ' +
                      '`users/{user}` must be a valid MongoDB ObjectId).'
      );
    }

    const requestSignature = getListDevicesRequestPageTokenSignature(request);

    const pageSize = getBoundedPageSize(request.pageSize, 50, 1000);

    let lastObjectId;
    if (request.pageToken.length > 0) {
      lastObjectId = parsePageToken(request.pageToken, requestSignature);
    }

    // -----------------
    // Query generation.
    // -----------------

    const filter: Filter<DeviceCollectionSchema> = {ownerUserId};

    const findFilter: Filter<DeviceCollectionSchema> = {...filter};
    if (lastObjectId) {
      findFilter._id = {$gt: lastObjectId};
    }

    // ----------------
    // Query execution.
    // ----------------

    const docs = await this.collection.find(findFilter)
      // Fetch one extra document to determine if there are more results.
      .limit(pageSize + 1)
      .toArray();

    const totalSize = await this.collection.countDocuments(filter);

    // -----------------
    // Response packing.
    // -----------------

    let nextPageToken = '';
    if (docs.length === pageSize + 1) {
      docs.pop();
      const lastObjectId = docs[docs.length - 1]._id;
      nextPageToken = createPageToken(lastObjectId, requestSignature);
    }

    const devices = [];
    for (let i = 0; i < docs.length; i++) {
      const proto = deviceCollectionDocumentToProto(docs[i]);
      // This should always be true because we're finding devices by their
      // owner, which means they must be claimed. However, we're checking just
      // in case (and to satisfy the TypeScript compiler).
      if (proto.device) {
        devices.push(proto.device);
      }
    }

    return ListDevicesResponse.create({
      devices,
      nextPageToken,
      totalSize
    });
  }

  public async UpdateDevice(
    request: UpdateDeviceRequest
  ): Promise<Device> {
    // -------------------
    // Request validation.
    // -------------------

    if (request.device === undefined) {
      throw new Error('Device must be defined.');
    }

    if (request.updateMask === undefined) {
      throw new Error('Update mask must be defined.');
    }

    if (request.device.name.length === 0) {
      throw new Error('Device name must not be empty.');
    }

    const deviceName = DeviceName.parse(request.device.name);
    if (deviceName === undefined) {
      throw new Error('Device name must be valid (must be formatted  as ' +
                      '`users/{user}/devices/{device}`).'
      );
    }

    let ownerUserId;
    try {
      ownerUserId = new ObjectId(deviceName.getUserSegment());
    } catch (err) {
      throw new Error('Device name must be valid (`{user}` segment in ' +
                      '`users/{user}/devices/{device}` must be a valid ' +
                      'MongoDB ObjectId).'
      );
    }

    let deviceId;
    try {
      deviceId = new ObjectId(deviceName.getDeviceSegment());
    } catch (err) {
      throw new Error('Device name must be valid (`{device}` segment in ' +
                      '`users/{user}/devices/{device}` must be a valid ' +
                      'MongoDB ObjectId).'
      );
    }

    // -----------------
    // Query generation.
    // -----------------

    const setDoc: Partial<DeviceCollectionSchema> = {};
    const unsetDoc: {[Key in keyof DeviceCollectionSchema as Key]?: ''} = {};

    for (let i = 0; i < request.updateMask.length; i++) {
      const updatePath = request.updateMask[i];

      if (updatePath === 'display_name') {
        setDoc.displayName = request.device.displayName;
      } else if (updatePath === 'inventory') {
        if (request.device.inventory.length) {
          setDoc.inventory = request.device.inventory;
        } else {
          unsetDoc.inventory = '';
        }
      } else if (updatePath === 'null_execution_commands') {
        if (request.device.nullExecutionCommands.length) {
          setDoc.nullExecutionCommands = request.device.nullExecutionCommands;
        } else {
          unsetDoc.nullExecutionCommands = '';
        }
      } else if (updatePath === 'bool_execution_commands') {
        if (request.device.boolExecutionCommands.length) {
          setDoc.boolExecutionCommands = request.device.boolExecutionCommands;
        } else {
          unsetDoc.boolExecutionCommands = '';
        }
      } else if (updatePath === 'color_scheme') {
        if (request.device.colorScheme.valueOf() !== 0) {
          setDoc.colorScheme = request.device.colorScheme;
        } else {
          unsetDoc.colorScheme = '';
        }
      } else if (updatePath.length === 0) {
        throw new Error('Update mask paths must not be empty.');
      } else if (updatePath === '*') {
        throw new Error('Full replacement is not yet implemented.');
      }
    }

    if (Object.keys(setDoc).length === 0 &&
        Object.keys(unsetDoc).length === 0) {
      throw new Error('Update mask must contain at least one valid field.');
    }

    // ----------------
    // Query execution.
    // ----------------

    const res = await this.collection.findOneAndUpdate(
      {ownerUserId, _id: deviceId},
      {$set: setDoc, $unset: unsetDoc},
      {returnDocument: 'after'}
    );

    if (!res.ok || !res.value) {
      throw new Error('Failed to update device with name: ' +
                      `${request.device.name}.`);
    }

    const documentProto = deviceCollectionDocumentToProto(res.value);
    if (documentProto.unclaimedDevice) {
      // This should never happen because we updated the document and returned
      // the new version (`returnDocument: 'after'` in the findOneAndUpdate call
      // above).
      throw new Error('Failed to update device with name: ' +
                      `'${request.device.name}' because it is not yet claimed.`
      );
    }

    return documentProto.device;
  }

  public async CreateUnclaimedDevice(
    request: CreateUnclaimedDeviceRequest
  ): Promise<UnclaimedDevice> {
    if (request.unclaimedDevice === undefined) {
      throw new Error('Unclaimed device must be defined.');
    }

    const deviceSessionId = request.unclaimedDevice.deviceSessionId;
    if (deviceSessionId.length === 0) {
      throw new Error('Device session id must not be empty.');
    }

    const setupCode = await this.getAvailableSetupCode();

    const res = await this.collection.insertOne({
      deviceSessionId,
      setupCode
    });

    if (!res.acknowledged) {
      throw new Error('Failed to create unclaimed device with ' +
                      `deviceSessionId: ${deviceSessionId}.`
      );
    }

    return UnclaimedDevice.create({
      name: `unclaimedDevices/${res.insertedId.toString()}`,
      setupCode
    });
  }

  public async ClaimUnclaimedDevice(
    request: ClaimUnclaimedDeviceRequest
  ): Promise<Device> {
    if (request.parent.length === 0) {
      throw new Error('User must not be empty.');
    }

    const userName = UserName.parse(request.parent);
    if (userName === undefined) {
      throw new Error('User must be a valid user name (must be formatted as ' +
                      '`users/{user}`).'
      );
    }

    let ownerUserId;
    try {
      ownerUserId = new ObjectId(userName.getUserSegment());
    } catch (err) {
      throw new Error('User must be a valid user name (`{user}` segment in ' +
                      '`users/{user}` must be a valid MongoDB ObjectId).'
      );
    }

    if (request.setupCode.length === 0) {
      throw new Error('Setup code must not be empty.');
    }

    const res = await this.collection.findOneAndUpdate(
      {setupCode: request.setupCode},
      {
        $unset: {setupCode: ''},
        $set: partialDeviceToDocument(request.device, ownerUserId)
      },
      {returnDocument: 'after'}
    );

    if (!res.ok || !res.value) {
      throw new Error('Failed to claim unclaimed device with ' +
                      `setupCode: ${request.setupCode}.`
      );
    }

    const documentProto = deviceCollectionDocumentToProto(res.value);
    if (documentProto.unclaimedDevice) {
      // This should never happen because we updated the document and returned
      // the new version (`returnDocument: 'after'` in the findOneAndUpdate call
      // above).
      throw new Error('Failed to claim unclaimed device with setupCode: ' +
                      `${request.setupCode} because it is already claimed.`
      );
    }

    return documentProto.device;
  }

  public async UnclaimDevice(
    request: UnclaimDeviceRequest
  ): Promise<UnclaimedDevice> {
    if (request.name.length === 0) {
      throw new Error('Name must not be empty.');
    }

    const deviceName = DeviceName.parse(request.name);
    if (deviceName === undefined) {
      throw new Error('Name must be a valid device name (must be formatted ' +
                      'as `users/{user}/devices/{device}`).'
      );
    }

    let ownerUserId;
    try {
      ownerUserId = new ObjectId(deviceName.getUserSegment());
    } catch (err) {
      throw new Error('Name must be a valid device name (`{user}` segment in ' +
                      '`users/{user}/devices/{device}` must be a valid ' +
                      'MongoDB ObjectId).'
      );
    }

    let deviceId;
    try {
      deviceId = new ObjectId(deviceName.getDeviceSegment());
    } catch (err) {
      throw new Error('Name must be a valid device name (`{device}` segment ' +
                      'in `users/{user}/devices/{device}` must be a valid ' +
                      'MongoDB ObjectId).'
      );
    }

    // This is a bit of a hack to get the `deviceSessionId. We're using another
    // query below to actually update the document to unclaim the device. This
    // is necessary because we're completely replacing the document but need to
    // retain the `deviceSessionId`. We could do this in a single query using
    // `updateOne()` with the `$set` and `$unset` operators, but that could
    // leave the document in an inconsistent state if one or more fields are
    // added to or removed from the `Device` proto in the future, causing some
    // fields that should be unset to still be set. Since this `findOne()` is
    // a read-only operation and `deviceSessionId` should never change, it's
    // safe to use this to get the `deviceSessionId` and then use a separate
    // `replaceOne()` to unclaim the device even though it's not atomic.
    const findOneRes = await this.collection.findOne({
      _id: deviceId,
      ownerUserId
    });
    if (!findOneRes) {
      throw new Error('Device not found.');
    }

    const deviceSessionId = findOneRes.deviceSessionId;

    const setupCode = await this.getAvailableSetupCode();

    const res = await this.collection.replaceOne(
      {
        _id: deviceId,
        ownerUserId
      },
      {
        deviceSessionId,
        setupCode
      }
    );

    if (res.modifiedCount === 0) {
      throw new Error('Failed to unclaim device with ' +
                      `name: ${request.name}.`
      );
    }

    return UnclaimedDevice.create({
      name: `unclaimedDevices/${deviceId.toString()}`,
      setupCode
    });
  }

  public async GetDeviceByDeviceSessionId(
    request: GetDeviceByDeviceSessionIdRequest
  ): Promise<Device> {
    const res = await this.collection.findOne({
      deviceSessionId: request.deviceSessionId
    });

    if (res === null) {
      throw new Error('Device not found.');
    }

    const documentProto = deviceCollectionDocumentToProto(res);
    if (documentProto.unclaimedDevice) {
      throw new Error('Failed to get device, because it is not yet claimed.');
    }

    return documentProto.device;
  }

  public async GetUnclaimedDeviceByDeviceSessionId(
    request: GetUnclaimedDeviceByDeviceSessionIdRequest
  ): Promise<UnclaimedDevice> {
    const res = await this.collection.findOne({
      deviceSessionId: request.deviceSessionId
    });

    if (res === null) {
      throw new Error('Device not found.');
    }

    const documentProto = deviceCollectionDocumentToProto(res);
    if (documentProto.device) {
      throw new Error('Failed to get unclaimed device, because it is already ' +
                      'claimed.');
    }

    return documentProto.unclaimedDevice;
  }

  public async GetDeviceSessionId(
    request: GetDeviceSessionIdRequest
  ): Promise<GetDeviceSessionIdResponse> {
    let findFilter: Filter<DeviceCollectionSchema>;

    const deviceName = DeviceName.parse(request.name);
    const unclaimedDeviceName = UnclaimedDeviceName.parse(request.name);

    if (deviceName !== undefined) {
      let ownerUserId;
      try {
        ownerUserId = new ObjectId(deviceName.getUserSegment());
      } catch (err) {
        throw new Error('Name must be a valid device name (`{user}` segment ' +
                        'in `users/{user}/devices/{device}` must be a valid ' +
                        'MongoDB ObjectId).'
        );
      }

      let deviceId;
      try {
        deviceId = new ObjectId(deviceName.getDeviceSegment());
      } catch (err) {
        throw new Error('Name must be a valid device name (`{device}` ' +
                        'segment in `users/{user}/devices/{device}` must be ' +
                        'a valid MongoDB ObjectId).'
        );
      }

      findFilter = {
        _id: deviceId,
        ownerUserId
      };
    } else if (unclaimedDeviceName !== undefined) {
      let unclaimedDeviceId;
      try {
        unclaimedDeviceId =
          new ObjectId(unclaimedDeviceName.getUnclaimedDeviceSegment());
      } catch (err) {
        throw new Error('Name must be a valid unclaimed device name ' +
                        '(`{device}` segment in `unclaimedDevices/{device}` ' +
                        'must be a valid MongoDB ObjectId).'
        );
      }

      findFilter = {
        _id: unclaimedDeviceId
      };
    } else {
      throw new Error('Name must be a valid device name (must be formatted ' +
                      'as `users/{user}/devices/{device}`) or unclaimed ' +
                      'device name (must be formatted as ' +
                      '`unclaimedDevices/{unclaimed_device}`).'
      );
    }

    if (!findFilter) {
      throw new Error('Failed to parse device name.');
    }

    const res = await this.collection.findOne(findFilter);

    if (!res || !res.deviceSessionId) {
      throw new Error('Device not found.');
    }

    return GetDeviceSessionIdResponse.create({
      deviceSessionId: res.deviceSessionId
    });
  }

  private async getAvailableSetupCode(retries: number = 5): Promise<string> {
    for (let i = 0; i < retries; i++) {
      // TODO - Store previously attempted setup codes so we don't retry
      // duplicate codes. The probability of a collision is low, but it's
      // possible.
      const code = generateDeviceSetupCode();
      const codeExists = await this.setupCodeExists(code);
      if (!codeExists) {
        return code;
      }
    }

    throw new Error('Failed to generate a unique setup code.');
  }

  private async setupCodeExists(setupCode: string): Promise<boolean> {
    return !!await this.collection.findOne({setupCode});
  }
}
