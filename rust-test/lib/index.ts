import {AddInvoiceResponse} from '../../proto/lnd/lnrpc/lightning';

const rsLib = require('../native');

export const init = async (): Promise<undefined> => {
  return rsLib.init();
};

export const addInvoice = async (
  valueSats: number,
  expirySeconds: number
): Promise<AddInvoiceResponse> => {
  return AddInvoiceResponse.fromJSON(JSON.parse(await rsLib.addInvoice(valueSats, expirySeconds)));
};
