(function () {
  "use strict";

  var terminals = document.querySelectorAll("[data-portfolio-terminal]");
  if (!terminals.length) {
    return;
  }

  var content = {
    en: {
      welcome: "Interactive portfolio shell ready. Type help or choose a suggested command.",
      demoDone: "Your turn. Try help or select a command below.",
      commandNotFound: "Command not available. Run help to see the supported commands.",
      kubectlLimited: "This portfolio shell exposes only safe, read-only demo commands. Run help.",
      help: [
        "Available commands:",
        "  about | whoami",
        "  projects | kubectl get projects | kubectl get pods",
        "  experience | cv | kubectl get experience",
        "  skills | kubectl get skills",
        "  kubectl describe project <github-platform-operator|kubectl-peek|cmdpeek|traefik-plugins>",
        "  contact",
        "  clear"
      ].join("\n"),
      about: [
        "Piero Rospigliosi Beltran",
        "Senior Platform Engineer / Cloud Architect",
        "Focus: Kubernetes, GitOps, cloud platforms, Go and open source",
        "Location: Madrid, Spain"
      ].join("\n"),
      projects: [
        "NAME                       KIND                       LANGUAGE   STATUS",
        "github-platform-operator   GitHub platform operator   Go         active",
        "kubectl-peek               Kubernetes productivity    Go         active",
        "cmdpeek                    Developer productivity     Go         active",
        "traefik-plugins            Middleware collection      Go         production"
      ].join("\n"),
      experience: [
        "COMPANY                  ROLE                        PERIOD",
        "Doodle                   Senior Platform Engineer    2026-present",
        "Service Club             Senior Platform Engineer    2025-2026",
        "SCOR Digital Solutions   Senior Cloud Engineer       2023-2025",
        "iGEO ERP                 Cloud Architect / Engineer  2017-2023",
        "Mercury TFS              Java Developer              2016-2017"
      ].join("\n"),
      skills: [
        "PLATFORM       Kubernetes, EKS, GKE, Traefik, Gateway API",
        "CLOUD          AWS, GCP, Azure",
        "DELIVERY       Terraform, Flux, Argo CD, Helm, Kustomize",
        "OBSERVABILITY  Prometheus, Grafana, Elastic, OpenTelemetry",
        "SECURITY       Kyverno, IAM, TLS, network policies",
        "LANGUAGES      Go, Java, Bash"
      ].join("\n"),
      contact: [
        "Email:    piero.rospigliosib@gmail.com",
        "LinkedIn: piero-rospigliosi-beltran-cv",
        "GitHub:   pierinho13"
      ].join("\n"),
      experienceLink: "Open the complete experience page",
      contactLink: "Open the contact page",
      projectUnknown: "Unknown project. Use kubectl get projects to list the available names.",
      projectsDetail: {
        "github-platform-operator": {
          text: [
            "Name:        github-platform-operator",
            "Purpose:     Kubernetes operator for declarative GitHub platform management",
            "Highlights:  Repositories, teams, rulesets, access, environments, secrets and variables",
            "Language:    Go",
            "Status:      Active"
          ].join("\n"),
          label: "Open github-platform-operator on GitHub",
          href: "https://github.com/pierinho13/github-platform-operator"
        },
        "kubectl-peek": {
          text: [
            "Name:        kubectl-peek",
            "Purpose:     Interactive Kubernetes productivity CLI",
            "Highlights:  Secret relationships, event investigation and isolated shells",
            "Language:    Go",
            "Status:      Active"
          ].join("\n"),
          label: "Open kubectl-peek on GitHub",
          href: "https://github.com/pierinho13/kubectl-peek"
        },
        "cmdpeek": {
          text: [
            "Name:        cmdpeek",
            "Purpose:     Searchable catalog for reusable terminal workflows",
            "Highlights:  Intent search, guided variables, live preview and confirmation",
            "Language:    Go",
            "Status:      Active"
          ].join("\n"),
          label: "Open cmdpeek on GitHub",
          href: "https://github.com/pierinho13/cmdpeek"
        },
        "traefik-plugins": {
          text: [
            "Name:        traefik-plugins",
            "Purpose:     Production middleware plugins for Traefik",
            "Highlights:  Bulk Redirects, Dynamic Redirects and Response Cookies",
            "Language:    Go",
            "Status:      Published in the official Traefik Plugin Catalog"
          ].join("\n"),
          label: "Open the Traefik Plugin Catalog",
          href: "https://plugins.traefik.io/plugins/6a3e32199dbe8a37899c23c2/bulk-redirects"
        }
      }
    },
    es: {
      welcome: "Shell interactiva del portfolio lista. Escribe help o elige un comando sugerido.",
      demoDone: "Tu turno. Prueba help o selecciona un comando.",
      commandNotFound: "Comando no disponible. Ejecuta help para ver los comandos soportados.",
      kubectlLimited: "Esta shell del portfolio solo expone comandos de demostracion seguros y de solo lectura. Ejecuta help.",
      help: [
        "Comandos disponibles:",
        "  about | whoami",
        "  projects | kubectl get projects | kubectl get pods",
        "  experience | cv | kubectl get experience",
        "  skills | kubectl get skills",
        "  kubectl describe project <github-platform-operator|kubectl-peek|cmdpeek|traefik-plugins>",
        "  contact",
        "  clear"
      ].join("\n"),
      about: [
        "Piero Rospigliosi Beltran",
        "Senior Platform Engineer / Cloud Architect",
        "Especialidad: Kubernetes, GitOps, cloud, Go y open source",
        "Ubicacion: Madrid, Espana"
      ].join("\n"),
      projects: [
        "NAME                       KIND                            LANGUAGE   STATUS",
        "github-platform-operator   Operador de plataforma GitHub   Go         active",
        "kubectl-peek               Productividad Kubernetes        Go         active",
        "cmdpeek                    Productividad developer         Go         active",
        "traefik-plugins            Coleccion de middlewares        Go         production"
      ].join("\n"),
      experience: [
        "EMPRESA                  ROL                         PERIODO",
        "Doodle                   Senior Platform Engineer    2026-actualidad",
        "Service Club             Senior Platform Engineer    2025-2026",
        "SCOR Digital Solutions   Senior Cloud Engineer       2023-2025",
        "iGEO ERP                 Cloud Architect / Engineer  2017-2023",
        "Mercury TFS              Java Developer              2016-2017"
      ].join("\n"),
      skills: [
        "PLATAFORMA     Kubernetes, EKS, GKE, Traefik, Gateway API",
        "CLOUD          AWS, GCP, Azure",
        "ENTREGA        Terraform, Flux, Argo CD, Helm, Kustomize",
        "OBSERVABILIDAD Prometheus, Grafana, Elastic, OpenTelemetry",
        "SEGURIDAD      Kyverno, IAM, TLS, network policies",
        "LENGUAJES      Go, Java, Bash"
      ].join("\n"),
      contact: [
        "Email:    piero.rospigliosib@gmail.com",
        "LinkedIn: piero-rospigliosi-beltran-cv",
        "GitHub:   pierinho13"
      ].join("\n"),
      experienceLink: "Abrir la pagina completa de experiencia",
      contactLink: "Abrir la pagina de contacto",
      projectUnknown: "Proyecto desconocido. Usa kubectl get projects para listar los nombres disponibles.",
      projectsDetail: {
        "github-platform-operator": {
          text: [
            "Name:        github-platform-operator",
            "Objetivo:    Operador de Kubernetes para gestionar plataformas GitHub de forma declarativa",
            "Funciones:   Repositorios, equipos, rulesets, accesos, entornos, secretos y variables",
            "Lenguaje:    Go",
            "Estado:      Activo"
          ].join("\n"),
          label: "Abrir github-platform-operator en GitHub",
          href: "https://github.com/pierinho13/github-platform-operator"
        },
        "kubectl-peek": {
          text: [
            "Name:        kubectl-peek",
            "Objetivo:    CLI interactiva de productividad para Kubernetes",
            "Funciones:   Relaciones de Secrets, eventos y shells aisladas",
            "Lenguaje:    Go",
            "Estado:      Activo"
          ].join("\n"),
          label: "Abrir kubectl-peek en GitHub",
          href: "https://github.com/pierinho13/kubectl-peek"
        },
        "cmdpeek": {
          text: [
            "Name:        cmdpeek",
            "Objetivo:    Catalogo buscable de workflows reutilizables",
            "Funciones:   Busqueda por intencion, variables, preview y confirmacion",
            "Lenguaje:    Go",
            "Estado:      Activo"
          ].join("\n"),
          label: "Abrir cmdpeek en GitHub",
          href: "https://github.com/pierinho13/cmdpeek"
        },
        "traefik-plugins": {
          text: [
            "Name:        traefik-plugins",
            "Objetivo:    Plugins middleware de produccion para Traefik",
            "Funciones:   Bulk Redirects, Dynamic Redirects y Response Cookies",
            "Lenguaje:    Go",
            "Estado:      Publicados en el catalogo oficial de Traefik"
          ].join("\n"),
          label: "Abrir el catalogo de plugins de Traefik",
          href: "https://plugins.traefik.io/plugins/6a3e32199dbe8a37899c23c2/bulk-redirects"
        }
      }
    }
  };

  terminals.forEach(function (root) {
    var language = root.getAttribute("data-language") === "es" ? "es" : "en";
    var strings = content[language];
    var output = root.querySelector("[data-terminal-output]");
    var form = root.querySelector("[data-terminal-form]");
    var input = root.querySelector("[data-terminal-input]");
    var suggestionButtons = root.querySelectorAll("[data-terminal-command]");
    var history = [];
    var historyIndex = 0;
    var demoVersion = 0;
    var demoLine = null;
    var demoRunning = false;

    function scrollToBottom() {
      output.scrollTop = output.scrollHeight;
    }

    function appendLine(text, variant) {
      var line = document.createElement("div");
      line.className = "terminal-line" + (variant ? " terminal-line--" + variant : "");
      line.textContent = text;
      output.appendChild(line);
      scrollToBottom();
      return line;
    }

    function appendCommand(command) {
      var line = document.createElement("div");
      line.className = "terminal-line terminal-line--command";

      var prompt = document.createElement("span");
      prompt.className = "terminal-command-prompt";
      prompt.textContent = "visitor@k8sready:~$ ";

      var value = document.createElement("span");
      value.className = "terminal-command-text";
      value.textContent = command;

      line.appendChild(prompt);
      line.appendChild(value);
      output.appendChild(line);
      scrollToBottom();
      return { line: line, value: value };
    }

    function appendBlock(text) {
      var block = document.createElement("div");
      block.className = "terminal-block";
      block.textContent = text;
      output.appendChild(block);
      scrollToBottom();
    }

    function appendLink(label, href) {
      var line = document.createElement("div");
      line.className = "terminal-link-line";

      var link = document.createElement("a");
      link.href = href;
      link.textContent = label + " ->";
      if (/^https?:\/\//.test(href)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      line.appendChild(link);
      output.appendChild(line);
      scrollToBottom();
    }

    function normalize(command) {
      return command
        .trim()
        .replace(/^\$\s*/, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    function responseFor(rawCommand) {
      var command = normalize(rawCommand);
      var internalExperience = language === "es" ? "/es/experiencia/" : "/en/experience/";
      var internalContact = language === "es" ? "/es/contacto/" : "/en/contact/";

      if (command === "help" || command === "?") {
        return { text: strings.help };
      }

      if (command === "about" || command === "whoami") {
        return { text: strings.about };
      }

      if (
        command === "projects" ||
        command === "ls" ||
        command === "kubectl get projects" ||
        command === "kubectl get pods" ||
        command === "kubectl get pods -n portfolio" ||
        command === "kubectl get all"
      ) {
        return { text: strings.projects };
      }

      if (
        command === "experience" ||
        command === "cv" ||
        command === "kubectl get experience"
      ) {
        return {
          text: strings.experience,
          link: { label: strings.experienceLink, href: internalExperience }
        };
      }

      if (command === "skills" || command === "kubectl get skills") {
        return { text: strings.skills };
      }

      if (command === "contact") {
        return {
          text: strings.contact,
          link: { label: strings.contactLink, href: internalContact }
        };
      }

      var describeMatch = command.match(/^(?:kubectl\s+)?describe(?:\s+project)?\s+([a-z0-9-]+)$/);
      if (describeMatch) {
        var project = strings.projectsDetail[describeMatch[1]];
        if (!project) {
          return { error: strings.projectUnknown };
        }
        return {
          text: project.text,
          link: { label: project.label, href: project.href }
        };
      }

      if (command.indexOf("kubectl ") === 0) {
        return { error: strings.kubectlLimited };
      }

      return { error: strings.commandNotFound };
    }

    function execute(rawCommand, options) {
      var command = rawCommand.trim();
      if (!command) {
        return;
      }

      var normalized = normalize(command);
      if (normalized === "clear") {
        output.textContent = "";
        return;
      }

      appendCommand(command);

      var response = responseFor(command);
      if (response.error) {
        appendLine(response.error, "error");
        return;
      }

      if (response.text) {
        appendBlock(response.text);
      }

      if (response.link) {
        appendLink(response.link.label, response.link.href);
      }

      if (!options || !options.skipHistory) {
        if (history[history.length - 1] !== command) {
          history.push(command);
        }
        historyIndex = history.length;
      }
    }

    function wait(milliseconds) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, milliseconds);
      });
    }

    function cancelDemo(showReadyMessage) {
      if (!demoRunning) {
        return;
      }

      demoVersion += 1;
      demoRunning = false;

      if (demoLine && demoLine.parentNode) {
        demoLine.parentNode.removeChild(demoLine);
      }
      demoLine = null;

      if (showReadyMessage) {
        appendLine(strings.welcome, "muted");
      }
    }

    async function typeDemoCommand(command, version) {
      var parts = appendCommand("");
      demoLine = parts.line;

      for (var index = 0; index < command.length; index += 1) {
        if (version !== demoVersion) {
          return false;
        }
        parts.value.textContent += command.charAt(index);
        scrollToBottom();
        await wait(22);
      }

      demoLine = null;
      return version === demoVersion;
    }

    async function runDemo() {
      var version = ++demoVersion;
      demoRunning = true;
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var commands = ["whoami", "kubectl get projects"];

      appendLine("K8sReady portfolio shell v1.0", "success");
      appendLine(language === "es" ? "Iniciando demo guiada..." : "Starting guided demo...", "muted");

      for (var index = 0; index < commands.length; index += 1) {
        if (version !== demoVersion) {
          return;
        }

        if (reduceMotion) {
          execute(commands[index], { skipHistory: true });
        } else {
          await wait(index === 0 ? 420 : 650);
          if (!(await typeDemoCommand(commands[index], version))) {
            return;
          }
          var response = responseFor(commands[index]);
          if (response.text) {
            appendBlock(response.text);
          }
          if (response.link) {
            appendLink(response.link.label, response.link.href);
          }
        }
      }

      if (version !== demoVersion) {
        return;
      }

      await wait(reduceMotion ? 0 : 450);
      appendLine(strings.demoDone, "muted");
      demoRunning = false;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      cancelDemo(false);
      var command = input.value;
      input.value = "";
      execute(command);
    });

    input.addEventListener("focus", function () {
      cancelDemo(true);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!history.length) {
          return;
        }
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex] || "";
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!history.length) {
          return;
        }
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = historyIndex === history.length ? "" : history[historyIndex];
      } else if (event.key === "Escape") {
        input.value = "";
      } else if (event.key.toLowerCase() === "l" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        output.textContent = "";
      }
    });

    suggestionButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        cancelDemo(false);
        execute(button.getAttribute("data-terminal-command"));
        input.focus();
      });
    });

    var demoSeen = false;
    try {
      demoSeen = window.sessionStorage.getItem("k8sready-terminal-demo-v1") === "seen";
      if (!demoSeen) {
        window.sessionStorage.setItem("k8sready-terminal-demo-v1", "seen");
      }
    } catch (error) {
      demoSeen = false;
    }

    if (demoSeen) {
      appendLine("K8sReady portfolio shell v1.0", "success");
      appendLine(strings.welcome, "muted");
    } else {
      runDemo();
    }
  });
})();
