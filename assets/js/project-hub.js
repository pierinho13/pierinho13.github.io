(function () {
  "use strict";

  var cards = document.querySelectorAll("[data-project]");
  if (!cards.length) return;

  var lang = document.documentElement.lang === "es" ? "es" : "en";
  var locale = lang === "es" ? "es-ES" : "en-US";
  var copy = {
    en: {
      unavailable: "Not available yet",
      noRelease: "No release",
      updated: "Updated {value}",
      today: "today",
      yesterday: "yesterday",
      daysAgo: "{days} days ago",
      stale: "GitHub metadata could not be refreshed. Showing the latest available values.",
      generated: "GitHub metadata refreshed {value}.",
      install: "Install {project}",
      choose: "Choose an installation method",
      copy: "Copy command",
      copied: "Copied",
      close: "Close installer",
      source: "Source",
      homebrew: "Homebrew",
      helm: "Helm OCI"
    },
    es: {
      unavailable: "Todavía no disponible",
      noRelease: "Sin versión",
      updated: "Actualizado {value}",
      today: "hoy",
      yesterday: "ayer",
      daysAgo: "hace {days} días",
      stale: "No se pudieron actualizar los datos de GitHub. Se muestran los últimos valores disponibles.",
      generated: "Datos de GitHub actualizados {value}.",
      install: "Instalar {project}",
      choose: "Elige un método de instalación",
      copy: "Copiar comando",
      copied: "Copiado",
      close: "Cerrar instalador",
      source: "Código fuente",
      homebrew: "Homebrew",
      helm: "Helm OCI"
    }
  }[lang];

  var installers = {
    "github-platform-operator": [
      {
        id: "helm",
        label: copy.helm,
        command: "helm upgrade --install github-platform-operator \\\n  oci://ghcr.io/pierinho13/charts/github-platform-operator \\\n  --namespace github-platform-operator-system \\\n  --create-namespace"
      },
      {
        id: "source",
        label: copy.source,
        command: "git clone https://github.com/pierinho13/github-platform-operator.git\ncd github-platform-operator\nmake install\nmake deploy"
      }
    ],
    "kubectl-peek": [
      {
        id: "homebrew",
        label: copy.homebrew,
        command: "brew tap pierinho13/tools\nbrew install --cask kubectl-peek"
      },
      {
        id: "source",
        label: copy.source,
        command: "git clone https://github.com/pierinho13/kubectl-peek.git\ncd kubectl-peek\ngo build -o kubectl-peek ."
      }
    ],
    "cmdpeek": [
      {
        id: "homebrew",
        label: copy.homebrew,
        command: "brew tap pierinho13/tools\nbrew install --cask cmdpeek"
      },
      {
        id: "source",
        label: copy.source,
        command: "git clone https://github.com/pierinho13/cmdpeek.git\ncd cmdpeek\ngo build -o cmdpeek ./cmd/cmdpeek"
      }
    ]
  };

  function formatNumber(value) {
    return typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : "—";
  }

  function relativeDate(value) {
    if (!value) return copy.unavailable;
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return copy.unavailable;
    var days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    if (days === 0) return copy.today;
    if (days === 1) return copy.yesterday;
    return copy.daysAgo.replace("{days}", new Intl.NumberFormat(locale).format(days));
  }

  function setField(card, name, value) {
    var element = card.querySelector('[data-project-field="' + name + '"]');
    if (element) element.textContent = value;
  }

  function updateCard(card, project) {
    if (!project) return;
    setField(card, "stars", formatNumber(project.stars));
    setField(card, "downloads", formatNumber(project.downloads));
    setField(card, "release", project.latestRelease || copy.noRelease);
    setField(card, "updated", copy.updated.replace("{value}", relativeDate(project.updatedAt)));
    card.classList.add("project-card--live");
  }

  function updateStatus(generatedAt, success) {
    var status = document.querySelector("[data-project-data-status]");
    if (!status) return;
    status.textContent = success && generatedAt
      ? copy.generated.replace("{value}", relativeDate(generatedAt))
      : copy.stale;
  }

  fetch("/assets/data/projects.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Project data request failed");
      return response.json();
    })
    .then(function (data) {
      cards.forEach(function (card) {
        updateCard(card, data.projects && data.projects[card.dataset.project]);
      });
      updateStatus(data.generatedAt, true);
    })
    .catch(function () {
      updateStatus(null, false);
    });

  var modal;
  var activeTrigger;

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  }

  function ensureModal() {
    if (modal) return modal;

    modal = createElement("div", "project-installer");
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="project-installer__backdrop" data-installer-close></div>',
      '<section class="project-installer__panel" role="dialog" aria-modal="true" aria-labelledby="project-installer-title">',
      '  <div class="project-installer__header">',
      '    <div><p class="project-installer__eyebrow">K8sReady</p><h2 id="project-installer-title"></h2></div>',
      '    <button class="project-installer__close" type="button" data-installer-close aria-label="' + copy.close + '">Esc</button>',
      '  </div>',
      '  <p class="project-installer__hint">' + copy.choose + '</p>',
      '  <div class="project-installer__methods" role="tablist"></div>',
      '  <div class="project-installer__command-wrap">',
      '    <pre><code data-installer-command></code></pre>',
      '    <button class="project-installer__copy" type="button" data-installer-copy>' + copy.copy + '</button>',
      '  </div>',
      '</section>'
    ].join("");

    document.body.appendChild(modal);
    modal.querySelectorAll("[data-installer-close]").forEach(function (button) {
      button.addEventListener("click", closeInstaller);
    });
    modal.querySelector("[data-installer-copy]").addEventListener("click", copyCommand);
    return modal;
  }

  function renderMethod(method, selected) {
    var button = createElement("button", "project-installer__method", method.label);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(selected));
    if (selected) button.classList.add("is-active");
    button.addEventListener("click", function () {
      modal.querySelectorAll(".project-installer__method").forEach(function (item) {
        item.classList.remove("is-active");
        item.setAttribute("aria-selected", "false");
      });
      button.classList.add("is-active");
      button.setAttribute("aria-selected", "true");
      modal.querySelector("[data-installer-command]").textContent = method.command;
    });
    return button;
  }

  function openInstaller(project, trigger) {
    var methods = installers[project];
    if (!methods || !methods.length) return;
    activeTrigger = trigger;
    var dialog = ensureModal();
    dialog.querySelector("#project-installer-title").textContent = copy.install.replace("{project}", project);
    var methodsNode = dialog.querySelector(".project-installer__methods");
    methodsNode.textContent = "";
    methods.forEach(function (method, index) {
      methodsNode.appendChild(renderMethod(method, index === 0));
    });
    dialog.querySelector("[data-installer-command]").textContent = methods[0].command;
    dialog.querySelector("[data-installer-copy]").textContent = copy.copy;
    dialog.hidden = false;
    document.documentElement.classList.add("installer-open");
    window.setTimeout(function () {
      dialog.querySelector(".project-installer__method").focus();
    }, 0);
  }

  function closeInstaller() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove("installer-open");
    if (activeTrigger) activeTrigger.focus();
  }

  async function copyCommand() {
    var command = modal.querySelector("[data-installer-command]").textContent;
    var button = modal.querySelector("[data-installer-copy]");
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      var textarea = document.createElement("textarea");
      textarea.value = command;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    button.textContent = copy.copied;
    window.setTimeout(function () { button.textContent = copy.copy; }, 1600);
  }

  document.querySelectorAll("[data-install-project]").forEach(function (button) {
    button.addEventListener("click", function () {
      openInstaller(button.dataset.installProject, button);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeInstaller();
  });
})();
