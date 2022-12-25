export async function getInvoice(): Promise<string> {
  return await invoke('get_invoice');
}

export async function onInvoicePaid(callback: (invoice: string) => void) {
  return await listen('on_invoice_paid', (event) => {
    callback(event.payload as string);
  });
};