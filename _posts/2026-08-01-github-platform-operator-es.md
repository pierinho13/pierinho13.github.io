---
layout: post
title: "Tu organización de GitHub también es infraestructura"
date: 2026-07-31
lang: es
image: /assets/img/github-platform-operator.png
excerpt: "La configuración de GitHub también es estado de plataforma. Creé github-platform-operator para gestionar repositorios, rulesets, miembros de la organización, equipos, accesos, entornos, secretos y variables mediante Kubernetes y GitOps, con reconciliación continua y adopción segura."
---

Crear un repositorio en GitHub es fácil.

Mantener cientos de repositorios, equipos, permisos, rulesets, entornos, secretos y variables consistentes a lo largo del tiempo no lo es.

La configuración inicial rara vez es el verdadero problema.

El problema aparece después:

- un repositorio permite merge commits mientras otro solo admite squash merges
- las alertas de vulnerabilidades están activadas en unos repositorios y desactivadas en otros
- un equipo conserva acceso a repositorios que ya no le pertenecen
- un usuario se añade manualmente y nunca se elimina
- alguien modifica un ruleset directamente desde la interfaz de GitHub
- un repositorio nuevo no incluye la configuración estándar de la organización
- nadie sabe si el estado correcto está en la interfaz, en un script, en Terraform o en un runbook antiguo

En ese momento, GitHub deja de ser simplemente el lugar donde se almacena el código fuente.

Pasa a formar parte de la plataforma de ingeniería.

Ese es el problema que quise abordar con **[github-platform-operator](https://github.com/pierinho13/github-platform-operator)**.

[github-platform-operator](https://github.com/pierinho13/github-platform-operator) es un operador open source de Kubernetes para crear, adoptar y reconciliar continuamente recursos habituales de una plataforma GitHub de forma declarativa.

Gestiona:

```text
repositorios
rulesets de repositorio
miembros de la organización
equipos
membresías de equipos
accesos a repositorios
entornos
secretos de Actions
variables de Actions
```

La configuración deseada vive en recursos de Kubernetes y puede desplegarse mediante el mismo flujo GitOps utilizado para el resto de la plataforma.

> **La configuración de GitHub es estado de plataforma, y el estado de plataforma debería ser declarativo, revisable, adoptable y reconciliado continuamente.**

---

## La configuración de GitHub también sufre drift

Normalmente hablamos de drift de infraestructura al referirnos a recursos cloud, workloads de Kubernetes, redes o IAM.

Pero la configuración de GitHub sufre exactamente el mismo problema.

Un repositorio puede comenzar con la configuración correcta:

```text
visibilidad: privada
eliminar ramas después del merge: activado
alertas de vulnerabilidades: activadas
squash merge: activado
aprobaciones requeridas: 1
revisión de CODEOWNERS: obligatoria
```

Después alguien modifica una opción directamente desde la interfaz.

El repositorio sigue existiendo. Las aplicaciones siguen compilando. Nada falla de forma inmediata.

Pero la plataforma ya no se encuentra en el estado esperado.

El cambio puede pasar desapercibido hasta que:

- una pull request se fusiona mediante una estrategia no permitida
- se omite una revisión obligatoria
- un usuario antiguo conserva acceso
- se descubre que un control de seguridad estaba desactivado
- un repositorio nuevo se comporta de forma distinta al resto

No es muy diferente de editar manualmente una regla de firewall en cloud o modificar un Deployment de Kubernetes fuera de GitOps.

El estado ha sufrido drift.

La diferencia es que GitHub suele tratarse como una herramienta administrativa y no como parte del control plane de la plataforma.

Esa distinción resulta difícil de defender cuando GitHub controla:

- quién puede acceder al código fuente
- cómo llega el código a producción
- qué revisiones son obligatorias
- qué entornos pueden desplegar
- qué secretos están disponibles para las automatizaciones
- qué equipos son propietarios de cada repositorio
- cómo se crean y retiran los repositorios

Para muchas organizaciones de ingeniería, la configuración de GitHub es infraestructura.

---

## Por qué los scripts dejan de escalar

Un script suele ser la forma más rápida de automatizar el primer repositorio.

Por ejemplo:

```bash
gh api \
  --method PATCH \
  /repos/example-org/payments-api \
  -f delete_branch_on_merge=true \
  -f allow_squash_merge=true
```

Otro script puede configurar el acceso de un equipo:

```bash
gh api \
  --method PUT \
  /orgs/example-org/teams/platform/repos/example-org/payments-api \
  -f permission=maintain
```

Los scripts son útiles.

También son la herramienta adecuada para importaciones, migraciones, mantenimiento puntual y tareas de descubrimiento.

El problema aparece cuando se convierten en el mecanismo permanente de control.

Un script describe una secuencia de acciones:

```text
buscar el repositorio
      ↓
crearlo si no existe
      ↓
actualizar la configuración
      ↓
configurar los equipos
      ↓
crear el ruleset
      ↓
continuar si todas las operaciones anteriores tuvieron éxito
```

Pero una plataforma normalmente necesita describir el resultado deseado:

```text
Este repositorio debe existir.
Esta configuración debe mantenerse.
Este equipo debe tener este permiso.
Este ruleset debe permanecer activo.
```

Son modelos distintos.

Un script debe decidir:

- qué recursos existen ya
- qué operaciones se completaron correctamente
- cómo continuar después de un fallo parcial
- cómo detectar cambios manuales posteriores
- cómo gestionar dependencias
- cómo informar del estado observado
- cuándo reintentar
- cómo evitar reintentos durante un rate limit de la API
- qué debe ocurrir cuando se elimina la configuración

Con el tiempo, el script empieza a implementar un bucle de reconciliación.

En ese punto se está convirtiendo en un controlador, pero sin la API de Kubernetes, el modelo de estado, los watches, los finalizers, los eventos y la semántica de ciclo de vida que ya ofrece Kubernetes.

> **Un script describe acciones. Un recurso de Kubernetes describe el estado deseado.**

---

## Una breve introducción a los operadores de Kubernetes

Un operador de Kubernetes amplía la API de Kubernetes con nuevos tipos de recursos y controladores.

El recurso describe el estado deseado:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubRepository
metadata:
  name: payments-api
spec:
  providerConfigRef: default
  name: payments-api
  visibility: private
  deleteBranchOnMerge: true
  vulnerabilityAlerts: true
  deletionPolicy: Orphan
```

Un controlador observa ese recurso y lo reconcilia con el sistema externo.

En este caso:

```text
GitHubRepository
       ↓
controlador de Kubernetes
       ↓
API REST de GitHub
       ↓
repositorio observado en GitHub
       ↓
estado en Kubernetes
```

El controlador compara repetidamente el estado deseado con el estado observado.

Si el repositorio no existe, puede crearlo.

Si ya existe, puede adoptarlo.

Si una configuración gestionada cambia de forma remota, el controlador puede restaurar el valor declarado.

Si GitHub no está disponible temporalmente, el controlador puede reencolar la operación.

Si el rate limit de la API se agota, el controlador puede esperar hasta el reset en lugar de generar un bucle de reintentos descontrolado.

Lo importante no es que Kubernetes pueda llamar a una API externa.

Lo importante es que el ciclo de vida pasa a ser declarativo.

```text
Estado deseado
      ↓
Reconciliar
      ↓
Observar
      ↓
Corregir el drift
      ↓
Informar del estado
      ↺
```

---

## La idea detrás de github-platform-operator

El objetivo de [github-platform-operator](https://github.com/pierinho13/github-platform-operator) no es exponer cada endpoint de la API REST de GitHub como un recurso personalizado.

Se centra deliberadamente en flujos recurrentes de plataforma:

```text
GitHubProviderConfig
GitHubRepository
GitHubRepositoryRuleset
GitHubOrganizationMember
GitHubTeam
GitHubTeamMembership
GitHubRepositoryTeamAccess
GitHubRepositoryCollaborator
GitHubEnvironment
GitHubActionsSecret
GitHubActionsVariable
```

Esto permite que un equipo de plataforma describa un repositorio y sus dependencias habituales mediante manifiestos de Kubernetes.

Por ejemplo:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubRepository
metadata:
  name: payments-api
  namespace: platform
spec:
  providerConfigRef: default
  name: payments-api
  visibility: private
  description: Payments service
  topics:
    - golang
    - kubernetes
    - payments
  features:
    issues: true
    projects: false
    wiki: false
    discussions: true
  mergeOptions:
    allowMergeCommit: false
    allowRebaseMerge: false
    allowSquashMerge: true
  deleteBranchOnMerge: true
  vulnerabilityAlerts: true
  deletionPolicy: Orphan
```

El manifiesto puede revisarse como cualquier otro cambio de plataforma:

```text
el desarrollador abre una pull request
            ↓
revisión del equipo de plataforma
            ↓
merge
            ↓
Argo CD aplica el recurso
            ↓
el operador reconcilia GitHub
```

El repositorio Git se convierte en la fuente del estado deseado.

Kubernetes proporciona la API y el ciclo de vida.

El operador traduce ese estado deseado en operaciones sobre GitHub.

<figure>
  <img
    src="/assets/img/github-platform-operator-architecture.png"
    alt="github-platform-operator architecture: GitOps manifests flow through Kubernetes to continuously reconcile GitHub resources"
    loading="lazy"
  />
  <figcaption>
    github-platform-operator turns GitOps-managed Kubernetes resources into continuously reconciled GitHub configuration.
  </figcaption>
</figure>

---

## El caso real no parte de una organización vacía

Crear un repositorio nuevo es sencillo.

Adoptar una organización existente es más difícil.

Las migraciones reales de plataforma rara vez comienzan con:

```text
0 repositorios
0 equipos
0 usuarios
0 convenciones existentes
```

Empiezan con años de estado acumulado:

- repositorios creados por personas diferentes
- equipos con miembros existentes
- colaboradores directos
- configuraciones de merge inconsistentes
- rulesets ya creados
- entornos y configuración de Actions
- ownership mantenido manualmente
- automatizaciones parciales de proyectos anteriores

Un operador útil debe soportar la adopción de entornos brownfield.

Por eso [github-platform-operator](https://github.com/pierinho13/github-platform-operator) no presupone que todos los recursos remotos deban crearse desde cero.

Si ya existe un repositorio con el nombre declarado, el controlador puede adoptarlo.

Si ya existe un equipo, puede adoptarlo y reconciliarlo.

El mismo principio se aplica al resto de recursos compatibles.

También por eso importan los campos omitidos.

Para la configuración de repositorios:

```text
campo omitido         → observarlo, pero no gestionarlo
campo configurado     → reconciliarlo continuamente
cadena vacía          → borrarlo explícitamente
lista vacía           → eliminar explícitamente todos los elementos gestionados
```

Esto evita un problema habitual en las migraciones: adoptar un recurso no debería obligar al operador a hacerse cargo de toda su configuración remota desde el primer momento.

Un equipo puede comenzar gestionando solo unos pocos campos e ir ampliando ese ownership de forma gradual.

> **Las plataformas reales rara vez comienzan con una organización vacía. La adopción no es un caso límite; es el camino de migración.**

---

## Importar equipos existentes a GitOps

La adopción resulta todavía más útil cuando el estado remoto actual puede convertirse en manifiestos.

Por ese motivo también creé un flujo de importación que:

```text
lista los equipos existentes de la organización
      ↓
consulta sus membresías directas
      ↓
conserva los roles member y maintainer
      ↓
genera manifiestos GitHubTeam
      ↓
genera manifiestos GitHubTeamMembership
      ↓
construye la estructura de Kustomize
```

Un equipo generado puede tener este aspecto:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubTeam
metadata:
  name: platform
  namespace: github-platform-operator-system
spec:
  providerConfigRef: default
  name: Platform
  privacy: closed
  deletionPolicy: Orphan
```

Sus miembros directos actuales se convierten en recursos individuales:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubTeamMembership
metadata:
  name: platform-octocat
  namespace: github-platform-operator-system
spec:
  teamRef:
    name: platform
  username: octocat
  role: member
  deletionPolicy: Orphan
```

El importador no necesita volver a crear los equipos de forma remota.

Genera el estado deseado necesario para que el operador pueda adoptarlos.

La importación es una operación de migración.

La reconciliación es una responsabilidad continua del control plane.

---

## Las APIs legibles para humanos importan

Las APIs externas suelen exponer identificadores internos.

Los actores de bypass de los rulesets de GitHub son un buen ejemplo.

Un ruleset puede necesitar un ID numérico para un equipo o un usuario, pero esos IDs son incómodos en GitOps:

```yaml
bypassActors:
  - actorType: Team
    actorID: 1234567
```

Ese valor resulta difícil de comprender durante una revisión y difícil de mantener.

La API del operador permite utilizar identificadores legibles:

```yaml
bypassActors:
  - actorType: Team
    teamSlug: platform
    bypassMode: always
  - actorType: User
    username: release-admin
    bypassMode: pull_request
```

Durante la reconciliación, el controlador resuelve el slug del equipo o el nombre de usuario al identificador numérico que GitHub necesita.

Así, los detalles internos de la implementación remota no se filtran en la API de estado deseado.

> **Una API declarativa debería exponer identificadores estables y legibles siempre que sea posible, en lugar de filtrar detalles internos del sistema remoto.**

Estas decisiones determinan si una API seguirá siendo comprensible después de cientos de manifiestos y años de cambios.

---

## Los rulesets como política de plataforma

Un repositorio no está listo simplemente porque exista.

También necesita convenciones de trabajo.

Un ruleset para la rama por defecto puede representarse así:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubRepositoryRuleset
metadata:
  name: payments-api-default-branch
  namespace: platform
spec:
  repositoryRef:
    name: payments-api
  name: default-branch-protection
  target: branch
  enforcement: active
  bypassActors:
    - actorType: Team
      teamSlug: platform
      bypassMode: always
  conditions:
    refName:
      include:
        - "~DEFAULT_BRANCH"
      exclude: []
  rules:
    - type: deletion
    - type: non_fast_forward
    - type: pull_request
      parameters:
        required_approving_review_count: 1
        require_code_owner_review: true
        allowed_merge_methods:
          - squash
  deletionPolicy: Orphan
```

Esto convierte la política del repositorio en algo:

- revisable mediante una pull request
- reproducible entre repositorios
- visible dentro del mismo repositorio de plataforma
- reconciliado continuamente
- independiente de la configuración manual desde la interfaz

También permite generar políticas consistentes para familias de repositorios como:

```text
gitops-*
infra-terraform-*
```

---

## Seguro por defecto

La automatización declarativa puede ser peligrosa cuando la semántica de eliminación es implícita.

Eliminar un objeto de Kubernetes no debería destruir de forma inesperada un repositorio de producción.

[github-platform-operator](https://github.com/pierinho13/github-platform-operator) utiliza políticas de eliminación explícitas:

```text
Orphan
Archive
Delete
Revoke
```

Para un repositorio:

```yaml
deletionPolicy: Orphan
```

significa que eliminar el recurso de Kubernetes conserva el repositorio en GitHub.

```yaml
deletionPolicy: Archive
```

lo archiva.

```yaml
deletionPolicy: Delete
```

lo elimina permanentemente.

Para los recursos de acceso, `Revoke` elimina explícitamente la membresía o el permiso remoto.

El valor seguro por defecto es `Orphan`.

El operador también utiliza finalizers cuando la limpieza remota debe completarse antes de que Kubernetes elimine el recurso.

También tiene en cuenta las dependencias.

Por ejemplo, un equipo no debería eliminarse mientras existan membresías gestionadas que lo referencien.

Un entorno configurado para borrarse debería permanecer protegido mientras existan recursos de Actions que dependan de él.

Estos comportamientos no son detalles de implementación.

Forman parte del contrato de la API.

> **La infraestructura declarativa no debería convertirse en infraestructura destructiva por accidente.**

---

## Suspender un provider completo

En ocasiones es necesario detener la reconciliación externa.

Algunos motivos pueden ser:

- rotación de credenciales
- mantenimiento de GitHub
- un incidente relacionado con el uso de la API
- un consumidor inesperado del rate limit
- una migración planificada
- una investigación de drift remoto
- trabajos administrativos temporales desde la interfaz de GitHub

El provider puede suspenderse de forma declarativa:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubProviderConfig
metadata:
  name: default
spec:
  organization: example-org
  suspended: true
  credentials:
    secretRef:
      namespace: github-platform-operator-system
      name: github-credentials
      key: token
```

Mientras está suspendido:

```text
los controladores detienen la reconciliación remota
no se leen las credenciales
se detienen las llamadas a la API de GitHub
los recursos gestionados informan ReconciliationSuspended
los recursos de Kubernetes permanecen presentes
```

Esto ofrece un interruptor de emergencia del control plane sin escalar el controlador a cero ni eliminar los recursos gestionados.

Como la suspensión forma parte del recurso del provider, también puede gestionarse mediante GitOps.

---

## Los rate limits forman parte del diseño de un controlador

GitHub es una API externa con límites primarios y secundarios.

Un controlador que ignore esos límites puede convertir un fallo temporal en una tormenta continua de errores.

El problema es mayor cuando varios reconciliadores comparten las mismas credenciales.

Repositorios, equipos, membresías, rulesets, entornos, secretos y variables pueden consumir el mismo presupuesto de API.

Por eso el operador utiliza una puerta compartida y reactiva para los rate limits.

Cuando GitHub informa de un límite, el operador puede:

```text
leer Retry-After
o leer el timestamp de reset
      ↓
pausar las peticiones remotas mediante la puerta compartida
      ↓
reencolar los recursos afectados
      ↓
reanudar cuando el límite lo permita
```

Esto es diferente de añadir simplemente un retraso a un controlador concreto.

El presupuesto de la API pertenece a la credencial o a la instalación, por lo que la coordinación debe producirse entre todos los reconciliadores que utilicen esa identidad.

Gestionarlo correctamente forma parte de operar un control plane externo; no es una optimización opcional.

---

## Secretos sin valores en texto plano dentro de los custom resources

Los secretos de GitHub Actions también se representan de forma declarativa, pero el valor en texto plano no debería almacenarse en el custom resource.

En su lugar, el recurso referencia un Secret de Kubernetes:

```yaml
apiVersion: github.k8sready.com/v1alpha1
kind: GitHubActionsSecret
metadata:
  name: payments-api-docker-token
  namespace: platform
spec:
  target:
    repositoryRef:
      name: payments-api
  name: DOCKER_TOKEN
  valueFrom:
    secretKeyRef:
      name: payments-actions-values
      key: docker-token
  deletionPolicy: Orphan
```

El controlador:

```text
lee el Secret de Kubernetes referenciado
      ↓
obtiene la clave pública de GitHub
      ↓
cifra el valor
      ↓
envía el payload cifrado
      ↓
no almacena el texto plano en status
```

Los cambios en el Secret de Kubernetes disparan una reconciliación y rotan el valor remoto.

El objetivo no es únicamente automatizar la llamada a la API.

El objetivo es ofrecer una API que favorezca un uso más seguro.

---

## ¿Por qué no Terraform?

Terraform dispone de un provider maduro para GitHub y es una opción sólida para gestionar sus recursos.

Resulta especialmente adecuado cuando:

- la configuración de GitHub ya forma parte de una plataforma Terraform existente
- los equipos prefieren cambios basados en plan y apply
- el aprovisionamiento de infraestructura está centralizado en Terraform
- una reconciliación periódica es suficiente
- Kubernetes no actúa como control plane de la plataforma

[github-platform-operator](https://github.com/pierinho13/github-platform-operator) está diseñado para un modelo operativo distinto.

Encaja en entornos donde:

- Kubernetes ya proporciona la API del control plane
- Argo CD o Flux ya despliegan el estado deseado
- los recursos de plataforma deben exponer status de Kubernetes
- los controladores deben corregir el drift de forma continua
- los recursos de GitHub deben componerse con referencias de Kubernetes
- la suspensión y el comportamiento de los finalizers deben formar parte de la API

La diferencia no es que una herramienta pueda crear un repositorio y la otra no.

La diferencia es el modelo de ciclo de vida.

```text
Terraform:
configuración → plan → apply

Operador:
estado deseado → observar → reconciliar → repetir
```

Ninguno de los dos modelos es universalmente mejor.

Están optimizados para arquitecturas de plataforma diferentes.

---

## ¿Por qué no Crossplane?

Crossplane también permite gestionar servicios externos mediante Kubernetes, incluido GitHub a través de un provider.

Para organizaciones que ya utilizan Crossplane como control plane de plataforma, puede ser la opción natural.

Crossplane ofrece capacidades que van mucho más allá de GitHub:

- managed resources
- compositions
- APIs personalizadas de plataforma
- functions
- gestión de paquetes
- dependencias entre providers
- revisiones de providers
- un ecosistema amplio de integraciones con servicios externos

Ese potencial también introduce un modelo operativo distinto.

Una configuración de GitHub basada en Crossplane normalmente implica:

```text
Crossplane core
      +
gestión de paquetes
      +
paquete del provider de GitHub
      +
runtime del provider
      +
revisiones y actualizaciones del provider
```

Esto es apropiado cuando Crossplane ya forma parte estratégica de la plataforma.

Pero yo buscaba una opción más acotada.

[github-platform-operator](https://github.com/pierinho13/github-platform-operator) es un controlador independiente centrado en tareas recurrentes de una plataforma GitHub.

Deliberadamente intercambia:

```text
cobertura amplia del provider
compositions
extensibilidad general del control plane
```

por:

```text
un único operador enfocado
una API seleccionada y acotada
menos componentes de plataforma
semántica de adopción específica para GitHub
comportamiento de eliminación explícito
gestión compartida de rate limits
```

Esto no convierte a una alternativa en universalmente mejor que la otra.

Las hace apropiadas para entornos diferentes.

| Enfoque | Mejor encaje |
|---|---|
| Scripts | Importaciones, migraciones y automatizaciones puntuales |
| Provider de GitHub para Terraform | Aprovisionamiento basado en plan dentro de una plataforma Terraform |
| Provider de GitHub para Crossplane | Organizaciones que ya construyen un control plane más amplio con Crossplane |
| [github-platform-operator](https://github.com/pierinho13/github-platform-operator) | Gestión Kubernetes-native y enfocada de flujos recurrentes de plataforma en GitHub |

El proyecto existe porque un operador enfocado puede ser más sencillo de introducir cuando GitHub es la principal plataforma externa que necesita este modelo.

> **Crossplane está optimizado para construir control planes extensibles. [github-platform-operator](https://github.com/pierinho13/github-platform-operator) está optimizado para un conjunto acotado de flujos recurrentes de plataforma en GitHub.**

---

## Una API deliberadamente más pequeña

Un provider generado a partir de una API externa amplia puede exponer una gran cantidad de recursos y campos.

Esa amplitud es valiosa.

También puede hacer que la API para el usuario se parezca mucho al esquema del provider remoto.

[github-platform-operator](https://github.com/pierinho13/github-platform-operator) adopta un enfoque seleccionado y acotado.

El proyecto no pretende gestionar todas las funcionalidades de GitHub.

Entre los objetivos que actualmente quedan fuera de alcance se encuentran:

```text
runners de GitHub Actions
webhooks
ficheros arbitrarios dentro de repositorios
secretos de Dependabot
políticas de organización
billing
administración empresarial
la API completa de GitHub
```

Ese alcance más pequeño permite dedicar más esfuerzo de diseño a los flujos compatibles:

- adopción segura
- campos opcionales no gestionados
- referencias legibles para humanos
- comportamiento destructivo explícito
- protección de dependencias
- condiciones de status
- suspensión
- coordinación de rate limits
- flujos de importación

Una API más pequeña no es automáticamente mejor.

Pero una API enfocada puede ofrecer una semántica más clara para su caso de uso previsto.

---

## Arquitectura

A alto nivel, el proyecto sigue este flujo:

```text
repositorio Git
      ↓
Argo CD o Flux
      ↓
API de Kubernetes
      ↓
github-platform-operator
      ↓
API REST de GitHub
```

Internamente:

```text
GitHubProviderConfig
      ↓
resolución de credenciales
      ↓
cliente compartido de GitHub y puerta de rate limits
      ↓
reconciliadores específicos por recurso
      ↓
condiciones de status y requeues
```

El operador está construido con:

```text
Go
Kubebuilder
controller-runtime
CustomResourceDefinitions
envtest
Helm
GitHub Actions
GoReleaser
```

La imagen del controlador se publica para múltiples plataformas.

El chart de Helm se publica como un artefacto OCI.

Los CRD se empaquetan dentro del chart.

El workflow de release publica de forma conjunta la GitHub Release, los binarios, la imagen del contenedor y el chart de Helm.

---

## El status forma parte de la API

Un controlador no debería limitarse a ejecutar operaciones remotas.

También debería explicar lo que ha observado.

Los recursos exponen condiciones de Kubernetes con razones como:

```text
RepositoryCreated
RepositoryUpdated
RepositoryAvailable
RulesetCreated
RulesetUpdated
TeamCreated
TeamAvailable
TeamMembershipConfigured
InvitationPending
ReconciliationSuspended
DependencyUnavailable
InvalidDesiredState
ReconciliationFailed
```

Esto permite que usuarios y automatizaciones puedan responder preguntas como:

- ¿Se creó el recurso?
- ¿Se adoptó un recurso ya existente?
- ¿Sigue pendiente una invitación?
- ¿Hay una dependencia referenciada que no está disponible?
- ¿Está suspendido el provider?
- ¿GitHub rechazó la operación?
- ¿Se ha observado la última generación deseada?

El modelo de status forma parte de la experiencia del producto.

No es suficiente ocultar un error de la API remota únicamente en los logs del controlador.

---

## Probar algo más que el happy path

Un test unitario del cliente de GitHub es útil, pero no es suficiente para un controlador.

El proyecto incluye varias capas de validación:

```text
tests unitarios de Go
tests de contrato de las peticiones a GitHub
tests de reconciliación de controladores
envtest
verificación de CRD generados
generación de RBAC
lint y renderizado de Helm
tests end-to-end
```

Los tests de contrato validan el JSON serializado que se envía a GitHub.

Los tests del controlador cubren el comportamiento de reconciliación y las transiciones de estado.

La validación de Helm es importante porque el RBAC generado por Kubebuilder y el RBAC del chart son caminos de distribución diferentes.

Un controlador puede funcionar con `make run` y aun así fallar al instalarse mediante Helm si el chart no incluye los permisos introducidos por un reconciliador nuevo.

Ese tipo de problema reforzó una lección importante:

> Una funcionalidad no está completa cuando el controlador compila. Está completa cuando su API, reconciliación, RBAC, empaquetado, documentación y proceso de actualización funcionan conjuntamente.

---

## Lo que aprendí

Construir el operador implicó mucho más que mapear endpoints REST a métodos de Go.

Algunas de las lecciones más importantes estuvieron relacionadas con el diseño de APIs y ciclos de vida.

### Diseñar la API es más difícil que llamar a la API

La petición remota puede ser sencilla.

Las preguntas difíciles son:

```text
¿Qué significa omitir un campo?
¿Puede adoptarse el recurso?
¿Qué campos solo se utilizan durante la creación?
¿Cómo se detecta el drift?
¿Qué ocurre durante la eliminación?
¿Cómo se protegen las dependencias?
¿Qué identificadores deberían declarar los usuarios?
¿Qué status explica el estado actual?
```

### La semántica de adopción debe ser intencional

Los recursos existentes son el caso normal durante una migración.

El operador debe distinguir entre:

```text
campos observados
campos gestionados
campos borrados explícitamente
campos utilizados solo durante la creación
```

### El comportamiento destructivo debe ser explícito

`Orphan` es el valor por defecto porque eliminar un recurso de Kubernetes no debería implicar silenciosamente destruir el recurso remoto.

### El status forma parte de la usabilidad

Un controlador que realiza la petición correcta pero no explica su estado resulta difícil de operar.

### Los rate limits pertenecen a la arquitectura

Cuando varios controladores comparten credenciales, el presupuesto de API debe coordinarse entre reconciliadores.

### El empaquetado forma parte de la funcionalidad

Los CRD, RBAC, plantillas de Helm, versiones de imagen, automatización de releases y documentación deben permanecer alineados.

### El enfoque es una decisión de producto

El proyecto podría exponer más recursos de GitHub.

Eso no significa que deba hacerlo.

El límite útil es el conjunto de flujos habituales de plataforma que pueden representarse con una semántica clara y segura.

---

## Cuándo tiene sentido este enfoque

[github-platform-operator](https://github.com/pierinho13/github-platform-operator) encaja bien cuando:

- Kubernetes ya actúa como control plane de la plataforma
- Argo CD o Flux ya gestionan el estado deseado
- la configuración de GitHub debe pasar por revisión mediante pull requests
- el estado de repositorios y organización necesita reconciliación continua
- los recursos existentes deben adoptarse de forma segura
- los equipos quieren un operador enfocado en lugar de un framework más amplio de control plane
- los platform engineers necesitan status, referencias y finalizers de Kubernetes

Puede no ser la opción adecuada cuando:

- la configuración de GitHub ya funciona bien mediante Terraform
- la organización ya está estandarizada en Crossplane
- no existe un control plane de Kubernetes
- solo se necesita una pequeña migración puntual
- la funcionalidad necesaria de GitHub está deliberadamente fuera del alcance del proyecto

Una herramienta de plataforma útil debería dejar claros sus límites.

---

## Reflexiones finales

El objetivo principal de [github-platform-operator](https://github.com/pierinho13/github-platform-operator) no es simplemente crear repositorios.

El objetivo es conseguir que la configuración habitual de una plataforma GitHub sea:

```text
declarativa
revisable
adoptable
segura
observable
reconciliada continuamente
```

Los repositorios, equipos, permisos, rulesets, entornos, secretos y variables de GitHub influyen en cómo se construye y entrega el software.

Forman parte de la plataforma.

Cuando ese estado se vuelve declarativo, la pregunta cambia.

En lugar de preguntar:

> ¿Quién cambió esta opción en GitHub?

Puedes preguntar:

> ¿Qué estado debería imponer la plataforma?

El proyecto es open source:

<a href="https://github.com/pierinho13/github-platform-operator" target="_blank" rel="noopener noreferrer">
  https://github.com/pierinho13/github-platform-operator
</a>

La API completa, la guía de instalación, el comportamiento operativo, las políticas de eliminación y los ejemplos están documentados en el repositorio.

Las contribuciones, el feedback, las conversaciones sobre diseño de APIs, las mejoras de controladores, los tests y los nuevos flujos enfocados de plataforma GitHub son bienvenidos.

Si trabajas con plataformas Kubernetes, control planes GitOps, developer platforms o infraestructura cloud-native, puedes conocer mejor mi experiencia o [ponerte en contacto](/contact).
