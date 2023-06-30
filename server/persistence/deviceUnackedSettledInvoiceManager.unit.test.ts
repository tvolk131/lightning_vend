import {DeviceName} from '../../shared/proto';
import {
  DeviceUnackedSettledInvoiceManager
} from './deviceUnackedSettledInvoiceManager';

describe('DeviceUnackedSettledInvoiceManager', () => {
  let manager: DeviceUnackedSettledInvoiceManager;
  const deviceName1 = DeviceName.parse('users/user1/devices/device1')!;
  const deviceName2 = DeviceName.parse('users/user2/devices/device2')!;
  const invoice1 = 'invoice1';
  const invoice2 = 'invoice2';
  const invoice3 = 'invoice3';

  beforeEach(() => {
    manager = new DeviceUnackedSettledInvoiceManager();
  });

  it('should add an unacked settled invoice', () => {
    manager.addUnackedSettledInvoice(deviceName1, invoice1);
    manager.addUnackedSettledInvoice(deviceName2, invoice2);

    const unackedInvoices1 =
      manager.getUnackedSettledInvoicesForDevice(deviceName1);
    const unackedInvoices2 =
      manager.getUnackedSettledInvoicesForDevice(deviceName2);

    expect(unackedInvoices1).toEqual([invoice1]);
    expect(unackedInvoices2).toEqual([invoice2]);
  });

  it('should return all unacked settled invoices for a device', () => {
    manager.addUnackedSettledInvoice(deviceName1, invoice1);
    manager.addUnackedSettledInvoice(deviceName1, invoice2);
    manager.addUnackedSettledInvoice(deviceName2, invoice3);

    const unackedInvoices1 =
      manager.getUnackedSettledInvoicesForDevice(deviceName1);
    const unackedInvoices2 =
      manager.getUnackedSettledInvoicesForDevice(deviceName2);

    expect(unackedInvoices1).toEqual([invoice1, invoice2]);
    expect(unackedInvoices2).toEqual([invoice3]);
  });

  it('should delete the specified settled invoice', () => {
    manager.addUnackedSettledInvoice(deviceName1, invoice1);
    manager.addUnackedSettledInvoice(deviceName1, invoice2);
    manager.addUnackedSettledInvoice(deviceName2, invoice3);

    const deleted1 = manager.ackAndDeleteSettledInvoice(invoice1);
    const deleted2 = manager.ackAndDeleteSettledInvoice(invoice2);
    const deleted3 = manager.ackAndDeleteSettledInvoice(invoice3);
    const unackedInvoices1 =
      manager.getUnackedSettledInvoicesForDevice(deviceName1);
    const unackedInvoices2 =
      manager.getUnackedSettledInvoicesForDevice(deviceName2);

    expect(deleted1).toBe(true);
    expect(deleted2).toBe(true);
    expect(deleted3).toBe(true);
    expect(unackedInvoices1).toEqual([]);
    expect(unackedInvoices2).toEqual([]);
  });

  it(
    'should return false if the specified settled invoice does not exist',
    () => {
      manager.addUnackedSettledInvoice(deviceName1, invoice1);

      const deleted = manager.ackAndDeleteSettledInvoice('nonexistent-invoice');

      expect(deleted).toBe(false);
    }
  );
});
