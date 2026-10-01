const backgroundImageUploadLimit = 20 * 1024 * 1024;

const getBackgroundImageSource = image => {
  if (image && (image.source === 'url' || image.source === 'upload')) {
    return image.source;
  }

  const upload = image && image.upload;

  // Older themes selected an upload whenever one was present.
  return upload && (upload.storageId || (typeof upload.data === 'string' && upload.data.trim()))
    ? 'upload'
    : 'url';
};

const imageDataToBlob = image => {
  const comma = image.indexOf(',');
  const metadata = image.slice(5, comma);
  const content = image.slice(comma + 1);
  const type = metadata.split(';')[0];
  let bytes;

  if (metadata.endsWith(';base64')) {
    const decoded = atob(content);
    bytes = new Uint8Array(decoded.length);

    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
  } else {
    bytes = decodeURIComponent(content);
  }

  return new Blob([bytes], { type });
};

const uploadsIn = (snapshot) => {
  const theme = snapshot && snapshot.state && snapshot.state.theme;

  if (!theme) {
    return [];
  }

  return [theme, ...((theme.custom && theme.custom.all) || [])]
    .map(item => item.background && item.background.image && item.background.image.upload)
    .filter(Boolean);
};

const createBackgroundImageStorage = (store) => ({
  save: image => store.write(image),
  remove: id => store.remove(id),
  serialize: snapshot => JSON.stringify(snapshot, (key, value) => {
    if (key === 'upload' && value && value.storageId) {
      return { ...value, data: '' };
    }

    return value;
  }),
  hydrate: async (snapshot, { portable = false } = {}) => {
    const images = new Map();

    await Promise.all(uploadsIn(snapshot).map(async upload => {
      if (upload.storageId) {
        if (!images.has(upload.storageId)) {
          images.set(upload.storageId, store.read(upload.storageId));
        }

        const image = await images.get(upload.storageId);

        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
          throw new Error('Uploaded background image is unavailable');
        }

        upload.data = image;

        if (portable) {
          delete upload.storageId;
        }
      }
    }));

    return snapshot;
  },
  prepare: async snapshot => {
    const images = new Map();

    for (const upload of uploadsIn(snapshot)) {
      if (typeof upload.data === 'string' && upload.data.startsWith('data:image/')) {
        if (!images.has(upload.data)) {
          images.set(upload.data, await store.write(upload.data));
        }

        upload.storageId = images.get(upload.data);
      }
    }

    return snapshot;
  },
  releaseUnused: async (previous, ...retained) => {
    const keep = new Set(retained.flatMap(uploadsIn).map(upload => upload.storageId));
    const remove = new Set(uploadsIn(previous).map(upload => upload.storageId)
      .filter(id => id && !keep.has(id)));

    await Promise.all([...remove].map(id => store.remove(id)));
  }
});

let databasePromise;

const database = () => {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      // Keep this database name stable so existing uploaded backgrounds remain available.
      const request = globalThis.indexedDB.open('nightTabBackgroundImages', 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore('images');
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          databasePromise = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    }).catch(error => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
};

const transaction = async (mode, action) => {
  const db = await database();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', mode);
    const request = action(tx.objectStore('images'));

    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error || request.error);
    tx.onabort = () => reject(tx.error || new Error('Background image storage was interrupted'));
  });
};

const backgroundImageStorage = createBackgroundImageStorage({
  write: async image => {
    const id = globalThis.crypto.randomUUID();
    await transaction('readwrite', store => store.put(image, id));
    return id;
  },
  read: id => transaction('readonly', store => store.get(id)),
  remove: id => transaction('readwrite', store => store.delete(id))
});

module.exports = { backgroundImageStorage, backgroundImageUploadLimit, createBackgroundImageStorage, imageDataToBlob, getBackgroundImageSource };
