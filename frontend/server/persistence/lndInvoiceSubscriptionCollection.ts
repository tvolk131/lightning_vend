import {Collection, UpdateFilter} from 'mongodb';
import {InvoiceSubscription} from '../../proto_out/lnd/lnrpc/lightning';
import Long from 'long';

/**
 * A wrapper around a MongoDB collection that stores LND invoice subscription
 * data. This is used to ensure that we do not miss any invoices when the server
 * crashes or restarts.
 */
export class LNDInvoiceSubscriptionCollection {
  private collection: Collection<InvoiceSubscription>;

  public static async create(
    collection: Collection<InvoiceSubscription>
  ): Promise<LNDInvoiceSubscriptionCollection> {
    const lndInvoiceSubscriptionCollection =
      new LNDInvoiceSubscriptionCollection(collection);
    await lndInvoiceSubscriptionCollection.initializeIndexes();
    return lndInvoiceSubscriptionCollection;
  }

  private constructor(collection: Collection<InvoiceSubscription>) {
    this.collection = collection;
  }

  private async initializeIndexes(): Promise<void> {
    // Ensure that the collection only contains one document per pubkey.
    await this.collection.createIndex({pubkey: 1}, {unique: true});
  }

  /**
   * Retrieve the latest LND invoice subscription from the collection for a
   * given node.
   * @param pubkey The pubkey of the node that the invoice subscription is for.
   * @returns The latest LND invoice subscription, or undefined if the
   * collection is empty.
   */
  public async get(pubkey: string): Promise<InvoiceSubscription | undefined> {
    const doc = await this.collection.findOne({pubkey});

    if (doc) {
      return InvoiceSubscription.fromJSON(doc);
    }
  }

  /**
   * Set the LND invoice subscription for a given node. This will perform an
   * upsert, so if the collection is empty, a new document will be inserted. It
   * will also only update the add index and settle index if they are greater
   * than the current values in the collection.
   * @param pubkey The pubkey of the node that the invoice subscription is for.
   * @param invoiceSubscription The invoice subscription to update the
   * collection with.
   */
  public async increment(
    pubkey: string,
    invoiceSubscription: InvoiceSubscription
  ): Promise<void> {
    const updateFilter: UpdateFilter<InvoiceSubscription> = {};
    if (invoiceSubscription.addIndex.gt(0)) {
      updateFilter['$max'] = {addIndex: invoiceSubscription.addIndex};
    }
    if (invoiceSubscription.settleIndex.gt(0)) {
      updateFilter['$max'] = {settleIndex: invoiceSubscription.settleIndex};
    }

    if (Object.keys(updateFilter).length) {
      await this.collection.updateOne(
        {pubkey},
        updateFilter,
        {upsert: true}
      );
    }
  }

  /**
   * Update the add index in the collection. This is used to keep track of the
   * most recent add index that we have seen from the LND invoice subscription.
   * If the add index is greater than the current add index in the collection,
   * the add index in the collection is updated. Otherwise it is left unchanged.
   * @param pubkey The pubkey of the node that the invoice subscription is for.
   * @param addIndex The add index to update the collection with.
   */
  public async incrementAddIndex(
    pubkey: string,
    addIndex: Long
  ): Promise<void> {
    await this.increment(pubkey, InvoiceSubscription.create({addIndex}));
  }

  /**
   * Update the settle index in the collection. This is used to keep track of
   * the most recent settle index that we have seen from the LND invoice
   * subscription. If the settle index is greater than the current settle index
   * in the collection, the settle index in the collection is updated. Otherwise
   * it is left unchanged.
   * @param pubkey The pubkey of the node that the invoice subscription is for.
   * @param settleIndex The settle index to update the collection with.
   */
  public async incrementSettleIndex(
    pubkey: string,
    settleIndex: Long
  ): Promise<void> {
    await this.increment(pubkey, InvoiceSubscription.create({settleIndex}));
  }
}
