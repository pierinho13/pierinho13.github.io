---
layout: post
title: "kubectl-peek: entiende las relaciones de los Secrets de Kubernetes desde la terminal"
date: 2026-07-17
lang: es
image: https://github.com/user-attachments/assets/b13f3b4d-da5b-46ed-97bb-ba07d3001e61
excerpt: "kubectl-peek es un plugin interactivo para kubectl que permite inspeccionar Secrets de Kubernetes, descubrir dónde se utilizan y ampliar el descubrimiento de relaciones a tus propios CRDs."
---

Trabajar con Secrets de Kubernetes es sencillo... hasta que necesitas responder preguntas como:

- **¿Qué contiene realmente este Secret?**
- **¿Qué workloads lo están utilizando?**
- **¿Ha sido generado por algún operador?**
- **¿Puedo eliminarlo sin romper nada?**

Responder a estas preguntas suele implicar varios comandos de `kubectl`, decodificar valores en Base64, buscar entre Deployments, Pods y manifiestos, e incluso revisar CRDs específicos de cada operador.

Quería una forma mucho más sencilla de hacerlo.

Por eso nació **kubectl-peek**.

`kubectl-peek` es una CLI interactiva y un plugin nativo de `kubectl` que permite inspeccionar Secrets y entender las relaciones que tienen con el resto de recursos del namespace, directamente desde la terminal.

Sin controladores.

Sin instalar nada dentro del clúster.

Sin interfaces web.

Todo funciona utilizando el `kubeconfig`, el contexto y los permisos RBAC que ya tienes.

---

# ¿Por qué lo he creado?

Mi objetivo era desarrollar una herramienta que siguiera siendo extremadamente simple, pero realmente útil en el trabajo diario de Platform Engineering.

Quería algo que:

- funcionase con cualquier clúster de Kubernetes
- no necesitara instalar componentes adicionales
- respetara el kubeconfig y el RBAC existentes
- fuese lo bastante rápido como para formar parte del flujo habitual de trabajo

En lugar de ir copiando nombres de Secrets entre comandos, decodificando valores y abriendo Deployments para buscar referencias, quería tener toda esa información reunida en una única vista.

---

# ¿Qué hace kubectl-peek?

La herramienta proporciona un explorador interactivo de Secrets directamente desde la terminal.

Permite:

- explorar Secrets
- filtrar de forma interactiva
- inspeccionar valores decodificados
- descubrir dónde se utiliza un Secret
- detectar recursos que generan Secrets
- ampliar el descubrimiento mediante reglas YAML para CRDs propios
- utilizarlo tanto como `kubectl-peek` como mediante `kubectl peek`

---

# Demo

<img width="1200" height="700" alt="Demo de kubectl-peek" src="https://github.com/user-attachments/assets/b13f3b4d-da5b-46ed-97bb-ba07d3001e61" />

El flujo de trabajo es deliberadamente sencillo:

1. Ejecutar `kubectl-peek`
2. Filtrar la lista de Secrets
3. Abrir uno de ellos
4. Revisar sus metadatos
5. Consultar los valores decodificados
6. Ver todos los recursos relacionados

---

# Descubrimiento integrado de relaciones

Desde el primer momento, `kubectl-peek` detecta automáticamente referencias desde los recursos más habituales de Kubernetes.

Actualmente soporta:

- Pods
- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs
- ServiceAccounts
- Ingresses
- Gateways de Gateway API

Detecta referencias mediante:

- volúmenes basados en Secrets
- projected Secret volumes
- `imagePullSecrets`
- variables de entorno
- `envFrom`
- init containers
- ephemeral containers
- certificados TLS de Gateway API
- configuración TLS de Ingress

Ejemplo:

```text
Secret: database-credentials

Used by:

Deployment/backend
  uses: container environment (container/backend envFrom)

CronJob/backup
  uses: container environment variable (container/backup env/BACKUP_PASSWORD -> password)

Ingress/web
  uses: TLS certificate (spec.tls[0].secretName)
```

Esto facilita enormemente comprobar si un Secret sigue utilizándose antes de eliminarlo o rotarlo.

---

# Descubre relaciones también en tus propios CRDs

La funcionalidad más reciente de `kubectl-peek` es el soporte para **descubrimiento personalizado de relaciones**.

En lugar de incorporar soporte específico para cada operador de Kubernetes, la herramienta puede cargar reglas desde un sencillo fichero YAML.

De esta forma puedes añadir soporte para recursos como:

- External Secrets Operator
- cert-manager
- Crossplane
- APIs internas de plataforma
- cualquier CRD propio

sin modificar una sola línea de código de la aplicación.

Ejemplo:

```yaml
rules:
  - apiVersions:
      - external-secrets.io/v1
      - external-secrets.io/v1beta1

    kind: ExternalSecret
    resource: externalsecrets

    references:
      - path: spec.target.name
        relation: produces
        description: generated Secret
```

Las reglas pueden cargarse puntualmente:

```bash
kubectl-peek --rules rules.yaml
```

o configurarse una única vez:

```bash
export KUBECTL_PEEK_RULE_FILE="$HOME/.config/kubectl-peek/rules.yaml"
```

Las relaciones descubiertas mediante reglas YAML se combinan automáticamente con el descubrimiento integrado.

---

# Instalación

## Homebrew

```bash
brew tap pierinho13/tools
brew install --cask kubectl-peek
```

---

## GitHub Releases

Se publican binarios precompilados para macOS, Linux y Windows.

Solo tienes que descargar el archivo correspondiente, extraerlo y mover el binario a un directorio incluido en tu `PATH`.

---

## Compilar desde el código fuente

```bash
git clone https://github.com/pierinho13/kubectl-peek.git

cd kubectl-peek

go build -o kubectl-peek .
```

---

# Uso básico

Explorar Secrets:

```bash
kubectl-peek
```

Filtrar por nombre:

```bash
kubectl-peek database
```

Usar otro namespace:

```bash
kubectl-peek -n staging
```

Usar un kubeconfig diferente:

```bash
kubectl-peek --kubeconfig ~/.kube/config
```

Cargar reglas personalizadas:

```bash
kubectl-peek --rules rules.yaml
```

---

# Seguridad

`kubectl-peek` muestra los valores decodificados de los Secrets directamente en la terminal.

Ten presente que esos valores pueden permanecer visibles en:

- el historial de la terminal
- grabaciones de pantalla
- capturas
- sesiones compartidas

Debe utilizarse únicamente en entornos de confianza y con los permisos RBAC mínimos necesarios.

---

# Conclusión

`kubectl-peek` comenzó como una pequeña utilidad para inspeccionar Secrets de forma más cómoda.

Con el tiempo ha evolucionado hasta convertirse en una herramienta para responder una pregunta mucho más útil:

> **"¿Qué relación tiene este Secret con el resto de recursos de mi clúster?"**

Ya sea un Secret consumido por un Deployment, generado por External Secrets Operator, producido por Crossplane o referenciado por cualquier CRD propio, `kubectl-peek` puede mostrar todas esas relaciones en una única vista.

El proyecto es completamente open source y está disponible en GitHub:

**https://github.com/pierinho13/kubectl-peek**


Si te interesa este tipo de trabajo de platform engineering, puedes conocer más sobre mi experiencia o [ponerte en contacto](/contact).