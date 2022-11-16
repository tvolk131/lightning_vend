export {};

declare global {
  interface Window {
    __TAURI__: any;
  }
}

const {invoke} = window.__TAURI__.tauri;

export async function getInvoice(): Promise<string> {
  return await invoke('get_invoice');
}