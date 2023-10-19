import {Collection, MongoClient, ObjectId} from 'mongodb';
import {
  GetOrCreateUserByAuthIdRequest,
  GetUserRequest,
  UpdateUserRequest
} from '../../proto_out/lightning_vend/user_service';
import {User, User_AuthId} from '../../proto_out/lightning_vend/model';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {UserCollection} from './userCollection';
import {UserName} from '../../shared/proto';

describe('UserCollection', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let collection: Collection;
  let userCollection: UserCollection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    client = new MongoClient(mongoServer.getUri());
    await client.connect();

    collection = client.db().collection('users');

    userCollection = await UserCollection.create(collection);
  });

  afterEach(async () => {
    await collection.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  const createUser = async (lightningNodePubkey: string): Promise<User> => {
    return await userCollection.GetOrCreateUserByAuthId({
      user: User.create({
        authId: User_AuthId.create({lightningNodePubkey})
      })
    });
  };

  describe('GetOrCreateUserByAuthId', () => {
    it('should throw an error if request.user is undefined', async () => {
      const request = GetOrCreateUserByAuthIdRequest.create({});

      await expect(
        userCollection.GetOrCreateUserByAuthId(request)
      ).rejects.toThrow('User must not be empty.');
    });

    it(
      'should throw an error if request.user.auth_id is undefined',
      async () => {
        const request = GetOrCreateUserByAuthIdRequest.create({
          user: User.create({})
        });

        await expect(
          userCollection.GetOrCreateUserByAuthId(request)
        ).rejects.toThrow('User.auth_id must not be empty.');
      }
    );

    it(
      'should throw an error if request.user.auth_id.lightning_node_pubkey ' +
      'is undefined',
      async () => {
        const request = GetOrCreateUserByAuthIdRequest.create({
          user: User.create({
            authId: User_AuthId.create({})
          })
        });

        await expect(
          userCollection.GetOrCreateUserByAuthId(request)
        ).rejects.toThrow(
          'User.auth_id.lightning_node_pubkey must not be empty.'
        );
      }
    );

    it(
      'should throw an error if request.user.auth_id.lightning_node_pubkey ' +
      'is an empty string',
      async () => {
        const request = GetOrCreateUserByAuthIdRequest.create({
          user: User.create({
            authId: User_AuthId.create({
              lightningNodePubkey: ''
            })
          })
        });

        await expect(
          userCollection.GetOrCreateUserByAuthId(request)
        ).rejects.toThrow(
          'User.auth_id.lightning_node_pubkey must not be empty.'
        );
      }
    );

    it('creates valid users with empty fields', async () => {
      const request = GetOrCreateUserByAuthIdRequest.create({
        user: User.create({
          authId: User_AuthId.create({
            lightningNodePubkey: '1234'
          })
        })
      });

      const user = await userCollection.GetOrCreateUserByAuthId(request);
      expect(UserName.parse(user.name)).toBeDefined();
      expect(user.createTime).toBeDefined();
      expect(user.updateTime).toBeDefined();
      // Create time and update time should be the same for a newly created
      // user.
      expect(user.updateTime).toEqual(user.createTime);
      expect(user.authId).toEqual(request.user?.authId);

      delete user.createTime;
      delete user.updateTime;
      expect(user).toEqual({
        name: user.name,
        authId: {
          lightningNodePubkey: '1234'
        },
        lnbitsUserId: ''
      });
    });

    it('creates valid users with preset fields', async () => {
      const request = GetOrCreateUserByAuthIdRequest.create({
        user: User.create({
          authId: User_AuthId.create({
            lightningNodePubkey: '1234'
          }),
          lnbitsUserId: 'userId'
        })
      });

      const user = await userCollection.GetOrCreateUserByAuthId(request);
      expect(UserName.parse(user.name)).toBeDefined();
      expect(user.createTime).toBeDefined();
      expect(user.updateTime).toBeDefined();
      // Create time and update time should be the same for a newly created
      // user.
      expect(user.updateTime).toEqual(user.createTime);
      expect(user.authId).toEqual(request.user?.authId);

      delete user.createTime;
      delete user.updateTime;
      expect(user).toEqual({
        name: user.name,
        authId: {
          lightningNodePubkey: '1234'
        },
        lnbitsUserId: 'userId'
      });
    });

    it(
      'can be called repeatedly with the same request and will return the ' +
      'same user',
      async () => {
        // Get-or-create behavior means that the same user should be returned
        // when called repeatedly with the same auth ID.
        const request1 = GetOrCreateUserByAuthIdRequest.create({
          user: User.create({
            authId: User_AuthId.create({
              lightningNodePubkey: '1234'
            })
          })
        });
        const user1 = await userCollection.GetOrCreateUserByAuthId(request1);
        const user2 = await userCollection.GetOrCreateUserByAuthId(request1);
        expect(user1).toEqual(user2);

        // Different auth ID should return a different user.
        const request2 = GetOrCreateUserByAuthIdRequest.create({
          user: User.create({
            authId: User_AuthId.create({
              lightningNodePubkey: '5678'
            })
          })
        });
        const user3 = await userCollection.GetOrCreateUserByAuthId(request2);
        expect(user3.name).not.toEqual(user2.name);
      }
    );

    it('creates correct document in the database', async () => {
      const request = GetOrCreateUserByAuthIdRequest.create({
        user: User.create({
          authId: User_AuthId.create({
            lightningNodePubkey: '1234'
          })
        })
      });

      // Sanity check.
      expect(await collection.countDocuments()).toEqual(0);

      // Call twice to ensure that the document is only created once.
      const user = await userCollection.GetOrCreateUserByAuthId(request);
      await userCollection.GetOrCreateUserByAuthId(request);

      expect(await collection.countDocuments()).toEqual(1);

      const doc = await collection.findOne({});
      expect(doc).toEqual({
        _id: new ObjectId(UserName.parse(user.name)?.getUserSegment()),
        lightningNodePubkey: '1234'
      });
    });
  });

  describe('GetUser', () => {
    it('should throw an error if request.name is empty', async () => {
      // A string field not contained in a oneof is an empty string by default.
      const request = GetUserRequest.create({});
      await expect(userCollection.GetUser(request))
        .rejects.toThrow('Name must not be empty.');
    });

    it('should throw an error if request.name has invalid format', async () => {
      const request = GetUserRequest.create({ name: 'invalid' });
      await expect(userCollection.GetUser(request))
        .rejects.toThrow('Name must be a valid user name (must be formatted ' +
                         'as `users/{user}`).');
    });

    it(
      'should throw an error if request.name has a non-object-id user segment',
      async () => {
        const request = GetUserRequest.create({ name: 'users/invalid' });
        await expect(userCollection.GetUser(request))
          .rejects.toThrow('Name must be a valid user name (`{user}` segment ' +
                           'in `users/{user}` must be a valid MongoDB ' +
                           'ObjectId).');
      }
    );

    it('should throw an error if user does not exist', async () => {
      const request = GetUserRequest.create({
        name: 'users/507f1f77bcf86cd799439011'
      });

      await expect(userCollection.GetUser(request))
        .rejects.toThrow('User not found: users/507f1f77bcf86cd799439011.');
    });

    it('should get a user by name', async () => {
      const request: GetUserRequest = {
        name: 'users/507f1f77bcf86cd799439011'
      };

      await collection.insertOne({
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        lightningNodePubkey: 'pubkey',
        updateTime: new Date(1405490340000),
        lnbitsUserId: 'userId'
      });

      const user = await userCollection.GetUser(request);
      expect(user).toEqual({
        name: 'users/507f1f77bcf86cd799439011',
        createTime: new Date(
          new ObjectId('507f1f77bcf86cd799439011').getTimestamp()
        ),
        updateTime: new Date(
          new Date(1405490340000)
        ),
        authId: {
          lightningNodePubkey: 'pubkey'
        },
        lnbitsUserId: 'userId'
      });
    });
  });

  describe('UpdateUser', () => {
    it('should throw an error if request.user is undefined', async () => {
      const request = UpdateUserRequest.create({
        user: undefined,
        updateMask: []
      });
      await expect(userCollection.UpdateUser(request)).rejects.toThrow(
        'User must be defined.'
      );
    });

    it(
      'should throw an error if request.update_mask is undefined',
      async () => {
        const request = UpdateUserRequest.create({
          user: User.create(),
          updateMask: undefined
        });
        await expect(userCollection.UpdateUser(request)).rejects.toThrow(
          'Update mask must be defined.'
        );
      }
    );

    it('should throw an error if request.user.name is empty', async () => {
      const request = UpdateUserRequest.create({
        user: User.create(),
        updateMask: []
      });
      await expect(userCollection.UpdateUser(request)).rejects.toThrow(
        'User name must not be empty.'
      );
    });

    it(
      'should throw an error if request.user.name has a non-object-id user ' +
      'segment',
      async () => {
        const request = UpdateUserRequest.create({
          user: {
            name: 'users/invalid'
          },
          updateMask: []
        });
        await expect(userCollection.UpdateUser(request))
          .rejects.toThrow('User name must be valid (`{user}` segment in ' +
                           '`users/{user}` must be a valid MongoDB ObjectId).');
      }
    );

    it(
      'should throw an error when request.update_mask is an empty array',
      async () => {
        const request = UpdateUserRequest.create({
          user: {
            name: `users/${new ObjectId()}`
          },
          updateMask: []
        });
        await expect(userCollection.UpdateUser(request))
          .rejects.toThrow(
            'Update mask must contain at least one valid field.'
          );
      }
    );

    it(
      'should throw an error when request.update_mask contains an empty string',
      async () => {
        const request = UpdateUserRequest.create({
          user: {
            name: `users/${new ObjectId()}`
          },
          updateMask: ['']
        });
        await expect(userCollection.UpdateUser(request))
          .rejects.toThrow('Update mask paths must not be empty.');
      }
    );

    it(
      'should throw an error when request.update_mask attempts a full ' +
      'replacement',
      async () => {
        const request = UpdateUserRequest.create({
          user: {
            name: `users/${new ObjectId()}`
          },
          updateMask: ['*']
        });
        await expect(userCollection.UpdateUser(request))
          .rejects.toThrow('Full replacement is not yet implemented.');
      }
    );

    it(
      'should throw an error when request.update_mask contains no valid fields',
      async () => {
        const request = UpdateUserRequest.create({
          user: {
            name: `users/${new ObjectId()}`,
            // Let's set an updateable field to ensure that it is not updated.
            lnbitsUserId: 'newUserId'
          },
          updateMask: ['foo', 'bar']
        });
        await expect(userCollection.UpdateUser(request))
          .rejects.toThrow('Update mask must contain at least one valid ' +
                           'field.');
      }
    );

    it(
      'should throw an error when updating a user that does not exist',
      async () => {
        const userName = `users/${new ObjectId()}`;
        const request = UpdateUserRequest.create({
          user: {
            name: userName,
            lnbitsUserId: 'newUserId'
          },
          updateMask: ['lnbits_user_id']
        });
        await expect(userCollection.UpdateUser(request))
          .rejects.toThrow(`Failed to update user with name: ${userName}.`);
      }
    );

    it(
      'should set and then unset a single user field successfully',
      async () => {
        const user = await createUser('user-1');

        // Wait a few milliseconds to ensure that the update time is different.
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Can set a single field.
        const response1 = await userCollection.UpdateUser(
          UpdateUserRequest.create({
            user: {
              name: user.name,
              lnbitsUserId: 'newUserId'
            },
            updateMask: ['lnbits_user_id']
          })
        );
        expect(response1).toEqual({
          ...user,
          lnbitsUserId: 'newUserId',
          updateTime: response1.updateTime
        });
        expect(response1.updateTime!.getTime()).toBeGreaterThan(user.updateTime!.getTime());

        // Wait a few milliseconds to ensure that the update time is different.
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Can unset a single field.
        const response2 = await userCollection.UpdateUser(
          UpdateUserRequest.create({
            user: {
              name: user.name
            },
            updateMask: ['lnbits_user_id']
          })
        );
        expect(response2).toEqual({
          ...user,
          lnbitsUserId: '',
          updateTime: response2.updateTime
        });
        expect(response2.updateTime!.getTime()).toBeGreaterThan(response1.updateTime!.getTime());
      }
    );

    // TODO - Test setting/unsetting multiple fields simultaneously once there
    // is more than one field to set/unset. See the following tests in
    // deviceCollection.unit.test.ts for examples of how to do this:
    //   'should set and then unset multiple device fields successfully'
    //   'should successfully set and unset device fields simultaneously'
    //   'should ignore fields not present in update_mask'

    it(
      'should ignore fields in update_mask that do not exist on the user',
      async () => {
        const user = await createUser('user-1');

        // Wait a few milliseconds to ensure that the update time is different.
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Bool execution commands are not updated because the field is not
        // present in the update mask.
        const response = await userCollection.UpdateUser(
          UpdateUserRequest.create({
            user: {
              name: user.name,
              lnbitsUserId: 'newUserId'
            },
            updateMask: ['lnbits_user_id', 'foo', 'bar']
          })
        );
        expect(response).toEqual({
          ...user,
          lnbitsUserId: 'newUserId',
          updateTime: response.updateTime
        });
        expect(response.updateTime!.getTime()).toBeGreaterThan(user.updateTime!.getTime());
      }
    );
  });

  it('should be able to create user and then get it by name', async () => {
    const getOrCreateRequest = GetOrCreateUserByAuthIdRequest.create({
      user: User.create({
        authId: User_AuthId.create({
          lightningNodePubkey: '1234'
        })
      })
    });

    // Can get a user by name after creating it.
    const user1 =
      await userCollection.GetOrCreateUserByAuthId(getOrCreateRequest);
    const user2 = await userCollection.GetUser({name: user1.name});
    expect(user1).toEqual(user2);
  });
});
