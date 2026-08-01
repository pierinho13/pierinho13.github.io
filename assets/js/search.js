(function () {
  var dialog = document.getElementById('search-dialog');
  var trigger = document.getElementById('search-trigger');
  var input = document.getElementById('site-search-input');
  var results = document.getElementById('search-results');
  var status = document.getElementById('search-status');

  if (!dialog || !trigger || !input || !results || !status) {
    return;
  }

  var language = document.documentElement.lang === 'es' ? 'es' : 'en';
  var copy = language === 'es'
    ? {
        initial: 'Escribe para buscar en K8sReady.',
        loading: 'Preparando el buscador...',
        searching: 'Buscando...',
        noResults: 'No se encontraron resultados.',
        unavailable: 'El buscador estará disponible después del próximo despliegue.',
        singular: 'resultado',
        plural: 'resultados'
      }
    : {
        initial: 'Start typing to search K8sReady.',
        loading: 'Preparing search...',
        searching: 'Searching...',
        noResults: 'No results found.',
        unavailable: 'Search will be available after the next deployment.',
        singular: 'result',
        plural: 'results'
      };

  var pagefindPromise;
  var debounceTimer;
  var requestNumber = 0;
  var previousFocus;

  function loadPagefind() {
    if (!pagefindPromise) {
      status.textContent = copy.loading;
      pagefindPromise = import('/pagefind/pagefind.js')
        .then(function (pagefind) {
          return pagefind.init().then(function () {
            return pagefind;
          });
        })
        .catch(function (error) {
          console.warn('Pagefind could not be loaded:', error);
          pagefindPromise = null;
          throw error;
        });
    }

    return pagefindPromise;
  }

  function openSearch() {
    previousFocus = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('search-is-open');
    window.requestAnimationFrame(function () {
      dialog.classList.add('is-open');
      input.focus();
    });
    loadPagefind().catch(function () {
      status.textContent = copy.unavailable;
    });
  }

  function closeSearch() {
    dialog.classList.remove('is-open');
    document.body.classList.remove('search-is-open');
    window.setTimeout(function () {
      dialog.hidden = true;
    }, 160);
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  }

  function clearResults(message) {
    results.replaceChildren();
    status.textContent = message;
  }

  function createResultItem(data) {
    var link = document.createElement('a');
    link.className = 'search-result';
    link.href = data.url;

    var title = document.createElement('span');
    title.className = 'search-result__title';
    title.textContent = data.meta && data.meta.title ? data.meta.title : data.url;

    var excerpt = document.createElement('span');
    excerpt.className = 'search-result__excerpt';
    excerpt.innerHTML = data.excerpt || '';

    var path = document.createElement('span');
    path.className = 'search-result__path';
    path.textContent = data.url;

    link.append(title, excerpt, path);
    return link;
  }

  async function runSearch(query) {
    var currentRequest = ++requestNumber;
    status.textContent = copy.searching;

    try {
      var pagefind = await loadPagefind();
      var search = await pagefind.search(query);
      var loadedResults = await Promise.all(
        search.results.slice(0, 8).map(function (result) {
          return result.data();
        })
      );

      if (currentRequest !== requestNumber) {
        return;
      }

      results.replaceChildren();

      if (!loadedResults.length) {
        status.textContent = copy.noResults;
        return;
      }

      var count = search.results.length;
      status.textContent = count + ' ' + (count === 1 ? copy.singular : copy.plural);
      loadedResults.forEach(function (data) {
        results.appendChild(createResultItem(data));
      });
    } catch (error) {
      if (currentRequest === requestNumber) {
        clearResults(copy.unavailable);
      }
    }
  }

  trigger.addEventListener('click', openSearch);

  dialog.querySelectorAll('[data-search-close]').forEach(function (element) {
    element.addEventListener('click', closeSearch);
  });

  input.addEventListener('input', function () {
    var query = input.value.trim();
    window.clearTimeout(debounceTimer);

    if (query.length < 2) {
      requestNumber += 1;
      clearResults(copy.initial);
      return;
    }

    debounceTimer = window.setTimeout(function () {
      runSearch(query);
    }, 180);
  });

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.hidden) {
        openSearch();
      } else {
        closeSearch();
      }
      return;
    }

    if (event.key === 'Escape' && !dialog.hidden) {
      closeSearch();
    }
  });
})();
