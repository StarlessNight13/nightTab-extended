'use strict';

const defaults = Object.freeze({
  grayscale: 0,
  sepia: 0,
  saturation: 100,
  brightness: 100,
  contrast: 100,
  hueRotation: 0,
  blur: 0
});

const limits = Object.freeze({
  grayscale: { min: 0, max: 100 },
  sepia: { min: 0, max: 100 },
  saturation: { min: 0, max: 200 },
  brightness: { min: 50, max: 150 },
  contrast: { min: 50, max: 150 },
  hueRotation: { min: 0, max: 360 },
  blur: { min: 0, max: 4 }
});

const normalizeValue = (value, defaultValue, range) => {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
  const number = isNumeric ? Number(value) : NaN;

  if (!Number.isFinite(number)) {
    return defaultValue;
  }

  return Math.round(Math.min(range.max, Math.max(range.min, number)));
};

const normalize = (filters = {}) => {
  const source = filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {};

  return Object.keys(defaults).reduce((result, key) => {
    result[key] = normalizeValue(source[key], defaults[key], limits[key]);
    return result;
  }, {});
};

const toCss = (filters = {}) => {
  const values = normalize(filters);

  if (Object.keys(defaults).every((key) => values[key] === defaults[key])) {
    return '';
  }

  return [
    `grayscale(${values.grayscale}%)`,
    `sepia(${values.sepia}%)`,
    `saturate(${values.saturation}%)`,
    `hue-rotate(${values.hueRotation}deg)`,
    `brightness(${values.brightness}%)`,
    `contrast(${values.contrast}%)`,
    `blur(${values.blur}px)`
  ].join(' ');
};

module.exports = {
  bookmarkImageFilter: {
    normalize: normalize,
    toCss: toCss
  },
  defaults: defaults,
  limits: limits
};
