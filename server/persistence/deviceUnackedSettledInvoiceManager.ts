import {DeviceName} from '../../shared/proto';

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
export class DeviceUnackedSettledInvoiceManager {
  private events: SettledDeviceInvoice[] = [];

  /**
   * Stores a reference to a settled invoice and the device it was issued to.
   * This should be called *after* the underlying Lightning node informs us that
   * the invoice is settled and *before* we record that the invoice settle event
   * from the underlying Lightning node has been processed (through, for
   * example, incrementing InvoiceSubscription.settle_index if using LND).
   * @param deviceName The device that the invoice was issued to.
   * @param invoicePaymentRequest The invoice that was settled.
   */
  public addUnackedSettledInvoice(
    deviceName: DeviceName,
    invoicePaymentRequest: string
  ): void {
    this.events.push({
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
    return this.events
      .filter((event) => event.deviceName.equals(deviceName))
      .map((event) => event.invoicePaymentRequest);
  }

  /**
   * Deletes a reference to a settled invoice. This should be called after the
   * device has received and acked the invoice settle event.
   * @param invoicePaymentRequest The settled invoice that was acked.
   * @returns Whether the event was deleted.
   */
  public ackAndDeleteSettledInvoice(invoicePaymentRequest: string): boolean {
    const currentEventCount = this.events.length;
    this.events = this.events.filter(
      (event) => event.invoicePaymentRequest !== invoicePaymentRequest
    );
    return this.events.length < currentEventCount;
  }
}

interface SettledDeviceInvoice {
  deviceName: DeviceName;
  invoicePaymentRequest: string;
}
