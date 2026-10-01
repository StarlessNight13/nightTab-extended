const assert = require('node:assert/strict');
const test = require('node:test');
const { createBackgroundImageStorage, imageDataToBlob, getBackgroundImageSource } = require('../src/component/backgroundImageStorage/index.cjs');

const snapshot = (upload, custom = []) => ({
  state: { theme: { background: { image: { upload } }, custom: { all: custom } } },
  bookmark: [{ name: 'Keep my bookmarks' }]
});

const memoryStorage = () => {
  const images = new Map();
  let writes = 0;
  let reads = 0;
  const storage = createBackgroundImageStorage({
    write: async image => {
      const id = 'image-' + ++writes;
      images.set(id, image);
      return id;
    },
    read: async id => {
      reads++;
      return images.get(id);
    },
    remove: async id => images.delete(id)
  });
  return { images, storage, reads: () => reads, writes: () => writes };
};

test('keeps large image bytes out of saved settings and restores the original image', async () => {
  const { storage, reads } = memoryStorage();
  const image = 'data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024);
  const storageId = await storage.save(image);
  const upload = { name: 'large.png', data: image, storageId };
  const original = snapshot(upload, [{ background: { image: { upload: { ...upload } } } }]);
  const saved = storage.serialize(original);

  assert.ok(saved.length < 1000);
  assert.equal(original.state.theme.background.image.upload.data, image);

  const restored = await storage.hydrate(JSON.parse(saved));
  assert.equal(restored.state.theme.background.image.upload.data, image);
  assert.equal(restored.state.theme.custom.all[0].background.image.upload.data, image);
  assert.deepEqual(restored.bookmark, original.bookmark);
  assert.equal(reads(), 1);
});

test('exports portable images and imports them into a different image store', async () => {
  const source = memoryStorage();
  const destination = memoryStorage();
  const image = 'data:image/gif;base64,unchanged-animation';
  const storageId = await source.storage.save(image);
  const original = snapshot({ name: 'animated.gif', data: image, storageId });
  const exported = await source.storage.hydrate(JSON.parse(source.storage.serialize(original)), { portable: true });

  assert.deepEqual(exported.state.theme.background.image.upload, { name: 'animated.gif', data: image });

  await destination.storage.prepare(exported);
  const saved = destination.storage.serialize(exported);
  const restored = await destination.storage.hydrate(JSON.parse(saved));

  assert.equal(restored.state.theme.background.image.upload.data, image);
  assert.equal(destination.images.size, 1);
});

test('imports shared background images once for the active theme and saved themes', async () => {
  const { storage, writes } = memoryStorage();
  const upload = { name: 'shared.png', data: 'data:image/png;base64,shared' };
  const imported = snapshot(upload, [{ background: { image: { upload: { ...upload } } } }]);

  await storage.prepare(imported);

  assert.equal(writes(), 1);
  assert.equal(imported.state.theme.background.image.upload.storageId,
    imported.state.theme.custom.all[0].background.image.upload.storageId);
});

test('retains images referenced by saved themes or backups while removing unused uploads', async () => {
  const { storage, images } = memoryStorage();
  const oldId = await storage.save('data:image/png;base64,old');
  const newId = await storage.save('data:image/png;base64,new');
  const previous = snapshot({ storageId: oldId });
  const current = snapshot({ storageId: newId });
  const withSavedTheme = snapshot({ storageId: newId }, [{ background: { image: { upload: { storageId: oldId } } } }]);

  await storage.releaseUnused(previous, withSavedTheme);
  assert.equal(images.has(oldId), true);

  await storage.releaseUnused(previous, current, previous);
  assert.equal(images.has(oldId), true);

  await storage.releaseUnused(previous, current);
  assert.equal(images.has(oldId), false);
  assert.equal(images.has(newId), true);
});

test('keeps existing embedded background images compatible', async () => {
  const { storage, reads } = memoryStorage();
  const original = snapshot({ name: 'existing.png', data: 'data:image/png;base64,existing' });
  const restored = await storage.hydrate(JSON.parse(storage.serialize(original)));

  assert.deepEqual(restored, original);
  assert.equal(reads(), 0);
  assert.equal(await storage.hydrate(false), false);
});

test('preserves the image source used by older themes without a source setting', () => {
  assert.equal(getBackgroundImageSource({ url: 'https://example.com/background.png' }), 'url');
  assert.equal(getBackgroundImageSource({ upload: { data: '' } }), 'url');
  assert.equal(getBackgroundImageSource({ upload: { data: 'data:image/png;base64,existing' } }), 'upload');
  assert.equal(getBackgroundImageSource({ upload: { data: '', storageId: 'stored-image' } }), 'upload');
});

test('keeps an inactive upload when saving, reloading, and exporting an online image selection', async () => {
  const { storage } = memoryStorage();
  const image = 'data:image/png;base64,stored-background';
  const storageId = await storage.save(image);
  const original = snapshot({ name: 'background.png', data: image, storageId });
  original.state.theme.background.image.source = 'url';
  original.state.theme.background.image.url = 'https://example.com/background.png';

  const restored = await storage.hydrate(JSON.parse(storage.serialize(original)));
  assert.equal(getBackgroundImageSource(restored.state.theme.background.image), 'url');
  assert.equal(restored.state.theme.background.image.upload.data, image);

  const exported = await storage.hydrate(JSON.parse(storage.serialize(restored)), { portable: true });
  const destination = memoryStorage();
  await destination.storage.prepare(exported);
  const imported = await destination.storage.hydrate(JSON.parse(destination.storage.serialize(exported)));
  assert.equal(getBackgroundImageSource(imported.state.theme.background.image), 'url');

  imported.state.theme.background.image.source = 'upload';
  assert.equal(getBackgroundImageSource(imported.state.theme.background.image), 'upload');
  assert.equal(imported.state.theme.background.image.upload.data, image);
});

test('refuses to export a backup with a missing image', async () => {
  const { storage } = memoryStorage();

  await assert.rejects(storage.hydrate(snapshot({ storageId: 'missing' }), { portable: true }), /unavailable/);
});

test('renders stored images through a blob without changing their bytes', async () => {
  const content = Buffer.from([0, 1, 127, 128, 255]);
  const blob = imageDataToBlob('data:image/png;base64,' + content.toString('base64'));

  assert.equal(blob.type, 'image/png');
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), content);

  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Grüße</text></svg>';
  assert.equal(await imageDataToBlob('data:image/svg+xml,' + encodeURIComponent(svg)).text(), svg);
});
