import {Invoice, decode} from '@node-lightning/invoice';
import {
  Invoice_InvoiceState as InvoiceState,
  InvoiceSubscription,
  Invoice as LNDInvoice,
  LightningClientImpl
} from '../../proto_out/lnd/lnrpc/lightning';
import {DeviceName} from '../../shared/proto';
import { SubscribableEventManager } from '../../client/src/api/sharedApi';

export class InvoiceManager {
  // TODO - Persist this in a MongoDB collection and use
  // a TTL to automatically clean up expired invoices.
  private invoicesToDeviceNames: Map<string, DeviceName> = new Map();
  private lightning: LightningClientImpl;
  private intervalRef: NodeJS.Timer | undefined;
  private invoiceSettlementEventManager =
    new SubscribableEventManager<SettledDeviceInvoice>();

/**
 * Stores records of settled invoices that haven't yet been acked by the devices
 * they were issued to. Once a device has received and acked an invoice settle
 * event, the invoice can be deleted from this manager. This ensures that the
 * device will never miss an invoice settle event, regardless of whether the
 * device or server is offline at the time the invoice is settled. This is
 * important because missing or prematurely discarding an invoice settle event
 * would result in the device never vending a product that was paid for, without
 * any indication of an error.
 * TODO - This should be persisted to disk. Currently it is stored in memory, so
 * it will be lost if the server restarts.
 */
  private unackedSettledInvoices: SettledDeviceInvoice[] = [];

  public constructor(lightning: LightningClientImpl) {
    this.lightning = lightning;

    // Once per minute, flush all expired invoices.
    this.intervalRef = setInterval(() => {
      const invoicesToDelete: string[] = [];
      Array.from(this.invoicesToDeviceNames.entries())
        .forEach(([invoice]) => {
          if (InvoiceManager.isInvoiceExpired(decode(invoice))) {
            invoicesToDelete.push(invoice);
          }
        });

      invoicesToDelete.forEach(invoice => {
        this.invoicesToDeviceNames.delete(invoice);
      });
    }, 60000);

    lightning.SubscribeInvoices(InvoiceSubscription.create())
      .subscribe((invoice) => {
        if (invoice.state === InvoiceState.SETTLED && invoice.paymentRequest) {
          const deviceName =
            this.getInvoiceCreator(invoice.paymentRequest);

          // If we know the device that created the invoice, save it as an
          // unacked settled invoice linked to that device. This will ensure
          // that the device is notified even if it is not connected when the
          // invoice is paid.
          if (deviceName) {
            this.addUnackedSettledInvoice(deviceName, invoice.paymentRequest);

            this.invoiceSettlementEventManager.emitEvent({
              deviceName,
              invoicePaymentRequest: invoice.paymentRequest
            });
          }
        }
      });
  }

  public subscribeToInvoiceSettlements(
    callback: (data: SettledDeviceInvoice) => void
  ): string {
    return this.invoiceSettlementEventManager.subscribe(callback);
  }

  public unsubscribeFromInvoiceSettlements(callbackId: string) {
    return this.invoiceSettlementEventManager.unsubscribe(callbackId);
  }

  public async createInvoice(
    deviceName: DeviceName,
    valueSats: number
  ): Promise<string> {
    const preCreatedInvoice = LNDInvoice.create({
      value: valueSats.toString(),
      expiry: '300' // 300 seconds -> 5 minutes.
    });

    const addInvoiceResponse =
      await this.lightning.AddInvoice(preCreatedInvoice);
    this.invoicesToDeviceNames.set(
      addInvoiceResponse.paymentRequest,
      deviceName
    );
    return addInvoiceResponse.paymentRequest;
  }

  public getInvoiceCreator(invoice: string): DeviceName | undefined {
    return this.invoicesToDeviceNames.get(invoice);
  }

  /**
   * Stores a reference to a settled invoice and the device it was issued to.
   * This should be called *after* the underlying Lightning node informs us that
   * the invoice is settled and *before* we record that the invoice settle event
   * from the underlying Lightning node has been processed (through, for
   * example, incrementing InvoiceSubscription.settle_index if using LND).
   * @param deviceName The device that the invoice was issued to.
   * @param invoicePaymentRequest The invoice that was settled.
   */
  private addUnackedSettledInvoice(
    deviceName: DeviceName,
    invoicePaymentRequest: string
  ): void {
    this.unackedSettledInvoices.push({
      deviceName,
      invoicePaymentRequest
    });
  }

  /**
   * Gets all unacked settled invoices for a specified device.
   * @param deviceName The device to get invoices for.
   * @returns All unacked settled invoices for the specified device.
   */
  public getUnackedSettledInvoicesForDevice(deviceName: DeviceName): string[] {
    return this.unackedSettledInvoices
      .filter((unackedSettledInvoice) =>
        unackedSettledInvoice.deviceName.equals(deviceName))
      .map((unackedSettledInvoice) =>
        unackedSettledInvoice.invoicePaymentRequest);
  }

  /**
   * Deletes a reference to a settled invoice. This should be called after the
   * device has received and acked the invoice settle event.
   * @param invoicePaymentRequest The settled invoice that was acked.
   * @returns Whether the event was deleted.
   */
  public ackAndDeleteSettledInvoice(invoicePaymentRequest: string): boolean {
    const currentEventCount = this.unackedSettledInvoices.length;
    this.unackedSettledInvoices = this.unackedSettledInvoices.filter(
      (unackedSettledInvoice) =>
        unackedSettledInvoice.invoicePaymentRequest !== invoicePaymentRequest
    );
    return this.unackedSettledInvoices.length < currentEventCount;
  }

  public stop() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private static isInvoiceExpired(invoice: Invoice): boolean {
    const now = new Date();
    const createTime = new Date(invoice.timestamp);

    const elapsedSeconds = now.getUTCSeconds() - createTime.getUTCSeconds();
    const secondsRemainingToExpiry = invoice.expiry - elapsedSeconds;

    return secondsRemainingToExpiry < 0;
  }
}

interface SettledDeviceInvoice {
  deviceName: DeviceName;
  invoicePaymentRequest: string;
}
