import { fontawesome } from '../fontawesome';

import { isValidString } from '../../utility/isValidString';
import { trimString } from '../../utility/trimString';
import { node } from '../../utility/node';

const providerCache = {};

const loadProvider = (provider) => {

  const load = {
    lucide: () => Promise.all([
      import('lucide-static/icon-nodes.json'),
      import('lucide-static/tags.json')
    ]).then(([icons, tags]) => ({
      icons: icons.default,
      tags: tags.default,
      items: Object.entries(icons.default).map(([name, data]) => ({
        name: name,
        label: name.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        prefix: 'lucide',
        search: [name, ...(tags.default[name] || [])].join(' ').toLowerCase(),
        data: data
      }))
    })),
    'simple-icons': () => import('simple-icons').then((module) => {
      const source = module.default ? module.default : module;
      const icons = Object.values(source).filter((icon) => icon && icon.slug);

      return {
        icons: new Map(icons.map((icon) => [icon.slug, icon])),
        items: icons.map((icon) => ({
          name: icon.slug,
          label: icon.title,
          prefix: 'simple-icons',
          search: (icon.slug + ' ' + icon.title + ' ' + JSON.stringify(icon.aliases || {})).toLowerCase(),
          data: icon
        }))
      };
    })
  };

  if (!load[provider]) {
    return Promise.resolve(false);
  }

  if (!providerCache[provider]) {
    providerCache[provider] = load[provider]().catch((error) => {
      delete providerCache[provider];
      throw error;
    });
  }

  return providerCache[provider];

};

const createSvg = (provider, data, className) => {

  if (!data) {
    return false;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('aria-hidden', 'true');

  if (className) {
    svg.classList.add(className);
  }

  if (provider === 'lucide') {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    data.forEach(([tag, attributes]) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);

      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });

      svg.appendChild(element);
    });

    return svg;
  }

  if (provider === 'simple-icons') {
    if (!isValidString(data.path)) {
      return false;
    }

    svg.setAttribute('fill', 'currentColor');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    path.setAttribute('d', data.path);
    svg.appendChild(path);

    return svg;
  }

  return false;

};

export const bookmarkIcon = {
  search: async (provider, string) => {
    const term = trimString(string).toLowerCase();

    if (provider === 'fontawesome') {
      return fontawesome.filter((item) => {
        return !term || item.name.toLowerCase().includes(term) || item.label.toLowerCase().includes(term) || item.search.some((word) => word.toLowerCase().includes(term)) || item.styles.some((style) => style.toLowerCase().includes(term));
      }).map((item) => ({
        ...item,
        prefix: item.styles.includes('solid') ? 'fas' : 'fab',
        data: item
      }));
    }

    if (!isValidString(term)) {
      return [];
    }

    const data = await loadProvider(provider);

    if (!data) {
      return [];
    }

    // ponytail: cap broad provider searches at 100 results; add paging if users need more.
    return data.items.filter((item) => item.search.includes(term)).slice(0, 100);
  },

  renderData: (provider, data, className = false) => {
    if (provider === 'fas' || provider === 'fab') {
      if (!data || !/^[a-z0-9-]+$/i.test(data.name)) {
        return false;
      }

      const element = node('span');

      element.classList.add(provider, 'fa-' + data.name);

      if (className) {
        element.classList.add(className);
      }

      return element;
    }

    return createSvg(provider, data, className);
  },

  render: async (name, provider, className = false) => {
    if (!isValidString(name)) {
      return false;
    }

    if (provider === 'fas' || provider === 'fab') {
      return bookmarkIcon.renderData(provider, { name: name }, className);
    }

    const data = await loadProvider(provider);

    if (!data) {
      return false;
    }

    const icon = provider === 'lucide' ? data.icons[name] : data.icons.get(name);

    return bookmarkIcon.renderData(provider, icon, className);
  }
};
