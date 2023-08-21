import * as Long from 'long';
import {
  ClaimUnclaimedDeviceRequest,
  GetDeviceRequest,
  ListDevicesRequest,
  UpdateDeviceRequest
} from '../../proto_out/lightning_vend/device_service';
import {Collection, MongoClient, ObjectId} from 'mongodb';
import {Device, UnclaimedDevice} from '../../proto_out/lightning_vend/model';
import {DeviceCollection} from './deviceCollection';
import {DeviceName} from '../../shared/proto';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('DeviceCollection', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let collection: Collection;
  let deviceCollection: DeviceCollection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    client = new MongoClient(mongoServer.getUri());
    await client.connect();

    collection = client.db().collection('users');

    deviceCollection = await DeviceCollection.create(collection);
  });

  afterEach(async () => {
    await collection.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  const createUnclaimedDevice = async (
    deviceSessionId: string
  ): Promise<UnclaimedDevice> => {
    return await deviceCollection.CreateUnclaimedDevice({
      unclaimedDevice: UnclaimedDevice.create({
        deviceSessionId
      })
    });
  };

  const createDevice = async (
    deviceSessionId: string,
    ownerUserId: ObjectId
  ): Promise<Device> => {
    const unclaimedDevice = await deviceCollection.CreateUnclaimedDevice({
      unclaimedDevice: UnclaimedDevice.create({
        deviceSessionId
      })
    });

    return await deviceCollection.ClaimUnclaimedDevice(
      ClaimUnclaimedDeviceRequest.create({
        parent: `users/${ownerUserId.toString()}`,
        setupCode: unclaimedDevice.setupCode
      })
    );
  };

  describe('GetDevice', () => {
    it('should throw an error if request.name is empty', async () => {
      // A string field not contained in a oneof is an empty string by default.
      const request = GetDeviceRequest.create({});
      await expect(deviceCollection.GetDevice(request)).rejects.toThrow(
        'Name must not be empty.'
      );
    });

    it('should throw an error if request.name has invalid format', async () => {
      const request = GetDeviceRequest.create({ name: 'invalid' });
      await expect(deviceCollection.GetDevice(request))
        .rejects.toThrow('Name must be a valid device name (must be ' +
                         'formatted as `users/{user}/devices/{device}`).');
    });

    it(
      'should throw an error if request.name has a non-object-id user segment',
      async () => {
        const request = GetDeviceRequest.create({
          name: 'users/invalid/devices/507f1f77bcf86cd799439011'
        });
        await expect(deviceCollection.GetDevice(request))
          .rejects.toThrow('Name must be a valid device name (`{user}` ' +
                           'segment in `users/{user}/devices/{device}` must ' +
                           'be a valid MongoDB ObjectId).');
      }
    );

    it(
      'should throw an error if request.name has a non-object-id device ' +
      'segment',
      async () => {
        const request = GetDeviceRequest.create({
          name: 'users/507f1f77bcf86cd799439011/devices/invalid'
        });
        await expect(deviceCollection.GetDevice(request))
          .rejects.toThrow('Name must be a valid device name (`{device}` ' +
                           'segment in `users/{user}/devices/{device}` must ' +
                           'be a valid MongoDB ObjectId).');
      }
    );

    it('should throw an error if device does not exist', async () => {
      const request = GetDeviceRequest.create({
        name: 'users/507f1f77bcf86cd799439011/devices/507f1f77bcf86cd799439011'
      });
      await expect(deviceCollection.GetDevice(request))
        .rejects.toThrow(`Device not found: ${request.name}.`);
    });

    it(
      'should be unable to find device with incorrect user segment in name',
      async () => {
        const _id = new ObjectId();
        const ownerUserId = new ObjectId();

        await collection.insertOne({_id, ownerUserId});

        const deviceName =
          DeviceName.parse(`users/${new ObjectId()}/devices/${_id}`);

        await expect(deviceCollection.GetDevice({
          name: deviceName?.toString() || ''
        }))
          .rejects.toThrow(`Device not found: ${deviceName}.`);
      }
    );

    it(
      'should throw error when attempting to get unclaimed device',
      async () => {
        const _id = new ObjectId();
        const ownerUserId = new ObjectId();

        await collection.insertOne({_id, setupCode: '1234'});

        const deviceName =
          DeviceName.parse(`users/${ownerUserId}/devices/${_id}`);

        await expect(deviceCollection.GetDevice({
          name: deviceName?.toString() || ''
        }))
          .rejects.toThrow(`Device not found: ${deviceName}.`);
      }
    );

    it('should get the correct device', async () => {
      const _id = new ObjectId();
      const ownerUserId = new ObjectId();

      await collection.insertOne({_id, ownerUserId});

      const deviceName =
        DeviceName.parse(`users/${ownerUserId}/devices/${_id}`);

      const device = await deviceCollection.GetDevice({
        name: deviceName?.toString() || ''
      });

      expect(device).toEqual({
        name: deviceName?.toString(),
        createTime: _id.getTimestamp(),
        displayName: '',
        inventory: [],
        nullExecutionCommands: [],
        boolExecutionCommands: []
      });
    });
  });

  describe('ListDevices', () => {
    it('should throw an error if request.parent is empty', async () => {
      // A string field not contained in a oneof is an empty string by default.
      const request = ListDevicesRequest.create({});
      await expect(deviceCollection.ListDevices(request)).rejects.toThrow(
        'Parent must not be empty.'
      );
    });

    it(
      'should throw an error if request.parent has invalid format',
      async () => {
        const request = ListDevicesRequest.create({ parent: 'invalid' });
        await expect(deviceCollection.ListDevices(request))
          .rejects.toThrow('Parent must be a valid user name (must be ' +
                          'formatted as `users/{user}`).');
      }
    );

    it(
      'should throw an error if request.parent has a non-object-id user ' +
      'segment',
      async () => {
        const request = ListDevicesRequest.create({
          parent: 'users/invalid'
        });
        await expect(deviceCollection.ListDevices(request))
          .rejects.toThrow('Parent must be a valid user name (`{user}` ' +
                          'segment in `users/{user}` must be a valid ' +
                          'MongoDB ObjectId).');
      }
    );

    it(
      'should throw an error if request.page_size is invalid',
      async () => {
        const userId = new ObjectId();
        const request = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: -1
        });
        await expect(deviceCollection.ListDevices(request))
          .rejects.toThrow('Page size must be a positive integer.');
      }
    );

    it('should return an empty list if user has no devices', async () => {
      // Create a few unclaimed devices to ensure they are ignored.
      for (let i = 0; i < 10; i++) {
        await createUnclaimedDevice(`unclaimed-device-${i}`);
      }

      // Create a few devices owned by a different user to ensure they are
      // ignored.
      const otherUserId = new ObjectId();
      for (let i = 0; i < 10; i++) {
        await createDevice(`device-${i}`, otherUserId);
      }

      const userId = new ObjectId();
      const request = ListDevicesRequest.create({
        parent: `users/${userId}`
      });
      const response = await deviceCollection.ListDevices(request);
      expect(response).toEqual({
        devices: [],
        nextPageToken: '',
        totalSize: new Long(0)
      });
    });

    it(
      'should return correct response when total size is less than max page ' +
      'size',
      async () => {
        // Create a few unclaimed devices to ensure they are ignored.
        for (let i = 0; i < 10; i++) {
          await createUnclaimedDevice(`unclaimed-device-${i}`);
        }

        // Create a few devices owned by a different user to ensure they are
        // ignored.
        const otherUserId = new ObjectId();
        for (let i = 0; i < 10; i++) {
          await createDevice(`device-${i}`, otherUserId);
        }

        const userId = new ObjectId();

        // Create a few devices owned by the user.
        for (let i = 10; i < 20; i++) {
          await createDevice(`device-${i}`, userId);
        }

        // Set the page size to one more than the number of devices owned by the
        // user.
        const request = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 11
        });
        const response = await deviceCollection.ListDevices(request);
        expect(response.devices.length).toEqual(10);
        // Since this returns all devices owned by the user, there should be no
        // next page token.
        expect(response.nextPageToken).toEqual('');
        expect(response.totalSize).toEqual(new Long(10));
      }
    );

    it(
      'should coerce page size down to reasonable value when total size is ' +
      'greater than max page size',
      async () => {
        const userId = new ObjectId();

        // Create a lot of devices owned by the user.
        for (let i = 0; i < 2500; i++) {
          await createDevice(`device-${i}`, userId);
        }

        // Set the page size to a very large number.
        const request = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 1000000
        });
        const response = await deviceCollection.ListDevices(request);
        // The page size should be coerced down to the max page size.
        expect(response.devices.length).toEqual(1000);
        expect(response.nextPageToken).not.toEqual('');
        expect(response.totalSize).toEqual(new Long(2500));

        // Get the next page to ensure that the page size coercion doesn't
        // affect the ability to reuse the request (any request parameter
        // changes when paging throw an error, but page size coercion doesn't
        // actually change the request itself).
        const request2 = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 1000000,
          pageToken: response.nextPageToken
        });
        const response2 = await deviceCollection.ListDevices(request2);
        expect(response2.devices.length).toEqual(1000);
        expect(response.nextPageToken).not.toEqual('');
        expect(response2.totalSize).toEqual(new Long(2500));
      }
    );

    it(
      'should return correct response when total size is equal to max page ' +
      'size',
      async () => {
        // Create a few unclaimed devices to ensure they are ignored.
        for (let i = 0; i < 10; i++) {
          await createUnclaimedDevice(`unclaimed-device-${i}`);
        }

        // Create a few devices owned by a different user to ensure they are
        // ignored.
        const otherUserId = new ObjectId();
        for (let i = 0; i < 10; i++) {
          await createDevice(`device-${i}`, otherUserId);
        }

        const userId = new ObjectId();

        // Create a few devices owned by the user.
        for (let i = 10; i < 20; i++) {
          await createDevice(`device-${i}`, userId);
        }

        // Set the page size to the exact number of devices owned by the user.
        const request = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 10
        });
        const response = await deviceCollection.ListDevices(request);
        expect(response.devices.length).toEqual(10);
        // Since this returns all devices owned by the user, there should be no
        // next page token.
        expect(response.nextPageToken).toEqual('');
        expect(response.totalSize).toEqual(new Long(10));
      }
    );

    it(
      'should return correct response when total size is less than max page ' +
      'size',
      async () => {
        // Create a few unclaimed devices to ensure they are ignored.
        for (let i = 0; i < 10; i++) {
          await createUnclaimedDevice(`unclaimed-device-${i}`);
        }

        // Create a few devices owned by a different user to ensure they are
        // ignored.
        const otherUserId = new ObjectId();
        for (let i = 0; i < 10; i++) {
          await createDevice(`device-${i}`, otherUserId);
        }

        const userId = new ObjectId();

        // Create a few devices owned by the user.
        for (let i = 10; i < 20; i++) {
          await createDevice(`device-${i}`, userId);
        }

        // Set the page size to one less than the number of devices owned by the
        // user.
        const request = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 9
        });
        const response = await deviceCollection.ListDevices(request);
        expect(response.devices.length).toEqual(9);
        // Since this doesn't return all devices owned by the user, there should
        // be a next page token.
        expect(response.nextPageToken).not.toEqual('');
        expect(response.totalSize).toEqual(new Long(10));

        // Get the next page.
        const request2 = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 9,
          pageToken: response.nextPageToken
        });
        const response2 = await deviceCollection.ListDevices(request2);
        expect(response2.devices.length).toEqual(1);
        // Since this returns the rest of the devices owned by the user, there
        // should be no next page token.
        expect(response2.nextPageToken).toEqual('');
        expect(response2.totalSize).toEqual(new Long(10));
      }
    );

    it(
      'should throw an error when changing request fields other than the ' +
      'page token between pages',
      async () => {
        // Create a few unclaimed devices to ensure they are ignored.
        for (let i = 0; i < 10; i++) {
          await createUnclaimedDevice(`unclaimed-device-${i}`);
        }

        // Create a few devices owned by a different user to ensure they are
        // ignored.
        const otherUserId = new ObjectId();
        for (let i = 0; i < 10; i++) {
          await createDevice(`device-${i}`, otherUserId);
        }

        const userId = new ObjectId();

        // Create a few devices owned by the user.
        for (let i = 10; i < 20; i++) {
          await createDevice(`device-${i}`, userId);
        }

        // Get the first page.
        const request = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 5
        });
        const response = await deviceCollection.ListDevices(request);

        // Get the next page, but change the page size.
        const request2 = ListDevicesRequest.create({
          parent: `users/${userId}`,
          pageSize: 10,
          pageToken: response.nextPageToken
        });
        await expect(deviceCollection.ListDevices(request2)).rejects.toThrow(
          'Invalid page token. Did you change a request parameter other than ' +
          '`pageToken` while paging?'
        );
      }
    );
  });

  describe('UpdateDevice', () => {
    it('should throw an error if request.device is undefined', async () => {
      const request = UpdateDeviceRequest.create({
        device: undefined,
        updateMask: []
      });
      await expect(deviceCollection.UpdateDevice(request)).rejects.toThrow(
        'Device must be defined.'
      );
    });

    it(
      'should throw an error if request.update_mask is undefined',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: Device.create(),
          updateMask: undefined
        });
        await expect(deviceCollection.UpdateDevice(request)).rejects.toThrow(
          'Update mask must be defined.'
        );
      }
    );

    it('should throw an error if request.device.name is empty', async () => {
      const request = UpdateDeviceRequest.create({
        device: Device.create(),
        updateMask: []
      });
      await expect(deviceCollection.UpdateDevice(request)).rejects.toThrow(
        'Device name must not be empty.'
      );
    });

    it(
      'should throw an error if request.device.name has a non-object-id user ' +
      'segment',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: {
            name: 'users/invalid/devices/507f1f77bcf86cd799439011'
          },
          updateMask: []
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow('Device name must be valid (`{user}` segment in ' +
                           '`users/{user}/devices/{device}` must be a valid ' +
                           'MongoDB ObjectId).');
      }
    );

    it(
      'should throw an error if request.device.name has a non-object-id ' +
      'device segment',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: {
            name: 'users/507f1f77bcf86cd799439011/devices/invalid'
          },
          updateMask: []
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow('Device name must be valid (`{device}` segment in ' +
                           '`users/{user}/devices/{device}` must be a valid ' +
                           'MongoDB ObjectId).');
      }
    );

    it(
      'should throw an error when request.update_mask is an empty array',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: {
            name: `users/${new ObjectId()}/devices/${new ObjectId()}`
          },
          updateMask: []
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow(
            'Update mask must contain at least one valid field.'
          );
      }
    );

    it(
      'should throw an error when request.update_mask contains an empty string',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: {
            name: `users/${new ObjectId()}/devices/${new ObjectId()}`
          },
          updateMask: ['']
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow('Update mask paths must not be empty.');
      }
    );

    it(
      'should throw an error when request.update_mask attempts a full ' +
      'replacement',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: {
            name: `users/${new ObjectId()}/devices/${new ObjectId()}`
          },
          updateMask: ['*']
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow('Full replacement is not yet implemented.');
      }
    );

    it(
      'should throw an error when request.update_mask contains no valid fields',
      async () => {
        const request = UpdateDeviceRequest.create({
          device: {
            name: `users/${new ObjectId()}/devices/${new ObjectId()}`,
            // Let's set an updateable field to ensure that it is not updated.
            displayName: 'New Display Name'
          },
          updateMask: ['foo', 'bar']
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow('Update mask must contain at least one valid ' +
                           'field.');
      }
    );

    it(
      'should throw an error when updating a device that does not exist',
      async () => {
        const deviceName = `users/${new ObjectId()}/devices/${new ObjectId()}`;
        const request = UpdateDeviceRequest.create({
          device: {
            name: deviceName,
            displayName: 'New Display Name'
          },
          updateMask: ['display_name']
        });
        await expect(deviceCollection.UpdateDevice(request))
          .rejects.toThrow(`Failed to update device with name: ${deviceName}.`);
      }
    );

    it(
      'should set and then unset a single device field successfully',
      async () => {
        const userId = new ObjectId();
        const device = await createDevice('device-1', userId);

        // Can set a single field.
        const response1 = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name,
              displayName: 'New Display Name'
            },
            updateMask: ['display_name']
          })
        );
        expect(response1).toEqual({...device, displayName: 'New Display Name'});

        // Can unset a single field.
        const response2 = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name
            },
            updateMask: ['display_name']
          })
        );
        expect(response2).toEqual({...device, displayName: ''});
      }
    );

    it(
      'should set and then unset multiple device fields successfully',
      async () => {
        const userId = new ObjectId();
        const device = await createDevice('device-1', userId);

        // Can set multiple fields.
        const response1 = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name,
              nullExecutionCommands: ['null-command-1', 'null-command-2'],
              boolExecutionCommands: ['bool-command-1', 'bool-command-2']
            },
            updateMask: ['null_execution_commands', 'bool_execution_commands']
          })
        );
        expect(response1).toEqual({
          ...device,
          nullExecutionCommands: ['null-command-1', 'null-command-2'],
          boolExecutionCommands: ['bool-command-1', 'bool-command-2']
        });

        // Can unset multiple fields.
        const response2 = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name
            },
            updateMask: ['null_execution_commands', 'bool_execution_commands']
          })
        );
        expect(response2).toEqual({
          ...device,
          nullExecutionCommands: [],
          boolExecutionCommands: []
        });
      }
    );

    it(
      'should successfully set and unset device fields simultaneously',
      async () => {
        const userId = new ObjectId();
        const device = await createDevice('device-1', userId);

        // Set initial field (so that we can unset it in the next request).
        const response1 = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name,
              nullExecutionCommands: ['null-command-1', 'null-command-2']
            },
            updateMask: ['null_execution_commands']
          })
        );
        expect(response1).toEqual({
          ...device,
          nullExecutionCommands: ['null-command-1', 'null-command-2'],
          boolExecutionCommands: []
        });

        // Can set and unset different fields simultaneously.
        const response2 = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name,
              boolExecutionCommands: ['bool-command-1', 'bool-command-2']
            },
            updateMask: ['null_execution_commands', 'bool_execution_commands']
          })
        );
        expect(response2).toEqual({
          ...device,
          nullExecutionCommands: [],
          boolExecutionCommands: ['bool-command-1', 'bool-command-2']
        });
      }
    );

    it(
      'should ignore fields not present in update_mask',
      async () => {
        const userId = new ObjectId();
        const device = await createDevice('device-1', userId);

        // Bool execution commands are not updated because the field is not
        // present in the update mask.
        const response = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name,
              nullExecutionCommands: ['null-command-1', 'null-command-2'],
              boolExecutionCommands: ['bool-command-1', 'bool-command-2']
            },
            updateMask: ['null_execution_commands']
          })
        );
        expect(response).toEqual({
          ...device,
          nullExecutionCommands: ['null-command-1', 'null-command-2']
        });
      }
    );

    it(
      'should ignore fields in update_mask that do not exist on the device',
      async () => {
        const userId = new ObjectId();
        const device = await createDevice('device-1', userId);

        // Bool execution commands are not updated because the field is not
        // present in the update mask.
        const response = await deviceCollection.UpdateDevice(
          UpdateDeviceRequest.create({
            device: {
              name: device.name,
              nullExecutionCommands: ['null-command-1', 'null-command-2']
            },
            updateMask: ['null_execution_commands', 'foo', 'bar']
          })
        );
        expect(response).toEqual({
          ...device,
          nullExecutionCommands: ['null-command-1', 'null-command-2']
        });
      }
    );
  });

  describe('CreateUnclaimedDevice', () => {
    // TODO - Test this method.
  });

  describe('ClaimUnclaimedDevice', () => {
    // TODO - Test this method.
  });

  describe('UnclaimDevice', () => {
    // TODO - Test this method.
  });

  describe('GetDeviceByDeviceSessionId', () => {
    // TODO - Test this method.
  });

  describe('GetUnclaimedDeviceByDeviceSessionId', () => {
    // TODO - Test this method.
  });

  describe('GetDeviceSessionId', () => {
    // TODO - Test this method.
  });
});
