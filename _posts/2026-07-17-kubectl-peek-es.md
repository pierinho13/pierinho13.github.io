---
layout: post
title: "kubectl-peek: entiende las relaciones de los Secrets de Kubernetes desde la terminal"
date: 2026-07-17
lang: es
image: https://github.com/user-attachments/assets/c6c5b2ac-0ea4-4774-8315-12021e88e829
excerpt: "kubectl-peek es un plugin interactivo para kubectl que permite inspeccionar Secrets de Kubernetes, ocultar sus valores cuando sea necesario y descubrir los recursos que los usan, producen o referencian."
---

Trabajar con Secrets de Kubernetes es sencillo hasta que necesitas responder preguntas como:

- **¿Qué contiene realmente este Secret?**
- **¿Qué workloads lo están utilizando?**
- **¿Ha sido generado por algún operador?**
- **¿Puedo eliminarlo sin romper nada?**

Responder a estas preguntas suele implicar varios comandos de `kubectl`, decodificar valores en Base64, buscar entre manifiestos y revisar recursos personalizados uno por uno.

Quería una forma mucho más sencilla de hacerlo.

Por eso nació **kubectl-peek**.

`kubectl-peek` es una CLI interactiva y un plugin nativo de `kubectl` centrado en inspeccionar Secrets de Kubernetes y entender sus relaciones directamente desde la terminal.

Sin controladores.

Sin CRDs instalados por la herramienta.

Sin interfaz web.

Sin componentes dentro del clúster.

Todo funciona en local utilizando el `kubeconfig` y los permisos RBAC que ya tienes.

---

## ¿Por qué lo he creado?

Mi objetivo era desarrollar una herramienta deliberadamente pequeña, pero realmente útil para el trabajo diario de Platform Engineering.

Quería algo que:

- funcionase con cualquier clúster de Kubernetes
- no necesitase instalación dentro del clúster
- respetase el kubeconfig y el RBAC existentes
- mantuviese la inspección de Secrets rápida e interactiva
- evitase llamadas adicionales a la API cuando no se necesita descubrir relaciones

En lugar de copiar nombres de Secrets entre comandos, decodificar valores manualmente, abrir manifiestos de workloads y buscar referencias entre operadores o CRDs, quería reunirlo todo en un único flujo.

---

## ¿Qué hace kubectl-peek?

La herramienta proporciona un explorador interactivo de Secrets directamente desde la terminal.

Permite:

- explorar Secrets de un namespace
- filtrar la lista de forma interactiva
- inspeccionar valores decodificados
- ocultar los valores cuando no deben mostrarse
- descubrir recursos que utilizan un Secret
- detectar recursos que producen o referencian un Secret
- ampliar el descubrimiento a recursos personalizados mediante reglas YAML
- utilizarlo tanto como `kubectl-peek` como mediante `kubectl peek`

Por defecto, los valores del Secret se muestran y el descubrimiento de relaciones está desactivado.

Esto mantiene la inspección habitual rápida y evita llamadas innecesarias a la API o avisos de permisos cuando solo necesitas consultar un Secret.

---

## Demo

<img width="1200" height="700" alt="Demo de inspección de Secrets con kubectl-peek" src="https://github.com/user-attachments/assets/c6c5b2ac-0ea4-4774-8315-12021e88e829" />

El flujo básico se mantiene deliberadamente sencillo:

1. Ejecutar `kubectl-peek secret`
2. Filtrar la lista
3. Seleccionar un Secret
4. Revisar sus metadatos
5. Consultar sus valores decodificados u ocultos
6. Activar el descubrimiento de relaciones solo cuando sea necesario

Una segunda vista muestra el flujo de descubrimiento de relaciones:

<img width="1200" height="700" alt="Demo del descubrimiento de relaciones de Secrets con kubectl-peek" src="https://github.com/user-attachments/assets/cc221426-06b2-4c7d-ab71-934b6b6e623f" />

---

## Inspeccionar los valores de un Secret

Inicia el explorador interactivo con:

```bash
kubectl-peek secret
```

o mediante el plugin nativo:

```bash
kubectl peek secret
```

Filtra por nombre:

```bash
kubectl-peek secret database
```

Utiliza otro namespace:

```bash
kubectl-peek secret database -n staging
```

Por defecto, los valores decodificados se muestran directamente en la terminal.

Ejemplo:

```text
Secret: database-credentials
Namespace: staging
Type: Opaque

password:
────────────────────────────────────────────────────────────
example-password
```

---

## Ocultar los valores del Secret

En algunos casos necesitas consultar los metadatos y las relaciones, pero no debes mostrar los valores reales.

Utiliza:

```bash
kubectl-peek secret --show-values=false
```

El nombre de la clave continúa visible y el valor se sustituye por su tamaño en bytes:

```text
password:
────────────────────────────────────────────────────────────
<redacted: 24 bytes>
```

Esto resulta útil durante:

- sesiones de pantalla compartida
- grabaciones de terminal
- capturas
- demostraciones
- troubleshooting colaborativo
- entornos donde el contenido del Secret debe permanecer oculto

---

## El descubrimiento de relaciones es opcional

El descubrimiento de relaciones está desactivado por defecto.

Actívalo explícitamente con:

```bash
kubectl-peek secret --show-usage
```

Cuando está activado, `kubectl-peek` busca relaciones en recursos soportados de Kubernetes y en las reglas configuradas para recursos personalizados.

Las relaciones pueden ser:

- `uses`
- `produces`
- `references`

Ejemplo:

```text
Secret: database-credentials
Namespace: staging
Type: Opaque
Used by:
  Deployment/backend
    uses: container environment (container/backend envFrom)
  CronJob/backup
    uses: environment variable (container/backup env/BACKUP_PASSWORD -> password)
```

También puedes combinar el descubrimiento con la ocultación de valores:

```bash
kubectl-peek secret \
  --show-usage \
  --show-values=false
```

Así puedes consultar las dependencias sin imprimir información sensible.

---

## Descubrimiento integrado de Secrets

Con `--show-usage`, `kubectl-peek` puede descubrir referencias desde recursos habituales de Kubernetes.

Actualmente incluye recursos como:

- Pods
- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs
- ServiceAccounts
- Ingresses
- Gateways de Gateway API

Detecta referencias mediante campos como:

- volúmenes basados en Secrets
- projected Secret volumes
- `imagePullSecrets`
- variables de entorno
- `envFrom`
- init containers
- ephemeral containers
- certificados de listeners de Gateway API
- configuración TLS de Ingress

Esto facilita comprobar si un Secret sigue estando referenciado antes de rotarlo o eliminarlo.

---

## Un mensaje más seguro cuando no se encuentra nada

Que no se encuentre una relación no significa que el Secret esté definitivamente sin uso.

Cuando `--show-usage` está activado pero no se detecta ninguna referencia soportada, `kubectl-peek` muestra:

```text
Used by:
  No references were found among the supported built-in resources and configured usage rules.
  This does not guarantee that the Secret is unused; unsupported resources, external systems, or unconfigured custom resources may still reference it.
```

Esta distinción es importante porque el Secret todavía podría ser utilizado por:

- un recurso de Kubernetes aún no soportado
- un recurso personalizado sin una regla configurada
- un sistema externo
- una aplicación que obtiene el Secret dinámicamente
- un recurso ubicado en otro namespace

La salida aporta información sobre dependencias, pero no garantiza que eliminar el Secret sea seguro.

---

## Descubrir relaciones en recursos personalizados

En lugar de incorporar soporte específico para cada operador de Kubernetes, `kubectl-peek` puede cargar reglas de relaciones desde un fichero YAML.

Esto permite añadir soporte para recursos como:

- External Secrets Operator
- cert-manager
- Crossplane
- operadores de Vault
- APIs internas de plataforma
- CRDs privados

sin modificar la aplicación.

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

Carga el fichero de reglas explícitamente:

```bash
kubectl-peek secret \
  --show-usage \
  --rules rules.yaml
```

O configura una ruta por defecto:

```bash
export KUBECTL_PEEK_RULE_FILE="$HOME/.config/kubectl-peek/rules.yaml"
```

Después ejecuta:

```bash
kubectl-peek secret --show-usage
```

Las relaciones integradas y las definidas mediante reglas YAML se combinan en la misma sección `Used by`.

---

## Instalación

### Homebrew

```bash
brew tap pierinho13/tools
brew install --cask kubectl-peek
```

### GitHub Releases

Descarga el archivo correspondiente a tu sistema operativo y arquitectura, extráelo y coloca el binario en un directorio incluido en tu `PATH`.

### Compilar desde el código fuente

```bash
git clone https://github.com/pierinho13/kubectl-peek.git
cd kubectl-peek
go build -o kubectl-peek .
```

---

## Uso básico

Explorar Secrets:

```bash
kubectl-peek secret
```

Filtrar por nombre:

```bash
kubectl-peek secret database
```

Utilizar otro namespace:

```bash
kubectl-peek secret -n staging
```

Utilizar otro contexto:

```bash
kubectl-peek secret --context production
```

Especificar otro kubeconfig:

```bash
kubectl-peek secret --kubeconfig ~/.kube/config
```

Descubrir relaciones:

```bash
kubectl-peek secret --show-usage
```

Ocultar valores:

```bash
kubectl-peek secret --show-values=false
```

Cargar reglas personalizadas:

```bash
kubectl-peek secret \
  --show-usage \
  --rules rules.yaml
```

---

## Permisos

La inspección básica requiere permisos para leer Secrets en el namespace seleccionado.

El descubrimiento de relaciones necesita permisos adicionales de tipo `list` sobre los recursos soportados o configurados que se quieran inspeccionar.

Esto permite que:

```bash
kubectl-peek secret
```

siga siendo útil con un conjunto de permisos más reducido, mientras que:

```bash
kubectl-peek secret --show-usage
```

realiza la búsqueda más amplia únicamente cuando se solicita.

---

## Seguridad

Los valores decodificados se muestran por defecto.

Esos valores pueden permanecer visibles en:

- el scrollback de la terminal
- grabaciones de pantalla
- capturas
- sesiones compartidas
- salidas de comandos capturadas

Utiliza:

```bash
kubectl-peek secret --show-values=false
```

cuando los valores deban permanecer ocultos.

La herramienta debe seguir utilizándose únicamente en entornos de confianza y con los permisos RBAC mínimos necesarios para cada tarea.

---

## Conclusión

`kubectl-peek` comenzó como una pequeña utilidad para inspeccionar Secrets de Kubernetes de forma más cómoda.

Su objetivo es simplificar dos flujos relacionados:

> **Inspeccionar qué contiene un Secret.**

y:

> **Entender qué recursos soportados lo utilizan, producen o referencian.**

El modelo de relaciones es deliberadamente transparente. Los detectores integrados cubren recursos habituales de Kubernetes, las reglas YAML amplían el mismo mecanismo a recursos personalizados y una búsqueda vacía se presenta claramente como información incompleta, no como una garantía de que el Secret pueda eliminarse de forma segura.

El proyecto es open source:

**https://github.com/pierinho13/kubectl-peek**

Las contribuciones, ideas y nuevas reglas de ejemplo son bienvenidas.

Si te interesa este tipo de trabajo de Platform Engineering, puedes conocer más sobre mi experiencia o [ponerte en contacto](/contact).