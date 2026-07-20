---
layout: post
title: "kubectl-peek ahora abre shells aisladas de Kubernetes para cualquier contexto y namespace"
date: 2026-07-20
lang: es
image: https://github.com/user-attachments/assets/9eb0f303-cc02-4cc2-b434-ead0ceb10c35
excerpt: "kubectl-peek ahora permite abrir shells aisladas y conscientes del contexto mediante kubeconfigs temporales, para trabajar entre clusters y namespaces sin cambiar el contexto real ni repetir flags constantemente."
---

Cambiar entre clusters y namespaces de Kubernetes es una de esas tareas pequeñas que acaba consumiendo bastante tiempo cuando se repite durante todo el día.

Un flujo habitual suele ser así:

```bash
kubectl config use-context staging
kubectl config set-context --current --namespace payments
kubectl get pods
```

Y unos minutos después:

```bash
kubectl config use-context production
kubectl config set-context --current --namespace payments
kubectl get pods
```

Esto funciona, pero también modifica el estado real de tu kubeconfig.

Y eso genera varios problemas muy comunes:

- olvidas qué contexto está activo
- una terminal nueva hereda un contexto cambiado en otro momento
- tienes que pasar `--context` y `--namespace` en cada comando
- corres el riesgo de ejecutar una acción contra el cluster equivocado
- trabajar en paralelo con varios entornos resulta incómodo
- herramientas como Helm y Flux necesitan que repitas el mismo alcance

La nueva versión de **kubectl-peek** soluciona este problema mediante shells aisladas de Kubernetes.

Ahora puedes seleccionar un contexto y un namespace, abrir una shell temporal limitada a ambos, trabajar con normalidad y regresar a tu entorno original ejecutando simplemente:

```bash
exit
```

Sin cambiar permanentemente el contexto.

Sin modificar el kubeconfig original.

Sin repetir flags en cada comando.

---

## kubectl-peek está evolucionando hacia una CLI de productividad para Kubernetes

`kubectl-peek` nació inicialmente como una forma interactiva de inspeccionar Secrets de Kubernetes y descubrir qué recursos los usan, producen o referencian.

Esa funcionalidad sigue disponible mediante:

```bash
kubectl-peek secret
```

Pero el proyecto ahora cubre varios flujos de Kubernetes como funcionalidades principales:

```text
kubectl-peek
├── secret       Inspecciona Secrets y sus relaciones
├── namespace    Selecciona y guarda un namespace
└── shell        Abre una shell aislada por contexto y namespace
```

Al ejecutar el comando raíz se muestran todos los flujos disponibles:

```bash
kubectl-peek
```

Los mismos comandos también funcionan como plugin nativo de `kubectl`:

```bash
kubectl peek secret
kubectl peek namespace
kubectl peek shell
```

---

## El problema habitual: cambiar de contexto modifica un estado compartido

Los contextos de Kubernetes son útiles porque combinan:

- un cluster
- unas credenciales
- un namespace predeterminado

Pero cambiar el contexto activo también modifica el estado utilizado por tu terminal normal.

Por ejemplo:

```bash
kubectl config use-context production
```

A partir de ese momento, todos los comandos que usen el kubeconfig predeterminado apuntarán a producción, salvo que indiques explícitamente otro contexto.

Lo mismo ocurre con los namespaces:

```bash
kubectl config set-context --current --namespace payments
```

Esto resulta especialmente incómodo cuando necesitas comparar entornos o trabajar con varios clusters al mismo tiempo.

Puedes evitar cambiar el contexto pasando flags:

```bash
kubectl   --context production   --namespace payments   get pods
```

Pero entonces cada comando se vuelve repetitivo:

```bash
kubectl --context production -n payments get pods
helm --kube-context production -n payments list
flux --context production -n payments get all
```

El flujo de shells aisladas ofrece la comodidad de tener un contexto y namespace seleccionados sin modificar tu kubeconfig real.

---

## Abrir una shell aislada de Kubernetes

Ejecuta:

```bash
kubectl-peek shell
```

`kubectl-peek` hará lo siguiente:

1. listará los contextos disponibles en tu kubeconfig
2. permitirá seleccionar uno de forma interactiva
3. se conectará utilizando ese contexto
4. listará los namespaces disponibles en ese cluster
5. permitirá seleccionar un namespace
6. creará un kubeconfig temporal
7. abrirá una shell hija utilizando esa configuración temporal

El flujo completo es:

```text
Seleccionar un contexto de Kubernetes
                 │
                 ▼
Listar los namespaces disponibles en ese contexto
                 │
                 ▼
Seleccionar un namespace
                 │
                 ▼
Crear un kubeconfig temporal
                 │
                 ▼
Abrir una shell aislada
```

---

## Demostración

<img width="1800" height="800" alt="Demostración de shell aislada de Kubernetes con kubectl-peek" src="https://github.com/user-attachments/assets/9eb0f303-cc02-4cc2-b434-ead0ceb10c35" />

Dentro de la shell hija, el contexto y el namespace seleccionados permanecen visibles en el prompt:

```text
[k8s:production ns:payments] piero@MacBook-Pro %
```

El contexto se muestra en cian y el namespace en amarillo en terminales compatibles con colores ANSI.

Ese pequeño indicador visual supone una gran diferencia cuando tienes varias terminales abiertas al mismo tiempo.

---

## Evitar los selectores cuando ya conoces el destino

Puedes indicar directamente el contexto:

```bash
kubectl-peek shell --context production
```

En ese caso, solo se mostrará el selector de namespaces.

También puedes indicar directamente el namespace:

```bash
kubectl-peek shell -n payments
```

`kubectl-peek` solicitará el contexto y comprobará que el namespace exista en el cluster seleccionado.

Para evitar ambos selectores:

```bash
kubectl-peek shell   --context production   --namespace payments
```

Esto resulta útil para aliases, documentación, scripts o entornos que utilizas frecuentemente.

---

## Trabajar con normalidad dentro de la shell

Una vez abierta la shell aislada, puedes utilizar tus herramientas habituales de Kubernetes sin repetir el contexto ni el namespace:

```bash
kubectl get pods
kubectl get services
kubectl describe deployment api
helm list
flux get all
```

Todos esos comandos utilizan el kubeconfig temporal expuesto a la shell hija mediante `KUBECONFIG`.

La terminal principal permanece sin cambios.

---

## El kubeconfig original no se modifica

El kubeconfig temporal se crea específicamente para la shell hija.

Este kubeconfig:

- contiene la configuración efectiva de Kubernetes
- conserva clusters, usuarios, contextos, credenciales y plugins de autenticación
- incrusta certificados y claves referenciados mediante rutas locales
- selecciona el contexto solicitado
- aplica el namespace seleccionado únicamente a ese contexto
- se crea con permisos `0600`
- se expone solamente dentro de la shell hija
- se elimina después de abandonar la shell

El kubeconfig original permanece intacto.

Cuando terminas:

```bash
exit
```

regresas a la terminal anterior con la misma configuración de Kubernetes que tenías antes.

---

## Trabajar con varios clusters en paralelo

Esta es una de las ventajas más útiles del nuevo flujo.

Abre una terminal para staging:

```bash
kubectl-peek shell   --context staging   --namespace payments
```

Y otra terminal para producción:

```bash
kubectl-peek shell   --context production   --namespace payments
```

Cada terminal mantiene su propio alcance temporal de Kubernetes:

```text
[k8s:staging ns:payments]
```

y:

```text
[k8s:production ns:payments]
```

Puedes comparar logs, recursos, releases de Helm, estado de Flux o despliegues sin cambiar constantemente un contexto compartido.

---

## Las shells aisladas anidadas están bloqueadas

Abrir una shell aislada dentro de otra puede resultar confuso rápidamente.

Por eso, `kubectl-peek` detecta si ya existe una shell aislada activa antes de mostrar cualquier selector.

Intentar abrir otra devuelve un error similar a:

```text
an isolated kubectl-peek shell is already active
(context "production", namespace "payments");
run exit before opening another one
```

La comprobación se realiza al principio, antes de seleccionar otro contexto o namespace.

---

## Flujo basado primero en el namespace

El selector de namespaces también puede abrir una shell aislada:

```bash
kubectl-peek namespace --shell
```

Este flujo resulta útil cuando quieres mantener el contexto actual y seleccionar únicamente el namespace.

Puedes proporcionar un filtro inicial:

```bash
kubectl-peek namespace pay --shell
```

O indicar explícitamente otro contexto:

```bash
kubectl-peek namespace   --context staging   --shell
```

Sin `--shell`, el comando guarda el namespace seleccionado en el contexto elegido del kubeconfig:

```bash
kubectl-peek namespace
```

De esta forma dispones de ambas opciones:

- guardar un namespace de manera intencionada
- abrir una shell efímera limitada a un namespace

---

## La inspección de Secrets ahora es un comando explícito

Como `kubectl-peek` ha crecido más allá de la inspección de Secrets, esta funcionalidad ahora dispone de su propio comando principal:

```bash
kubectl-peek secret
```

Filtrar por nombre:

```bash
kubectl-peek secret database
```

Inspeccionar otro namespace:

```bash
kubectl-peek secret database -n staging
```

Cargar reglas personalizadas para descubrir relaciones con CRDs:

```bash
kubectl-peek secret   --rules ./examples/rules-all.yaml
```

La inspección de Secrets sigue incluyendo:

- selección interactiva
- filtrado y paginación
- valores decodificados
- descubrimiento de relaciones integrado
- descubrimiento de CRDs mediante reglas YAML
- relaciones `uses`, `produces` y `references`

La diferencia es que ahora la CLI presenta la inspección de Secrets, la gestión de namespaces y las shells aisladas como flujos igualmente importantes.

---

## ¿Por qué utilizar kubeconfigs temporales?

Configurar solamente una variable de entorno para el namespace no sería suficiente.

Las herramientas de Kubernetes no utilizan siempre los mismos flags ni variables, pero sí entienden el formato kubeconfig.

Al crear un kubeconfig temporal y exponerlo mediante `KUBECONFIG`, el alcance aislado funciona de forma natural con herramientas como:

- `kubectl`
- Helm
- Flux
- flujos de Kustomize que ejecutan clientes de Kubernetes
- aplicaciones Go que utilizan `client-go`
- otras herramientas compatibles con kubeconfig

Esto hace que la shell sea útil más allá de un único comando de `kubectl`.

---

## Instalación

### Homebrew

```bash
brew tap pierinho13/tools
brew install --cask kubectl-peek
```

Para actualizar una instalación existente:

```bash
brew update
brew upgrade --cask kubectl-peek
```

Comprueba la versión instalada:

```bash
kubectl-peek --version
```

---

### GitHub Releases

En GitHub Releases se publican binarios precompilados para macOS, Linux y Windows.

---

### Compilar desde el código fuente

```bash
git clone https://github.com/pierinho13/kubectl-peek.git
cd kubectl-peek
go build -o kubectl-peek .
```

---

## Ejemplos de uso

### Seleccionar todo de forma interactiva

```bash
kubectl-peek shell
```

### Seleccionar solamente el namespace

```bash
kubectl-peek shell --context production
```

### Abrir directamente una shell

```bash
kubectl-peek shell --context production -n payments
```

### Mantener el contexto actual y seleccionar un namespace temporal

```bash
kubectl-peek namespace --shell
```

### Guardar un namespace en el contexto actual

```bash
kubectl-peek namespace
```

### Inspeccionar relaciones de un Secret

```bash
kubectl-peek secret
```

---

## Reflexiones finales

El objetivo de `kubectl-peek` no es sustituir a `kubectl`.

Su objetivo es eliminar fricción de varios flujos de Kubernetes que los platform engineers, SREs y desarrolladores repiten constantemente.

La inspección de Secrets ayuda a responder:

> ¿Con qué recursos está relacionado este Secret?

El nuevo flujo de shells aisladas ayuda a responder:

> ¿Cómo puedo trabajar de forma segura en este contexto y namespace sin modificar mi entorno real?

Esto convierte a `kubectl-peek` en una herramienta útil no solo para investigar Secrets, sino también durante despliegues, resolución de incidencias, comparación de clusters, diagnóstico de namespaces y trabajo diario con varios entornos.

El proyecto es open source:

**https://github.com/pierinho13/kubectl-peek**

Las contribuciones, sugerencias e ideas son bienvenidas.

Si te interesa este tipo de trabajo de platform engineering, puedes conocer mejor mi experiencia o [contactar conmigo](/es/contact).