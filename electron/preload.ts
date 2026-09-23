import { contextBridge, ipcRenderer } from 'electron';

// Exponer de forma segura APIs al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openExternal: (url: string) => ipcRenderer.invoke('open-external-url', url),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
});

