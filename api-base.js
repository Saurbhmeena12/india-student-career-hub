/* Configure the browser API origin for split frontend/backend deployments. */
(function () {
  const apiBase = String(window.__API_BASE__ || '').replace(/\/+$/, '');
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    let request = input;
    if (typeof input === 'string' && input.startsWith('/api')) {
      request = apiBase + input;
    }

    return nativeFetch(request, {
      ...(init || {}),
      credentials: (init && init.credentials) || 'include'
    });
  };
})();
