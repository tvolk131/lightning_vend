export {};

declare global {
  interface Window {
    __TAURI__: any;
  }
}

const {invoke} = window.__TAURI__.tauri;

export async function greet(name: string): Promise<string> {
  return await invoke('greet', {name});
}