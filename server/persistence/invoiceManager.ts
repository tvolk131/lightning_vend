import {Invoice, decode} from '@node-lightning/invoice';
import {
  Invoice as LNDInvoice,
  LightningClientImpl
} from '../../proto_out/lnd/lnrpc/lightning';
import {DeviceName} from '../../shared/proto';

export class InvoiceManager {
  // TODO - Persist this in a MongoDB collection and use
  // a TTL to automatically clean up expired invoices.
  private invoicesToDeviceNames: Map<string, DeviceName> = new Map();
  private lightning: LightningClientImpl;
  private intervalRef: NodeJS.Timer | undefined;

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
