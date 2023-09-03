import {Collection, Document, WithId, WithoutId} from 'mongodb';
import {InvoiceSubscription} from '../../proto_out/lnd/lnrpc/lightning';

/**
 * A singleton resource backed by a MongoDB collection. This provides an
 * abstraction over a MongoDB collection that stores every state change as a
 * separate document in the collection, using the MongoDB _id field to store
 * the timestamp of the state change. The most recent state change is considered
 * the current state of the singleton resource. This is useful for storing
 * singleton resources such as a server configuration.
 */
export class MongoSingletonCollection<T> {
  /**
   * The MongoDB collection that stores the singleton resource. Each document in
   * the collection represents a state change to the singleton resource, with
   * the most recent document representing the current state of the singleton
   * resource.
   */
  private collection: Collection;

  /**
   * Function that serializes the singleton resource into a MongoDB document.
   */
  private serializeSingleton: (singleton: T) => WithoutId<Document>;

  /**
   * Function that deserializes a MongoDB document into the singleton resource.
   */
  private deserializeSingleton: (document: WithId<Document>) => T;

  public constructor(
    collection: Collection,
    serializeSingleton: (singleton: T) => WithoutId<Document>,
    deserializeSingleton: (document: WithoutId<Document>) => T
  ) {
    this.collection = collection;
    this.serializeSingleton = serializeSingleton;
    this.deserializeSingleton = deserializeSingleton;
  }

  public async get(): Promise<T | undefined> {
    // Get the most recently created document from the collection.
    const result = await this.collection.findOne({}, {sort: {_id: -1}});

    if (result) {
      return this.deserializeSingleton(result);
    }
  }

  public async set(singleton: T): Promise<void> {
    // Insert the new singleton document.
    await this.collection.insertOne(this.serializeSingleton(singleton));
  }
}

export class LNDInvoiceSubscriptionSingletonCollection {
  private collection: MongoSingletonCollection<InvoiceSubscription>;

  public constructor(collection: Collection) {
    this.collection = new MongoSingletonCollection(
      collection,
      (invoiceSubscription) => invoiceSubscription,
      (doc) => InvoiceSubscription.fromJSON(doc)
    );
  }

  public async get(): Promise<InvoiceSubscription | undefined> {
    return await this.collection.get();
  }

  public async set(invoiceSubscription: InvoiceSubscription): Promise<void> {
    return await this.collection.set(invoiceSubscription);
  }
}
