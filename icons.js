/* ============================================================================
   icons.js — inline SVG icon set (no CDN, no network, works offline)
   ----------------------------------------------------------------------------
   Replaces every <i class="fas fa-name"></i> with a crisp 24px stroke SVG.
   Keeps the same class names so existing markup needs no changes.
   Renders in the sandboxed preview, in a downloaded file, and on slow networks.
   ============================================================================ */
(function () {
  const P = {
    'moon': 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
    'sun': 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
    'sign-in-alt': 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
    'thumbs-up': 'M7 22V11l4-9a2 2 0 0 1 2 2v5h5.6a2 2 0 0 1 2 2.3l-1.3 8a2 2 0 0 1-2 1.7H7ZM3 11h4v11H3z',
    'thumbs-down': 'M7 2v11l4 9a2 2 0 0 0 2-2v-5h5.6a2 2 0 0 0 2-2.3l-1.3-8A2 2 0 0 0 17.3 2H7ZM3 2h4v11H3z',
    'book-reader': 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    'calendar-plus': 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM12 14v4M10 16h4',
    'chevron-left': 'M15 18l-6-6 6-6',
    'chevron-right': 'M9 18l6-6-6-6',
    'check-circle': 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14.01l-3-3',
    'user-check': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM16 11l2 2 4-4',
    'comment-dots': 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-1L3 21l2.1-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4ZM8 12h.01M12 12h.01M16 12h.01',
    'hand-holding-usd': 'M11 15h2a2 2 0 1 0 0-4h-3a2 2 0 0 1 0-4h4M12 2v2M12 20v2M12 15v-2M2 22h3a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H2z',
    'landmark': 'M3 22h18M6 18V11M10 18V11M14 18V11M18 18V11M2 11l10-6 10 6Z',
    'fort-awesome': 'M3 21V8l3-2 2 2 4-4 4 4 2-2 3 2v13M9 21v-5h6v5',
    'graduation-cap': 'M22 10 12 5 2 10l10 5 10-5Z M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
    'bars': 'M4 6h16M4 12h16M4 18h16',
    'external-link-alt': 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
    'arrow-right': 'M5 12h14M12 5l7 7-7 7',
    'user-graduate': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1M17 4l2 2 2-2',
    'laptop-code': 'M3 5h18v11H3zM2 20h20M9 9l-2 2 2 2M15 9l2 2-2 2',
    'money-bill-wave': 'M2 7h20v10H2zM12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6 10v6M18 10v6',
    'inbox': 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v7H2v-7Z',
    'hard-hat': 'M2 18h20M4 18v-3a8 8 0 0 1 16 0v3M9 6v6M15 6v6',
    'file-alt': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
    'briefcase': 'M4 7h16v13H4zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16',
    'certificate': 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5',
    'bell': 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0',
    'trash': 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
    'sitemap': 'M9 3h6v5H9zM2 16h6v5H2zM16 16h6v5h-6zM12 8v4M5 16v-2h14v2',
    'handshake': 'M11 17 8 20l-6-6 4-4 3 3M13 7l3-3 6 6-4 4M7 11l5 5M17 13l-5-5',
    'envelope': 'M2 5h20v14H2zM2 6l10 7 10-7',
    'users': 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    'search': 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
    'info-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-5M12 8h.01',
    'wand-magic-sparkles': 'M15 4V2M15 10V8M11 6H9M21 6h-2M17.5 3.5 16 5M12.5 8.5 11 10M17.5 8.5 16 7M3 21l9-9',
    'user': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'upload': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    'download': 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    'university': 'M22 10 12 4 2 10l10 6 10-6ZM6 12v8h12v-8M2 22h20',
    'school': 'M14 22V10l-4-2-4 2v12M2 22h20M14 22v-5h4v5M18 10l4-2-4-2',
    'robot': 'M5 8h14v12H5zM12 4v4M9 14h.01M15 14h.01M9 18h6M2 13v3M22 13v3',
    'paper-plane': 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
    'map-marked-alt': 'M9 4 3 6v15l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v15M15 6v15',
    'list-check': 'M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13',
    'bookmark': 'M6 3h12v18l-6-4-6 4V3Z',
    'tools': 'M14.7 6.3a4 4 0 0 0 5 5l-11 11-3-3 11-11M6 3l3 3-3 3-3-3 3-3Z',
    'target': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    'table': 'M3 4h18v16H3zM3 10h18M3 15h18M9 4v16',
    'star': 'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3Z',
    'sign-out-alt': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    'shield-alt': 'M12 3l8 3v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V6l8-3Z',
    'save': 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM7 3v6h10M7 21v-7h10v7',
    'road': 'M12 3v3M12 10v3M12 17v4M6 21 3 3M18 21l3-18',
    'plus': 'M12 5v14M5 12h14',
    'plug': 'M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v5',
    'phone': 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
    'palette': 'M12 22a10 10 0 1 1 0-20c5.5 0 10 3.6 10 8 0 2.2-1.8 4-4 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22ZM7.5 11h.01M10 7h.01M15 7h.01M17 11h.01',
    'map-marker-alt': 'M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12ZM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    'list': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    'lightbulb': 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z',
    'landmark': 'M3 22h18M5 18v-7M9 18v-7M15 18v-7M19 18v-7M12 3 3 8h18l-9-5Z',
    'industry': 'M2 22h20V11l-6 4V9l-6 4V7l-8 5v10ZM6 18h.01M11 18h.01M16 18h.01',
    'heartbeat': 'M2 12h4l3-8 4 16 3-8h6',
    'headset': 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3v-6ZM20 14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1M18 20a4 4 0 0 1-4 2h-2',
    'gauge-high': 'M12 14l4-4M21 16a9 9 0 1 0-18 0M3 21h18',
    'flask': 'M9 2h6M10 2v7L4.5 19A2 2 0 0 0 6.2 22h11.6a2 2 0 0 0 1.7-3L14 9V2M7 15h10',
    'eye': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'exclamation-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v5M12 16h.01',
    'database': 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3ZM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    'clock': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v5l3 2',
    'calendar-days': 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01',
    'calendar-day': 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M12 14h.01',
    'calculator': 'M4 2h16v20H4zM8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h4',
    'building': 'M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M16 9h3a2 2 0 0 1 2 2v11M2 22h20M8 6h4M8 10h4M8 14h4M8 18h4',
    'check': 'M20 6 9 17l-5-5',
    'chevron-down': 'M6 9l6 6 6-6',
    'close': 'M18 6 6 18M6 6l12 12',
    'filter': 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
    'trending-up': 'M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6',
    'award': 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
    'globe': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z',
    'sparkles': 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8'
  };

  const svg = (name, extra) => {
    const d = P[name] || P['info-circle'];
    const cls = extra ? ' ' + extra : '';
    return `<svg class="ico${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
      `<path d="${d}"/></svg>`;
  };

  function hydrate(root) {
    (root || document).querySelectorAll('i[class*="fa-"]').forEach(el => {
      const m = el.className.match(/fa-([a-z0-9-]+)/);
      if (!m) return;
      const name = m[1];
      const span = document.createElement('span');
      span.innerHTML = svg(name);
      const svgEl = span.firstElementChild;
      if (!svgEl) return;
      // preserve sizing classes sometimes applied inline
      const size = el.getAttribute('style');
      if (size) svgEl.setAttribute('style', size);
      el.replaceWith(svgEl);
    });
  }

  window.__icon = svg;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate());
  } else {
    hydrate();
  }
  // re-run for content injected later (listing pages render after fetch)
  window.refreshIcons = hydrate;
  new MutationObserver(() => hydrate()).observe(document.body, { childList: true, subtree: true });
})();
