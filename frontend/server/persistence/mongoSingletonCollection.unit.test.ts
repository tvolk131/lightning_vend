import {Collection, MongoClient} from 'mongodb';
import {
  LNDInvoiceSubscriptionSingletonCollection,
  MongoSingletonCollection
} from './mongoSingletonCollection';
import Long from 'long';
import {MongoMemoryServer} from 'mongodb-memory-server';

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

describe('MongoSingletonCollection', () => {
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

// Since LNDInvoiceSubscriptionSingletonCollection is a wrapper around
// MongoSingletonCollection, we only need to test the additional functionality
// which is mainly the serialization and deserialization of the
// InvoiceSubscription object.
describe('LNDInvoiceSubscriptionSingletonCollection', () => {
  it('should return undefined when collection is empty', async () => {
    const singleton = new LNDInvoiceSubscriptionSingletonCollection(collection);
    const result = await singleton.get();
    expect(result).toBeUndefined();
  });

  it('should set and get a singleton', async () => {
    const singleton = new LNDInvoiceSubscriptionSingletonCollection(collection);

    await singleton.set({
      addIndex: new Long(1234),
      settleIndex: new Long(5678)
    });
    let result = await singleton.get();
    expect(result).toEqual({
      addIndex: new Long(1234),
      settleIndex: new Long(5678)
    });
  });
});
