---
layout: post
title: "cmdpeek te permite descubrir workflows de terminal sin memorizar aliases"
date: 2026-07-27
lang: es
image: https://github.com/user-attachments/assets/afc4dbc5-904a-4005-b221-21bff9f7fae3
description: "cmdpeek es una paleta de comandos buscable para workflows reutilizables de terminal. Te permite encontrar comandos por intención usando nombres, títulos, descripciones, labels y el contenido del propio comando, resolver variables, revisar el resultado final y ejecutarlo de forma segura."
excerpt: "cmdpeek es una paleta de comandos buscable para workflows reutilizables de terminal. Te permite encontrar comandos por intención usando nombres, títulos, descripciones, labels y el contenido del propio comando, resolver variables, revisar el resultado final y ejecutarlo de forma segura."
---

Los aliases de shell son útiles cuando los recuerdas.

El problema aparece cuando tu colección crece tanto que ya no recuerdas:

- el nombre exacto del alias
- qué aliases existen
- cuál resuelve un problema concreto
- qué argumentos espera un comando
- si un comando es seguro para ejecutarlo tal cual

En ese momento, los aliases dejan de ser una ayuda de productividad y empiezan a convertirse en otra cosa que tienes que memorizar.

Ese es el problema que quería resolver con **cmdpeek**.

`cmdpeek` es una paleta de comandos open source para descubrir y ejecutar workflows reutilizables de terminal.

En lugar de recordar un alias exacto como:

```bash
klo
```

puedes buscar por lo que quieres hacer:

```bash
cmdpeek kubernetes logs
```

El comando no tiene que coincidir exactamente con el nombre interno.

`cmdpeek` busca en:

```text
title
name
description
labels
command contents
```

Esto significa que un workflow puede encontrarse usando palabras distintas, nombres antiguos de aliases, conceptos técnicos o incluso una parte del comando que ejecuta por debajo.

> **Los aliases optimizan comandos que recuerdas. cmdpeek te ayuda a descubrir los que no recuerdas.**

---

## Por qué los aliases dejan de escalar

Una colección pequeña de aliases es fácil de gestionar:

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias klo='kubectl logs -f'
```

Pero con el tiempo, estas colecciones suelen crecer hasta tener decenas o cientos de entradas relacionadas con:

- Kubernetes
- Flux
- Git
- GitHub Actions
- AWS
- Terraform
- desarrollo local
- troubleshooting
- conversión multimedia
- despliegues

Los comandos pueden seguir siendo útiles, pero recordar sus nombres se vuelve difícil.

Puede que recuerdes que creaste algo para:

- descargar logs de GitHub Actions
- forzar la reconciliación de un HelmRelease de Flux
- cambiar el contexto de Kubernetes
- inspeccionar shards de Elasticsearch
- convertir un GIF en MP4

Pero puede que no recuerdes si el alias se llamaba:

```text
ghlogs
download-run
gha-debug
flux-force
hr-reconcile
gif2mp4
```

`cmdpeek` elimina esa dependencia de nombres exactos.

Un comando puede incluir metadatos ricos y buscables:

```yaml
- name: force-reconcile-flux-helmrelease
  title: Force Flux HelmRelease reconciliation
  description: Select a namespace and HelmRelease, then force Flux to reconcile it with its source.
  labels:
    - flux
    - fluxcd
    - helm
    - helmrelease
    - reconcile
    - force
    - kubernetes
    - gitops
    - troubleshooting
```

Ese mismo comando puede encontrarse con búsquedas como:

```text
flux force
helm reconcile
gitops troubleshooting
helmrelease
```

Los nombres históricos de aliases también pueden mantenerse como labels, de modo que un atajo mental antiguo siga funcionando sin necesidad de definir otro alias de shell.

---

## Buscar por intención

La idea principal de `cmdpeek` es sencilla:

```text
Buscar por intención
        ↓
Seleccionar un workflow
        ↓
Resolver sus variables
        ↓
Revisar el comando generado
        ↓
Confirmar y ejecutar
```

El catálogo se define en YAML, lo que facilita revisar, versionar, compartir y extender los workflows.

Un comando puede incluir:

- un nombre interno estable
- un título legible
- una descripción detallada
- labels buscables
- un script de shell
- variables interactivas
- selectores dinámicos generados por comandos

Por ejemplo:

```yaml
- name: pod-logs
  title: Follow Kubernetes pod logs
  description: Select a namespace and stream logs from one of its pods
  labels:
    - kubernetes
    - pods
    - logs
    - troubleshooting
    - stream
    - klo
  run: kubectl logs -f "{{pod}}" -n "{{namespace}}"
```

Este workflow puede encontrarse mediante:

```text
pod logs
kubernetes troubleshooting
stream
klo
```

El nombre exacto deja de ser el único punto de entrada.

---

## Demo: buscar dentro de un catálogo grande

<img width="2800" height="1800" alt="cmdpeek-search-scroll-demo" src="https://github.com/user-attachments/assets/afc4dbc5-904a-4005-b221-21bff9f7fae3" />

El catálogo interactivo soporta:

```text
/         Buscar
↑ / ↓     Navegar
← / →     Cambiar de página
e         Abrir detalles
Enter     Seleccionar
q         Salir
```

Las búsquedas se ordenan según la relevancia de los metadatos del comando.

También se pueden combinar varios términos:

```text
github logs
production deploy
elasticsearch size
kubernetes context
```

Un resultado puede coincidir por su título, descripción, labels, nombre interno o contenido del script.

Esto es especialmente útil para comandos importantes que no usas con suficiente frecuencia como para recordarlos.

---

## Empezar una búsqueda directamente desde la línea de comandos

También puedes pasar términos de búsqueda directamente después de `cmdpeek`:

```bash
cmdpeek kubernetes context
cmdpeek github logs
cmdpeek elasticsearch shards
```

Los argumentos se unen y se convierten en una búsqueda inicial.

El comportamiento depende del número de resultados:

```text
nombre exacto del comando → abre ese workflow directamente
un único resultado        → abre ese workflow directamente
varios resultados         → muestra el catálogo ya filtrado
ningún resultado          → muestra el catálogo sin coincidencias
```

Esto permite que `cmdpeek` funcione como un sistema de aliases descubrible.

Cuando sabes aproximadamente lo que quieres, puedes empezar con:

```bash
cmdpeek elastic
```

en lugar de abrir el catálogo completo y escribir el filtro manualmente.

---

## Demo: búsqueda directa y selección automática

<img width="1800" height="800" alt="cmdpeek-search-demo-filter" src="https://github.com/user-attachments/assets/ec0f0579-82d6-4d92-9e98-63ddb3161705" />

Cuando una búsqueda devuelve varios workflows, `cmdpeek` abre la lista filtrada.

Cuando la búsqueda devuelve solo uno, se salta la lista y entra directamente en el comando.

Por ejemplo:

```bash
cmdpeek gif
```

puede abrir directamente un workflow de conversión de GIF a MP4 si es el único resultado.

Esto mantiene la herramienta rápida cuando ya conoces la intención, pero conserva la capacidad de descubrimiento cuando la búsqueda es más amplia.

---

## Variables interactivas en lugar de aliases frágiles

Los aliases se vuelven difíciles de mantener cuando los comandos necesitan parámetros.

Un alias puede funcionar bien para un comando fijo:

```bash
alias klo='kubectl logs -f'
```

Pero los workflows reales suelen necesitar valores como:

- namespace
- pod
- entorno
- branch
- ruta de fichero
- HelmRelease
- URL de GitHub Actions
- mensaje de commit

`cmdpeek` soporta cuatro fuentes de variables:

| Fuente | Propósito |
|---|---|
| `input` | Entrada libre del usuario |
| `options` | Valores estáticos seleccionables |
| `environment` | Valor inicial cargado desde una variable de entorno |
| `command` | Opciones generadas ejecutando un comando |

Un workflow de Kubernetes puede generar namespaces dinámicamente:

```yaml
variables:
  - name: namespace
    prompt: Select Kubernetes namespace
    source:
      type: command
      command: >-
        kubectl get namespaces
        -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
```

Una segunda variable puede depender de la primera:

```yaml
  - name: pod
    prompt: Select pod
    source:
      type: command
      command: >-
        kubectl get pods -n "{{namespace}}"
        -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
```

Esto convierte un comando en un workflow guiado, en lugar de una cadena que tienes que recordar y editar manualmente.

---

## Selectores dinámicos

Las variables generadas mediante comandos son especialmente útiles para workflows de DevOps.

Pueden listar:

- namespaces de Kubernetes
- pods
- contextos
- HelmReleases de Flux
- branches de Git
- perfiles de AWS
- ficheros
- releases
- entornos

Por ejemplo, un workflow de reconciliación de Flux puede listar primero los namespaces y después mostrar únicamente los HelmReleases del namespace seleccionado:

```yaml
variables:
  - name: namespace
    prompt: Select Kubernetes namespace
    source:
      type: command
      command: kubectl get namespaces -o name

  - name: helmrelease
    prompt: Select Flux HelmRelease
    source:
      type: command
      command: >-
        flux get helmreleases
        --namespace "{{namespace}}"
        --no-header
        | awk '{print $1}'
```

El usuario no tiene que recordar ni escribir manualmente los nombres de los recursos.

---

## Preview antes de ejecutar

Los valores de las variables se insertan en la previsualización a medida que se seleccionan.

Los comandos y scripts largos siguen siendo desplazables, lo que permite revisar el resultado final antes de ejecutarlo.

Cuando todas las variables están resueltas, `cmdpeek` muestra el comando completamente generado y exige una confirmación explícita:

```text
Execute this command?

╭────────────────────────────────────────────╮
│ flux reconcile helmrelease svc-time       │
│   -n devbox-phoenix-2                     │
│   --with-source                           │
│   --force                                 │
╰────────────────────────────────────────────╯

y execute   n cancel   enter cancel
```

Esto es especialmente útil para comandos relacionados con:

- entornos de producción
- despliegues
- eliminaciones
- reconciliaciones forzadas
- pushes
- migraciones
- cambios de infraestructura

El comando permanece visible antes de ejecutarse, en lugar de quedar oculto detrás de un alias.

---

## Modo no interactivo

El descubrimiento interactivo es útil cuando no recuerdas el workflow exacto.

Pero a veces ya conoces el nombre del comando y quieres reutilizarlo desde:

- una función de shell
- un script
- CI
- documentación
- otra herramienta

Para esos casos, `cmdpeek` también soporta ejecución no interactiva:

```bash
cmdpeek \
  --no-interactive \
  --name gcommit \
  --set "message=Add non-interactive execution demo"
```

Los valores pueden proporcionarse mediante flags `--set` repetibles:

```bash
cmdpeek \
  --no-interactive \
  --name deploy \
  --set environment=staging \
  --set version=1.4.2
```

El mismo catálogo YAML puede soportar tanto:

```text
descubrimiento interactivo
como
ejecución automatizable
```

---

## Demo: reutilizar un workflow de forma no interactiva

<img width="1800" height="800" alt="cmdpeek-non-interactive-gcommit" src="https://github.com/user-attachments/assets/bf6ea668-159a-4379-b0ed-fe233c17c92e" />

Este modo sigue mostrando el comando y pidiendo confirmación, salvo que se use `--yes`.

También existe un modo dry-run:

```bash
cmdpeek \
  --no-interactive \
  --name gcommit \
  --set "message=Preview this commit" \
  --dry-run
```

Esto muestra el comando final sin ejecutarlo.

---

## Catálogos locales y compartidos

Por defecto, `cmdpeek` busca:

```text
.cmdpeek.yaml
```

También se puede configurar una ruta local mediante:

```bash
export CMDPEEK_CONFIG_FILE="$HOME/.config/cmdpeek/commands.yaml"
```

Los catálogos también pueden cargarse desde GitHub:

```bash
export CMDPEEK_CONFIG_GITHUB="company/platform-config:cmdpeek/commands.yaml@main"
```

Para repositorios privados, la autenticación puede proporcionarse mediante:

```bash
export CMDPEEK_GITHUB_TOKEN="github_pat_..."
```

Las configuraciones remotas se almacenan en caché y se actualizan usando ETags de GitHub.

Esto permite mantener:

- un catálogo personal
- un catálogo específico por repositorio
- un catálogo compartido por equipo
- un catálogo versionado para platform engineering

El fichero YAML se convierte en documentación ejecutable para workflows que, de otro modo, estarían repartidos entre aliases, historial de shell, snippets y README.

---

## Ejemplos de workflows

El mismo catálogo puede describir tareas muy distintas.

### Analizar logs de GitHub Actions

```bash
cmdpeek github logs
```

El workflow puede pedir una URL de un run o job de GitHub Actions, descargar los logs, extraerlos y prepararlos para analizarlos.

### Forzar la reconciliación de un HelmRelease de Flux

```bash
cmdpeek flux force
```

El workflow puede seleccionar interactivamente un namespace y un HelmRelease antes de ejecutar:

```bash
flux reconcile helmrelease <name> \
  --namespace <namespace> \
  --with-source \
  --force
```

### Cambiar el contexto de Kubernetes

```bash
cmdpeek kubernetes context
```

Los contextos disponibles pueden generarse dinámicamente desde el kubeconfig actual.

### Convertir un GIF en MP4

```bash
cmdpeek gif mp4
```

El workflow puede pedir las rutas de entrada y salida y ejecutar siempre la misma conversión con `ffmpeg`.

### Ejecutar un workflow de Git commit

```bash
cmdpeek \
  --no-interactive \
  --name gcommit \
  --set "message=Document cmdpeek workflows"
```

---

## Instalación

### Homebrew

Linux y macOS:

```bash
brew tap pierinho13/tools
brew install --cask cmdpeek
```

Actualizar:

```bash
brew update
brew upgrade --cask cmdpeek
```

---

### GitHub Releases

Hay binarios precompilados disponibles a través de GitHub Releases.

---

### Compilar desde el código fuente

```bash
git clone https://github.com/pierinho13/cmdpeek.git
cd cmdpeek

go build -o cmdpeek ./cmd/cmdpeek
sudo mv cmdpeek /usr/local/bin/
```

---

## Inicio rápido

Crea `.cmdpeek.yaml`:

```yaml
version: 1
shell: bash

commands:
  - name: greet
    title: Greet a person
    description: Print a personalized greeting
    labels:
      - example
      - greeting
      - hello
    run: |
      name="{{name}}"
      echo "Hello, ${name}!"
    variables:
      - name: name
        prompt: Person name
        default: world
        source:
          type: input
```

Después ejecuta:

```bash
cmdpeek
```

O busca directamente:

```bash
cmdpeek greeting
```

---

## ¿Por qué no usar simplemente aliases, fzf o un task runner?

`cmdpeek` no pretende reemplazar todos los aliases, fuzzy finders o task runners.

Los aliases siguen siendo ideales para comandos muy cortos que usas constantemente y recuerdas con facilidad.

Los task runners son excelentes para tareas de build y automatización definidas dentro de un repositorio.

`fzf` es excelente para filtrar cualquier flujo de texto.

El enfoque de `cmdpeek` es diferente:

```text
descubrimiento estructurado por intención
+
resolución guiada de variables
+
preview en tiempo real
+
ejecución segura
```

Los metadatos buscables forman parte del propio modelo del comando.

Un workflow no es solo una cadena de shell. Tiene título, descripción, labels, variables y comportamiento de ejecución.

Eso hace que sea más fácil descubrirlo meses después, compartirlo con otras personas y evolucionarlo sin crear más aliases.

---

## Reflexiones finales

El objetivo principal de `cmdpeek` no es simplemente ejecutar comandos.

El objetivo es hacer descubribles los workflows útiles de terminal.

Un comando que no recuerdas prácticamente no existe cuando lo necesitas.

Al buscar nombres, títulos, descripciones, labels y contenido del propio comando, `cmdpeek` permite encontrar workflows usando las palabras que recuerdas en ese momento.

Eso es lo que lo diferencia de un fichero enorme de aliases.

En lugar de preguntarte:

> ¿Cómo llamé a ese alias?

puedes preguntarte:

> ¿Qué quiero hacer?

El proyecto es open source:

**https://github.com/pierinho13/cmdpeek**

Las contribuciones, feedback, nuevos ejemplos de workflows, mejoras de documentación, tests, soporte de packaging e ideas para la TUI son muy bienvenidas.

Si te interesa este tipo de trabajo de platform engineering, puedes conocer mejor mi experiencia o [contactar conmigo](/es/contact).
