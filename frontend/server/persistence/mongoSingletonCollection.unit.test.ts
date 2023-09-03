import {Collection, MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoSingletonCollection} from './mongoSingletonCollection';

describe('MongoSingletonCollection', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let collection: Collection;

  beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    await mongoServer.start();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    collection = client.db('test').collection('singleton');
  });

  beforeEach(async () => {
    await collection.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  it('should return undefined when collection is empty', async () => {
    const singleton = new MongoSingletonCollection<{key: string}>(
      collection,
      (data) => ({ key: data.key }),
      (doc) => ({ key: doc.key })
    );
    const result = await singleton.get();
    expect(result).toBeUndefined();
  });

  it('should set and get a singleton', async () => {
    const singleton = new MongoSingletonCollection<{key: string}>(
      collection,
      (data) => ({ key: data.key }),
      (doc) => ({ key: doc.key })
    );

    await singleton.set({ key: 'value1' });
    let result = await singleton.get();
    expect(result).toEqual({ key: 'value1' });

    await singleton.set({ key: 'value2' });
    result = await singleton.get();
    expect(result).toEqual({ key: 'value2' });
  });
});
