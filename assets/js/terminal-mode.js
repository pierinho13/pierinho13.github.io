(function () {
  "use strict";

  const terminal = document.getElementById("site-terminal");
  if (!terminal) return;

  const output = terminal.querySelector("[data-terminal-output]");
  const screen = terminal.querySelector("[data-terminal-screen]");
  const form = terminal.querySelector("[data-terminal-form]");
  const input = terminal.querySelector("[data-terminal-input]");
  const closeButton = terminal.querySelector("[data-terminal-close]");
  const status = terminal.querySelector("[data-terminal-status]");
  const initialLanguage = terminal.dataset.language === "es" ? "es" : "en";

  const copy = {
    en: {
      trigger: "Open terminal mode",
      close: "Close terminal mode",
      session: "read-only browser session",
      placeholder: "type a command...",
      welcome: [
        "K8sReady Terminal v1.0",
        "Read-only access to the text content of this site.",
        "Type 'help' to see the available commands."
      ],
      unknown: "Command not found",
      emptySearch: "Usage: search <words>",
      noResults: "No results found.",
      loading: "Loading",
      unavailable: "Content could not be loaded",
      copied: "Command copied to the clipboard.",
      copyFailed: "Copy is unavailable; select the command manually.",
      readerPage: "page",
      readerHint: "Use 'next' or 'prev' to move through the document.",
      noReader: "No document is open. Use 'read <section>' or 'open <number>'.",
      switched: "Switching language",
      projectNotFound: "Unknown project. Run 'projects' to list available projects."
    },
    es: {
      trigger: "Abrir modo terminal",
      close: "Cerrar modo terminal",
      session: "sesión de navegador de solo lectura",
      placeholder: "escribe un comando...",
      welcome: [
        "K8sReady Terminal v1.0",
        "Acceso de solo lectura al contenido textual de esta web.",
        "Escribe 'help' para consultar los comandos disponibles."
      ],
      unknown: "Comando no encontrado",
      emptySearch: "Uso: search <palabras>",
      noResults: "No se encontraron resultados.",
      loading: "Cargando",
      unavailable: "No se pudo cargar el contenido",
      copied: "Comando copiado al portapapeles.",
      copyFailed: "No se pudo copiar; selecciona el comando manualmente.",
      readerPage: "página",
      readerHint: "Usa 'next' o 'prev' para recorrer el documento.",
      noReader: "No hay ningún documento abierto. Usa 'read <sección>' u 'open <número>'.",
      switched: "Cambiando idioma",
      projectNotFound: "Proyecto desconocido. Ejecuta 'projects' para ver los disponibles."
    }
  };

  const projectInfo = {
    "github-platform-operator": {
      en: "Kubernetes-native control plane for GitHub repositories, teams, rulesets, access and Actions configuration.",
      es: "Control plane nativo de Kubernetes para repositorios, equipos, rulesets, accesos y configuración de GitHub Actions.",
      url: "https://github.com/pierinho13/github-platform-operator",
      install: "helm upgrade --install github-platform-operator oci://ghcr.io/pierinho13/charts/github-platform-operator --namespace github-platform-operator-system --create-namespace"
    },
    "kubectl-peek": {
      en: "Interactive Kubernetes CLI for Secret relationships, event investigation and isolated cluster shells.",
      es: "CLI interactiva de Kubernetes para relaciones de Secrets, investigación de Events y shells aisladas.",
      url: "https://github.com/pierinho13/kubectl-peek",
      install: "brew install --cask pierinho13/tools/kubectl-peek"
    },
    "cmdpeek": {
      en: "Searchable command palette for reusable, guided and safer terminal workflows.",
      es: "Paleta de comandos buscable para workflows de terminal reutilizables, guiados y más seguros.",
      url: "https://github.com/pierinho13/cmdpeek",
      install: "brew install --cask pierinho13/tools/cmdpeek"
    },
    "traefik-plugins": {
      en: "Three production-grade middleware plugins published in the official Traefik Plugin Catalog.",
      es: "Tres plugins de middleware preparados para producción y publicados en el catálogo oficial de Traefik.",
      url: "https://plugins.traefik.io/plugins/6a3e32199dbe8a37899c23c2/bulk-redirects",
      install: null
    }
  };

  let language = initialLanguage;
  let openedOnce = false;
  let commandHistory = [];
  let historyPosition = 0;
  let resultEntries = [];
  let reader = null;
  let pagefind = null;
  let projectData = null;
  let previousFocus = null;
  let hiddenTargets = [];

  const PAGE_SIZE = 48;
  const commandNames = [
    "help", "ls", "pwd", "home", "about", "experience", "projects",
    "project", "blog", "contact", "skills", "search", "read", "cat",
    "open", "next", "prev", "install", "history", "theme", "lang",
    "clear", "exit", "quit"
  ];

  function routes() {
    if (language === "es") {
      return {
        home: "/es/",
        about: "/es/informacion/",
        experience: "/es/experiencia/",
        blog: "/es/blog/",
        contact: "/es/contacto/",
        projects: "/es/#projects"
      };
    }
    return {
      home: "/en/",
      about: "/en/information/",
      experience: "/en/experience/",
      blog: "/en/blog/",
      contact: "/en/contact/",
      projects: "/en/#projects"
    };
  }

  function createTrigger() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.getElementById("terminal-mode-trigger")) return null;

    const button = document.createElement("button");
    button.className = "icon-button terminal-mode-trigger";
    button.id = "terminal-mode-trigger";
    button.type = "button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "site-terminal");
    button.setAttribute("aria-label", copy[language].trigger);
    button.title = copy[language].trigger;
    button.innerHTML = '<span class="terminal-mode-trigger__glyph" aria-hidden="true">&gt;_</span>';

    const themeButton = document.getElementById("theme-toggle");
    if (themeButton) actions.insertBefore(button, themeButton);
    else actions.appendChild(button);

    button.addEventListener("click", openTerminal);
    return button;
  }

  const trigger = createTrigger();

  function appendLines(lines, type) {
    const entry = document.createElement("div");
    entry.className = "site-terminal__entry";

    const normalized = Array.isArray(lines) ? lines : [String(lines)];
    normalized.forEach(function (line) {
      const row = document.createElement("div");
      row.className = "site-terminal__line" + (type ? " site-terminal__line--" + type : "");
      row.textContent = line === "" ? " " : String(line);
      entry.appendChild(row);
    });

    output.appendChild(entry);
    requestAnimationFrame(function () {
      output.scrollTop = output.scrollHeight;
    });
  }

  function echoCommand(command) {
    appendLines(command, "command");
  }

  function setBusy(busy, label) {
    input.disabled = busy;
    status.textContent = busy ? (label || copy[language].loading) : copy[language].session;
    if (!busy) input.focus({ preventScroll: true });
  }

  function setPageInert(active) {
    const candidates = [
      document.querySelector(".site-header"),
      document.querySelector(".site-main"),
      document.querySelector(".site-footer"),
      document.getElementById("search-dialog")
    ].filter(Boolean);

    if (active) {
      hiddenTargets = candidates.map(function (element) {
        const state = {
          element: element,
          inert: element.inert,
          ariaHidden: element.getAttribute("aria-hidden")
        };
        element.inert = true;
        element.setAttribute("aria-hidden", "true");
        return state;
      });
      return;
    }

    hiddenTargets.forEach(function (state) {
      state.element.inert = state.inert;
      if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
      else state.element.setAttribute("aria-hidden", state.ariaHidden);
    });
    hiddenTargets = [];
  }

  function openTerminal() {
    previousFocus = document.activeElement;
    terminal.hidden = false;
    document.body.classList.add("terminal-mode-active");
    setPageInert(true);
    requestAnimationFrame(function () {
      terminal.classList.add("is-open");
      input.focus({ preventScroll: true });
    });

    if (!openedOnce) {
      appendLines(copy[language].welcome, "accent");
      appendLines(["", "Try: projects", "     search gateway api", "     read current", "     exit"], "muted");
      openedOnce = true;
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", "terminal_mode_open", { page_path: window.location.pathname });
    }
  }

  function closeTerminal() {
    terminal.classList.remove("is-open");
    document.body.classList.remove("terminal-mode-active");
    setPageInert(false);
    window.setTimeout(function () {
      terminal.hidden = true;
      const target = previousFocus && typeof previousFocus.focus === "function" ? previousFocus : trigger;
      if (target) target.focus({ preventScroll: true });
    }, 170);

    if (typeof window.gtag === "function") {
      window.gtag("event", "terminal_mode_close", { page_path: window.location.pathname });
    }
  }

  function normalizeSpace(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  }

  function headingLines(text, level) {
    const clean = normalizeSpace(text);
    if (!clean) return [];
    if (level === 1) return ["", clean.toUpperCase(), "=".repeat(Math.min(clean.length, 72))];
    if (level === 2) return ["", clean, "-".repeat(Math.min(clean.length, 72))];
    return ["", "> " + clean];
  }

  function extractReadableContent(documentNode, hash) {
    let root = null;
    if (hash) {
      try {
        root = documentNode.querySelector(hash);
      } catch (_) {
        root = null;
      }
    }
    if (!root) root = documentNode.querySelector("main") || documentNode.body;

    const clone = root.cloneNode(true);
    clone.querySelectorAll([
      "script", "style", "noscript", "svg", "img", "picture", "video", "audio",
      "canvas", "form", "button", "nav", "footer", "header", "[data-pagefind-ignore]"
    ].join(",")).forEach(function (node) { node.remove(); });

    const lines = [];
    const blocks = clone.querySelectorAll("h1,h2,h3,h4,p,li,pre,blockquote,dt,dd");
    blocks.forEach(function (block) {
      if (block.closest("pre") && block.tagName !== "PRE") return;
      if (block.matches("p,li") && block.querySelector("p,li")) return;

      const tag = block.tagName;
      const text = tag === "PRE" ? block.textContent.trim() : normalizeSpace(block.textContent);
      if (!text) return;

      if (tag === "H1") lines.push.apply(lines, headingLines(text, 1));
      else if (tag === "H2") lines.push.apply(lines, headingLines(text, 2));
      else if (tag === "H3" || tag === "H4") lines.push.apply(lines, headingLines(text, 3));
      else if (tag === "LI") lines.push("- " + text);
      else if (tag === "BLOCKQUOTE") lines.push("> " + text);
      else if (tag === "DT") lines.push("", text + ":");
      else if (tag === "DD") lines.push("  " + text);
      else if (tag === "PRE") {
        lines.push("");
        text.split(/\r?\n/).forEach(function (line) { lines.push("    " + line); });
      } else lines.push(text);
    });

    const compact = [];
    lines.forEach(function (line) {
      if (line === "" && compact[compact.length - 1] === "") return;
      compact.push(line);
    });
    return compact.length ? compact : [normalizeSpace(clone.textContent)];
  }

  async function fetchDocument(target) {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error("external URL");
    const response = await fetch(url.pathname + url.search, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const html = await response.text();
    return { documentNode: new DOMParser().parseFromString(html, "text/html"), url: url };
  }

  function showReaderPage(page) {
    if (!reader) {
      appendLines(copy[language].noReader, "warning");
      return;
    }

    const total = Math.max(1, Math.ceil(reader.lines.length / PAGE_SIZE));
    reader.page = Math.max(0, Math.min(page, total - 1));
    const start = reader.page * PAGE_SIZE;
    const visible = reader.lines.slice(start, start + PAGE_SIZE);

    appendLines([
      reader.title,
      reader.url,
      ""
    ].concat(visible).concat([
      "",
      "[" + copy[language].readerPage + " " + (reader.page + 1) + "/" + total + "] " + copy[language].readerHint
    ]));
  }

  async function readTarget(target) {
    const aliases = routes();
    let requested = target || "current";
    if (requested === "current") requested = window.location.pathname + window.location.hash;
    if (aliases[requested]) requested = aliases[requested];

    setBusy(true, copy[language].loading + " " + requested);
    try {
      const fetched = await fetchDocument(requested);
      const title = normalizeSpace(fetched.documentNode.title).replace(/\s*[|·-]\s*K8sReady\s*$/i, "") || fetched.url.pathname;
      const lines = extractReadableContent(fetched.documentNode, fetched.url.hash);
      reader = { title: title, url: fetched.url.pathname + fetched.url.hash, lines: lines, page: 0 };
      showReaderPage(0);
    } catch (error) {
      appendLines(copy[language].unavailable + ": " + requested + " (" + error.message + ")", "error");
    } finally {
      setBusy(false);
    }
  }

  async function getPagefind() {
    if (pagefind) return pagefind;
    pagefind = await import("/pagefind/pagefind.js");
    if (typeof pagefind.options === "function") {
      await pagefind.options({ excerptLength: 24 });
    }
    return pagefind;
  }

  async function searchSite(query) {
    if (!query) {
      appendLines(copy[language].emptySearch, "warning");
      return;
    }

    setBusy(true, copy[language].loading + " search index");
    try {
      const api = await getPagefind();
      const response = await api.search(query);
      const records = await Promise.all(response.results.slice(0, 10).map(function (result) {
        return result.data();
      }));

      resultEntries = records.map(function (record) {
        const excerpt = String(record.excerpt || "").replace(/<[^>]+>/g, " ");
        return {
          title: (record.meta && record.meta.title) || record.url,
          url: record.url,
          excerpt: normalizeSpace(excerpt)
        };
      });

      if (!resultEntries.length) {
        appendLines(copy[language].noResults, "warning");
        return;
      }

      const lines = [resultEntries.length + " result(s) for: " + query, ""];
      resultEntries.forEach(function (result, index) {
        lines.push("[" + (index + 1) + "] " + result.title);
        lines.push("    " + result.url);
        if (result.excerpt) lines.push("    " + result.excerpt);
        lines.push("");
      });
      lines.push("Use 'open <number>' to read a result.");
      appendLines(lines);
    } catch (error) {
      appendLines(copy[language].unavailable + ": Pagefind (" + error.message + ")", "error");
    } finally {
      setBusy(false);
    }
  }

  async function listBlog() {
    setBusy(true, copy[language].loading + " blog");
    try {
      const fetched = await fetchDocument(routes().blog);
      const selectors = "main article h2 a[href], main article h3 a[href], main .blog-card h3 a[href]";
      const seen = new Set();
      resultEntries = Array.from(fetched.documentNode.querySelectorAll(selectors)).map(function (anchor) {
        return {
          title: normalizeSpace(anchor.textContent),
          url: new URL(anchor.getAttribute("href"), window.location.origin).pathname,
          excerpt: ""
        };
      }).filter(function (entry) {
        if (!entry.title || seen.has(entry.url)) return false;
        seen.add(entry.url);
        return true;
      }).slice(0, 20);

      if (!resultEntries.length) {
        await readTarget("blog");
        return;
      }

      const lines = [language === "es" ? "Artículos recientes" : "Recent articles", ""];
      resultEntries.forEach(function (entry, index) {
        lines.push("[" + (index + 1) + "] " + entry.title);
        lines.push("    " + entry.url);
      });
      lines.push("", "Use 'open <number>' to read an article.");
      appendLines(lines);
    } catch (error) {
      appendLines(copy[language].unavailable + ": blog (" + error.message + ")", "error");
    } finally {
      setBusy(false);
    }
  }

  async function loadProjectData() {
    if (projectData) return projectData;
    try {
      const response = await fetch("/assets/data/projects.json", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      projectData = payload.projects || payload;
    } catch (_) {
      projectData = {};
    }
    return projectData;
  }

  function metric(value, fallback) {
    return value === null || value === undefined || value === "" ? fallback : value;
  }

  async function showProjects() {
    setBusy(true, copy[language].loading + " project data");
    const data = await loadProjectData();
    const lines = [language === "es" ? "PROYECTOS OPEN SOURCE" : "OPEN SOURCE PROJECTS", ""];

    Object.keys(projectInfo).forEach(function (key) {
      const info = projectInfo[key];
      const live = data[key] || {};
      lines.push(key);
      lines.push("  " + info[language]);
      if (key === "traefik-plugins") {
        lines.push("  stars: " + metric(live.stars, "-") + " | 3 plugins | " + (language === "es" ? "contribuidor principal" : "principal contributor"));
      } else {
        lines.push("  stars: " + metric(live.stars, "-") + " | downloads: " + metric(live.downloads, "-") + " | release: " + metric(live.latestRelease, "-"));
      }
      lines.push("  " + info.url, "");
    });
    lines.push("Use 'project <name>' or 'install <name>'.");
    appendLines(lines);
    setBusy(false);
  }

  async function showProject(name) {
    const key = String(name || "").toLowerCase();
    const info = projectInfo[key];
    if (!info) {
      appendLines(copy[language].projectNotFound, "warning");
      return;
    }

    const data = await loadProjectData();
    const live = data[key] || {};
    const lines = [key.toUpperCase(), "", info[language], "", "Repository: " + info.url];
    if (key === "traefik-plugins") {
      lines.push("Stars: " + metric(live.stars, "-"), "Published plugins: 3", language === "es" ? "Rol: contribuidor principal" : "Role: principal contributor");
    } else {
      lines.push(
        "Stars: " + metric(live.stars, "-"),
        "Downloads: " + metric(live.downloads, "-"),
        "Latest release: " + metric(live.latestRelease, "-")
      );
    }
    if (info.install) lines.push("", "Install: " + info.install);
    appendLines(lines);
  }

  async function installProject(name) {
    const info = projectInfo[String(name || "").toLowerCase()];
    if (!info) {
      appendLines(copy[language].projectNotFound, "warning");
      return;
    }
    if (!info.install) {
      appendLines((language === "es" ? "Consulta el catálogo oficial: " : "See the official catalog: ") + info.url, "warning");
      return;
    }

    appendLines(info.install, "accent");
    try {
      await navigator.clipboard.writeText(info.install);
      appendLines(copy[language].copied, "muted");
    } catch (_) {
      appendLines(copy[language].copyFailed, "warning");
    }
  }

  function showHelp() {
    const lines = language === "es" ? [
      "COMANDOS DISPONIBLES",
      "",
      "help                 Muestra esta ayuda",
      "ls                   Lista las secciones disponibles",
      "read <sección>       Lee home, about, experience, projects, blog o contact",
      "read current         Lee la página actual",
      "search <texto>       Busca en toda la web con Pagefind",
      "open <número>        Abre un resultado de search o blog",
      "next / prev          Cambia de página durante la lectura",
      "projects             Lista proyectos y métricas",
      "project <nombre>     Muestra los detalles de un proyecto",
      "install <nombre>     Muestra y copia el comando de instalación",
      "skills               Muestra tecnologías principales",
      "blog                 Lista los artículos recientes",
      "theme                Cambia el tema de la web",
      "lang es|en           Cambia el idioma",
      "history              Muestra el historial de comandos",
      "clear                Limpia la terminal",
      "exit                 Vuelve al modo grafico",
      "",
      "Atajos: Tab autocompleta, las flechas recorren el historial y Ctrl+L limpia."
    ] : [
      "AVAILABLE COMMANDS",
      "",
      "help                 Show this help",
      "ls                   List available sections",
      "read <section>       Read home, about, experience, projects, blog or contact",
      "read current         Read the current page",
      "search <text>        Search the whole site with Pagefind",
      "open <number>        Open a search or blog result",
      "next / prev          Move through an open document",
      "projects             List projects and live metrics",
      "project <name>       Show project details",
      "install <name>       Show and copy an installation command",
      "skills               Show the main technologies",
      "blog                 List recent articles",
      "theme                Toggle the website theme",
      "lang es|en           Switch language",
      "history              Show command history",
      "clear                Clear the terminal",
      "exit                 Return to graphical mode",
      "",
      "Shortcuts: Tab completes, arrows browse history, Ctrl+L clears."
    ];
    appendLines(lines);
  }

  function showSkills() {
    appendLines([
      language === "es" ? "TECNOLOGÍAS PRINCIPALES" : "CORE TECHNOLOGIES",
      "",
      "Kubernetes       AWS             GCP",
      "Go               Terraform       GitOps",
      "Flux             Argo CD         Traefik",
      "Cilium           Helm            Gateway API",
      "Kyverno          Prometheus      Grafana",
      "GitHub Actions   Docker          Linux"
    ]);
  }

  function showLs() {
    appendLines([
      "about/",
      "blog/",
      "contact/",
      "experience/",
      "projects/",
      "skills/",
      "",
      "Use 'read <name>' to inspect a section."
    ]);
  }

  function toggleTheme() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("k8sready-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("k8sready-theme", "dark");
    }
    appendLines(dark ? "theme: light" : "theme: dark", "muted");
  }

  function switchLanguage(value) {
    if (value !== "es" && value !== "en") {
      appendLines("Usage: lang es|en", "warning");
      return;
    }
    appendLines(copy[language].switched + ": " + value, "muted");
    window.location.href = "/" + value + "/";
  }

  function openResult(value) {
    if (/^\d+$/.test(value)) {
      const entry = resultEntries[Number(value) - 1];
      if (!entry) {
        appendLines("Result not found: " + value, "warning");
        return;
      }
      readTarget(entry.url);
      return;
    }
    readTarget(value);
  }

  async function execute(rawCommand) {
    const command = normalizeSpace(rawCommand);
    if (!command) return;

    commandHistory.push(command);
    historyPosition = commandHistory.length;
    echoCommand(command);

    const firstSpace = command.indexOf(" ");
    const name = (firstSpace === -1 ? command : command.slice(0, firstSpace)).toLowerCase();
    const argument = firstSpace === -1 ? "" : command.slice(firstSpace + 1).trim();

    switch (name) {
      case "help": showHelp(); break;
      case "ls": showLs(); break;
      case "pwd": appendLines("/" + language + "/", "muted"); break;
      case "home": await readTarget("home"); break;
      case "about": await readTarget("about"); break;
      case "experience": await readTarget("experience"); break;
      case "contact": await readTarget("contact"); break;
      case "skills": showSkills(); break;
      case "projects": await showProjects(); break;
      case "project": await showProject(argument); break;
      case "install": await installProject(argument); break;
      case "blog": await listBlog(); break;
      case "search": await searchSite(argument); break;
      case "read":
      case "cat": await readTarget(argument || "current"); break;
      case "open": openResult(argument); break;
      case "next": showReaderPage(reader ? reader.page + 1 : 0); break;
      case "prev": showReaderPage(reader ? reader.page - 1 : 0); break;
      case "history": appendLines(commandHistory.map(function (item, index) { return String(index + 1).padStart(3, " ") + "  " + item; })); break;
      case "theme": toggleTheme(); break;
      case "lang": switchLanguage(argument.toLowerCase()); break;
      case "clear": output.replaceChildren(); break;
      case "exit":
      case "quit": closeTerminal(); break;
      default: appendLines(copy[language].unknown + ": " + name + ". Type 'help'.", "error");
    }
  }

  function completionCandidates(value) {
    const all = commandNames.concat(Object.keys(routes()), Object.keys(projectInfo));
    return all.filter(function (candidate) { return candidate.startsWith(value.toLowerCase()); });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    execute(value);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!commandHistory.length) return;
      historyPosition = Math.max(0, historyPosition - 1);
      input.value = commandHistory[historyPosition] || "";
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!commandHistory.length) return;
      historyPosition = Math.min(commandHistory.length, historyPosition + 1);
      input.value = commandHistory[historyPosition] || "";
    } else if (event.key === "Tab") {
      event.preventDefault();
      const raw = input.value.trim();
      const parts = raw.split(/\s+/);
      const token = parts[parts.length - 1] || "";
      const matches = completionCandidates(token);
      if (matches.length === 1) {
        parts[parts.length - 1] = matches[0];
        input.value = parts.join(" ") + (parts.length === 1 ? " " : "");
      } else if (matches.length > 1) {
        appendLines(matches.join("    "), "muted");
      }
    } else if (event.key.toLowerCase() === "l" && event.ctrlKey) {
      event.preventDefault();
      output.replaceChildren();
    } else if (event.key.toLowerCase() === "c" && event.ctrlKey) {
      event.preventDefault();
      appendLines("^C", "muted");
      input.value = "";
    }
  });

  closeButton.setAttribute("aria-label", copy[language].close);
  closeButton.querySelector(".sr-only").textContent = copy[language].close;
  status.textContent = copy[language].session;
  input.placeholder = copy[language].placeholder;
  terminal.querySelector(".site-terminal__quick-actions").setAttribute(
    "aria-label",
    language === "es" ? "Comandos sugeridos" : "Suggested terminal commands"
  );
  closeButton.addEventListener("click", closeTerminal);

  terminal.querySelectorAll("[data-terminal-command]").forEach(function (button) {
    button.addEventListener("click", function () {
      execute(button.dataset.terminalCommand || "");
    });
  });

  terminal.addEventListener("click", function (event) {
    if (event.target === terminal || event.target === screen) input.focus({ preventScroll: true });
  });

  document.addEventListener("keydown", function (event) {
    if (terminal.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeTerminal();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopImmediatePropagation();
      input.focus({ preventScroll: true });
    }
  }, true);
})();
