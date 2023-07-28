import {Collection, MongoClient, ObjectId} from 'mongodb';
import {
  GetOrCreateUserByAuthIdRequest,
  GetUserRequest
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

    it('creates valid users', async () => {
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
      expect(user.updateTime).toEqual(user.createTime);
      expect(user.authId).toEqual(request.user?.authId);
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
        lightningNodePubkey: 'pubkey'
      });

      const user = await userCollection.GetUser(request);
      expect(user).toEqual({
        name: 'users/507f1f77bcf86cd799439011',
        createTime: new Date(
          new ObjectId('507f1f77bcf86cd799439011').getTimestamp()
        ),
        updateTime: new Date(
          new ObjectId('507f1f77bcf86cd799439011').getTimestamp()
        ),
        authId: {
          lightningNodePubkey: 'pubkey'
        }
      });
    });
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
