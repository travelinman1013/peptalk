import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const DB_NAME = "peptalk-query-cache";
const STORE_NAME = "cache";
const KEY = "react-query";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txn(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  });
}

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const store = await txn("readwrite");
      store.put(client, KEY);
    },
    restoreClient: async () => {
      const store = await txn("readonly");
      return new Promise<PersistedClient | undefined>((resolve) => {
        const request = store.get(KEY);
        request.onsuccess = () => resolve(request.result ?? undefined);
        request.onerror = () => resolve(undefined);
      });
    },
    removeClient: async () => {
      const store = await txn("readwrite");
      store.delete(KEY);
    },
  };
}
