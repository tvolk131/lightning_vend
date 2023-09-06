import {Collection, MongoClient} from 'mongodb';
import {InvoiceSubscription} from '../../proto_out/lnd/lnrpc/lightning';
import {
  LNDInvoiceSubscriptionCollection
} from './lndInvoiceSubscriptionCollection';
import Long from 'long';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('LNDInvoiceSubscriptionSingletonCollection', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let collection: Collection<InvoiceSubscription>;

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
    const lndInvoiceSubscriptionCollection =
      await LNDInvoiceSubscriptionCollection.create(collection);
    const result = await lndInvoiceSubscriptionCollection.get();
    expect(result).toBeUndefined();
  });

  it('should set and get a subscription', async () => {
    const lndInvoiceSubscriptionCollection =
      await LNDInvoiceSubscriptionCollection.create(collection);

    await lndInvoiceSubscriptionCollection.set({
      addIndex: new Long(1234),
      settleIndex: new Long(5678)
    });
    let result = await lndInvoiceSubscriptionCollection.get();
    expect(result).toEqual({
      addIndex: new Long(1234),
      settleIndex: new Long(5678)
    });
  });
});
