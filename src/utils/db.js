const DB_NAME = 'sms_db';
const STORE_NAME = 'keyval_store';
const VERSION = 1;

let dbPromise = null;

const initDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, VERSION);

            request.onerror = (event) => reject(event.target.error);

            request.onsuccess = (event) => resolve(event.target.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }
    return dbPromise;
};

export const idbStore = {
    async get(key) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async set(key, val) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(val, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async remove(key) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async keys() {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStorage = async (key, defaultVal) => {
    const data = await idbStore.get(key);
    return data !== undefined ? data : defaultVal;
};

export const setStorage = async (key, val) => {
    await idbStore.set(key, val);
};
