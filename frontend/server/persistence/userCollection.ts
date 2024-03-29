import {Collection, ObjectId, WithId} from 'mongodb';
import {
  GetOrCreateUserByAuthIdRequest,
  GetUserRequest,
  UserService
} from '../../proto_out/lightning_vend/user_service';
import {User, User_AuthId} from '../../proto_out/lightning_vend/model';
import {UserName} from '../../shared/proto';

interface UserCollectionSchema {
  lightningNodePubkey?: string;
}

const userCollecionDocumentToProto = (
  document: WithId<UserCollectionSchema>
): User => {
  const userName = UserName.parse(`users/${document._id.toString()}`);

  return User.create({
    name: userName ? userName.toString() : '',
    createTime: document._id.getTimestamp(),
    // We're currently not tracking the last time a user was updated since there
    // is no way to update a user. Because of this, we just use the create time
    // as the update time.
    updateTime: document._id.getTimestamp(),
    authId: User_AuthId.create({
      lightningNodePubkey: document.lightningNodePubkey
    })
  });
};

export class UserCollection implements UserService {
  private collection: Collection<UserCollectionSchema>;

  public static async create(collection: Collection<UserCollectionSchema>) {
    const userCollection = new UserCollection(collection);
    await userCollection.initializeIndexes();
    return userCollection;
  }

  private constructor(collection: Collection<UserCollectionSchema>) {
    this.collection = collection;
  }

  private async initializeIndexes(): Promise<void> {
    // Ensures quick lookup of users by their lightning node pubkey. Also
    // ensures that no two users have the same lightning node pubkey.
    await this.collection.createIndex(
      {lightningNodePubkey: 1},
      {
        // Ensure that no two users have the same lightningNodePubkey.
        unique: true,
        // Only apply the uniqueness constraint to documents that have a
        // lightningNodePubkey field. This allows us to have users that don't
        // have a lightningNodePubkey associated with them.
        partialFilterExpression: {lightningNodePubkey: {$exists: true}}
      }
    );
  }

  public async GetOrCreateUserByAuthId(
    request: GetOrCreateUserByAuthIdRequest
  ): Promise<User> {
    // -------------------
    // Request validation.
    // -------------------

    if (request.user === undefined) {
      throw new Error('User must not be empty.');
    }
    if (request.user.authId === undefined) {
      throw new Error('User.auth_id must not be empty.');
    }

    const lightningNodePubkey = request.user.authId.lightningNodePubkey;

    if (lightningNodePubkey === undefined || lightningNodePubkey === '') {
      throw new Error('User.auth_id.lightning_node_pubkey must not be empty.');
    }

    // ----------------
    // Query execution.
    // ----------------

    const result = await this.collection.findOneAndUpdate(
      {lightningNodePubkey},
      {$setOnInsert: {lightningNodePubkey}},
      {upsert: true, returnDocument: 'after'}
    );

    if (!result.ok || !result.value) {
      throw new Error('Failed to get or create user with lightning node ' +
                      `pubkey ${lightningNodePubkey}.`);
    }

    // -----------------
    // Response packing.
    // -----------------

    return userCollecionDocumentToProto(result.value);
  }

  public async GetUser(request: GetUserRequest): Promise<User> {
    if (request.name === undefined || request.name === '') {
      throw new Error('Name must not be empty.');
    }

    const userName = UserName.parse(request.name);
    if (userName === undefined) {
      throw new Error('Name must be a valid user name (must be formatted as ' +
                      '`users/{user}`).'
      );
    }

    let userId;
    try {
      userId = new ObjectId(userName.getUserSegment());
    } catch (err) {
      throw new Error('Name must be a valid user name (`{user}` segment in ' +
                      '`users/{user}` must be a valid MongoDB ObjectId).'
      );
    }

    const res = await this.collection.findOne({
      _id: userId
    });

    if (!res) {
      throw new Error(`User not found: ${request.name}.`);
    }

    return userCollecionDocumentToProto(res);
  }
}
