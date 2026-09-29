const assert = require('node:assert/strict');
const test = require('node:test');

const {
  bookmarkImageFilter,
  defaults,
  limits
} = require('../src/component/bookmarkImageFilter/index.cjs');

test('normalizes missing, invalid, and non-object filter values to neutral defaults', () => {
  assert.deepEqual(bookmarkImageFilter.normalize(), defaults);
  assert.deepEqual(bookmarkImageFilter.normalize(null), defaults);
  assert.deepEqual(bookmarkImageFilter.normalize([]), defaults);
  assert.deepEqual(bookmarkImageFilter.normalize({
    grayscale: 'NaN',
    sepia: Infinity,
    saturation: '',
    brightness: null,
    contrast: {},
    hueRotation: '18.4',
    blur: true,
    untrusted: 'drop me'
  }), {
    grayscale: defaults.grayscale,
    sepia: defaults.sepia,
    saturation: defaults.saturation,
    brightness: defaults.brightness,
    contrast: defaults.contrast,
    hueRotation: 18,
    blur: defaults.blur
  });
});

test('clamps out-of-range values to configured bounds and rounds to slider steps', () => {
  assert.deepEqual(bookmarkImageFilter.normalize({
    grayscale: -1,
    sepia: 101,
    saturation: 201,
    brightness: 49.8,
    contrast: 150.7,
    hueRotation: -1,
    blur: 4.8
  }), {
    grayscale: limits.grayscale.min,
    sepia: limits.sepia.max,
    saturation: limits.saturation.max,
    brightness: limits.brightness.min,
    contrast: limits.contrast.max,
    hueRotation: limits.hueRotation.min,
    blur: limits.blur.max
  });
});

test('accepts numeric strings while rejecting arbitrary CSS strings', () => {
  assert.equal(bookmarkImageFilter.normalize({ grayscale: '67.8' }).grayscale, 68);
  assert.equal(bookmarkImageFilter.toCss({ grayscale: '0%); background: red;' }), '');
});

test('returns an empty CSS value for neutral filters', () => {
  assert.equal(bookmarkImageFilter.toCss(defaults), '');
});

test('composes all filters in the fixed, bounded CSS order', () => {
  assert.equal(
    bookmarkImageFilter.toCss({
      grayscale: 30,
      sepia: 20,
      saturation: 125,
      hueRotation: 90,
      brightness: 110,
      contrast: 80,
      blur: 2
    }),
    'grayscale(30%) sepia(20%) saturate(125%) hue-rotate(90deg) brightness(110%) contrast(80%) blur(2px)'
  );
});
