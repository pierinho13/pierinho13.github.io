---
layout: post
title: "kubectl-peek: una forma sencilla de inspeccionar Secrets de Kubernetes y saber dónde se usan"
date: 2026-07-17
lang: es
image: https://github.com/user-attachments/assets/10a12751-2e9f-4231-b048-7ad610d9f4ff
excerpt: "He creado kubectl-peek para consultar Secrets de Kubernetes de una forma más rápida, sencilla y útil, mostrando tanto sus valores decodificados como los workloads que los utilizan."
---

Trabajar con Secrets de Kubernetes suele ser sencillo hasta que necesitas responder dos preguntas muy habituales:

**¿Qué contiene este Secret?**

Y, todavía más importante:

**¿Dónde se está utilizando?**

El flujo habitual termina implicando varios comandos, decodificación manual de Base64, búsquedas entre Deployments y Pods, y revisión de manifiestos hasta entender finalmente la relación entre un Secret y los workloads que dependen de él.

Por eso he creado **kubectl-peek**.

`kubectl-peek` es una pequeña CLI interactiva y un plugin nativo de `kubectl` pensado para facilitar la inspección de Secrets sin añadir complejidad al clúster.

## Por qué lo he creado

Quería una herramienta que fuese deliberadamente simple:

- sin interfaz web
- sin custom resources
- sin controladores ejecutándose dentro del clúster
- sin configuración adicional
- sin bases de datos ni servicios externos
- sin tener que copiar y decodificar valores manualmente

La herramienta utiliza el kubeconfig, el contexto y el namespace que ya tienes configurados.

La ejecutas, seleccionas un Secret y puedes ver inmediatamente tanto su contenido decodificado como los workloads compatibles que lo referencian.

## Qué hace kubectl-peek

La herramienta ofrece un navegador interactivo de Secrets directamente desde la terminal.

Permite:

- explorar Secrets del namespace actual
- navegar con el teclado
- filtrar interactivamente pulsando `/`
- aplicar un filtro inicial desde la línea de comandos
- cambiar namespace, contexto o kubeconfig
- mostrar los valores decodificados
- descubrir dónde se utiliza el Secret seleccionado

El mismo binario puede ejecutarse de estas dos formas:

```bash
kubectl-peek
```

o como plugin nativo de `kubectl`:

```bash
kubectl peek
```

Ambos comandos ejecutan exactamente la misma funcionalidad.

## Demo

<img width="1200" height="700" alt="demo de kubectl-peek" src="https://github.com/user-attachments/assets/10a12751-2e9f-4231-b048-7ad610d9f4ff" />

La interacción está diseñada para ser mínima:

1. Ejecutar `kubectl peek`
2. Navegar por la lista de Secrets
3. Pulsar `/` para filtrar
4. Escribir parte del nombre
5. Pulsar `Enter`
6. Revisar los metadatos, usos, keys y valores decodificados

## Descubrimiento de usos con Used by

Una de las funciones más útiles es la sección `Used by`.

Al seleccionar un Secret, `kubectl-peek` busca en el namespace actual los workloads compatibles que lo referencian.

La primera versión soporta:

- Pods
- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs

Detecta referencias mediante:

- `env[].valueFrom.secretKeyRef`
- `envFrom[].secretRef`
- volúmenes basados en Secrets
- `imagePullSecrets`
- init containers
- ephemeral containers

Ejemplo de salida:

```text
Secret: database-credentials
Namespace: default
Type: Opaque
Used by:
  Deployment/backend
    container/backend envFrom
  CronJob/backup
    container/backup env/BACKUP_PASSWORD -> password

password:
────────────────────────────────────────────────────────────
example-password

username:
────────────────────────────────────────────────────────────
database-user
```

Esto resulta especialmente útil para comprobar si un Secret sigue referenciado, investigar un workload, revisar un namespace o preparar una rotación de credenciales.

## Instalación con Homebrew

La forma más sencilla de instalarlo en macOS es mediante Homebrew.

Añade el tap:

```bash
brew tap pierinho13/tools
```

Instala la herramienta:

```bash
brew install --cask kubectl-peek
```

También puedes utilizar el nombre completo:

```bash
brew install --cask pierinho13/tools/kubectl-peek
```

Para actualizarla posteriormente:

```bash
brew update
brew upgrade --cask kubectl-peek
```

## Instalación desde GitHub Releases

Se publican binarios precompilados para macOS, Linux y Windows.

Descarga desde GitHub Releases el archivo correspondiente a tu sistema operativo y arquitectura, extráelo y mueve el binario a un directorio incluido en tu `PATH`.

Ejemplo para macOS o Linux:

```bash
tar -xzf kubectl-peek_<version>_<os>_<arch>.tar.gz
chmod +x kubectl-peek
sudo mv kubectl-peek /usr/local/bin/
```

Comprueba la instalación:

```bash
kubectl-peek --help
```

## Compilar desde el código fuente

También puedes compilarlo directamente con Go:

```bash
git clone https://github.com/pierinho13/kubectl-peek.git
cd kubectl-peek
go build -o kubectl-peek .
```

Mueve el binario a tu `PATH`:

```bash
sudo mv kubectl-peek /usr/local/bin/
```

## Uso básico

Explorar Secrets del namespace actual:

```bash
kubectl peek
```

Filtrar por nombre antes de abrir el selector interactivo:

```bash
kubectl peek database
```

Utilizar otro namespace:

```bash
kubectl peek -n staging
```

Utilizar otro contexto:

```bash
kubectl peek --context development-cluster
```

Utilizar un kubeconfig específico:

```bash
kubectl peek --kubeconfig ~/.kube/secondary-config
```

También puedes combinar todas las opciones:

```bash
kubectl peek database \
  --namespace staging \
  --context development-cluster \
  --kubeconfig ~/.kube/secondary-config
```

## Permisos

La identidad actual de Kubernetes debe poder leer Secrets y listar los recursos compatibles en el namespace seleccionado.

Como mínimo, el acceso a Secrets requiere:

```yaml
apiGroups:
  - ""
resources:
  - secrets
verbs:
  - get
  - list
```

La funcionalidad `Used by` necesita además permisos de listado sobre Pods, Deployments, StatefulSets, DaemonSets, Jobs y CronJobs.

## Consideraciones de seguridad

`kubectl-peek` imprime los valores decodificados de los Secrets directamente en la terminal.

Esos valores pueden permanecer visibles en:

- el historial visual de la terminal
- grabaciones de sesión
- capturas de pantalla
- sesiones de terminal compartidas
- salida capturada por otros comandos

La herramienta debe utilizarse únicamente en entornos de confianza y con los permisos mínimos necesarios.

## Conclusión

`kubectl-peek` no pretende sustituir una plataforma completa de administración de Kubernetes.

Su objetivo es mucho más concreto:

**hacer que una tarea frecuente de Kubernetes sea más rápida, clara y fácil de utilizar.**

Al combinar exploración interactiva, valores decodificados y descubrimiento de workloads en un solo comando, reduce el trabajo manual necesario durante las tareas habituales de plataforma.

El proyecto es open source y está disponible en GitHub:

[github.com/pierinho13/kubectl-peek](https://github.com/pierinho13/kubectl-peek)

Si te interesa este tipo de trabajo de platform engineering, puedes conocer más sobre mi experiencia o [ponerte en contacto](/contact).