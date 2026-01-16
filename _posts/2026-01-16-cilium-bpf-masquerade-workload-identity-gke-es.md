---
layout: post
title: "Cilium BPF masquerade puede romper Workload Identity en GKE"
date: 2026-01-16
lang: es
image: /assets/img/cilium-cab-break-wi.png
excerpt: "Cilium con BPF masquerade puede interferir con Workload Identity en GKE, causando que los Pods usen el service account del nodo en lugar del esperado."
---

En GKE, **Workload Identity Federation for GKE** permite que un Pod obtenga credenciales de Google Cloud **sin claves** y con permisos definidos en IAM. La idea es simple: el Pod usa un **Kubernetes ServiceAccount (KSA)**, que se mapea a un **Google Service Account (GSA)**, y las llamadas a APIs de Google se autorizan con los roles del GSA.

## Cómo funciona Workload Identity en GKE

Imagina un Pod que necesita **acceder a Cloud Storage** para leer o escribir objetos en un bucket.

En lugar de usar claves JSON, en GKE con Workload Identity haces lo siguiente:

1. Creas un **Google Service Account (GSA)** con permisos sobre Cloud Storage (por ejemplo `roles/storage.objectViewer`).
2. Asocias ese GSA a un **Kubernetes Service Account (KSA)**.
3. Configuras el Pod para usar ese KSA.

Desde ese momento, ese Pod **pasa a tener los permisos del GSA**, igual que si fuera ese service account de Google.

### ¿Qué ocurre dentro del Pod?

La aplicación del Pod (por ejemplo, usando el SDK oficial de Google Cloud) utiliza **Application Default Credentials (ADC)** sin saber nada de Kubernetes ni de IAM.

Cuando la aplicación intenta acceder a Cloud Storage:

1. El SDK intenta obtener credenciales llamando al **metadata server** (como haría en una VM de Compute Engine).
2. En GKE, esa llamada es atendida por el **GKE metadata server**, que sabe qué Pod está haciendo la petición.
3. El metadata server identifica el **Kubernetes Service Account (KSA)** del Pod.
4. A partir del KSA, aplica el mapeo hacia el **Google Service Account (GSA)** configurado.
5. Devuelve al Pod un **token de Google Cloud** con los permisos del GSA.

Desde el punto de vista del Pod y de la aplicación:

- No hay claves
- No hay configuración especial en el código
- Simplemente "tiene permisos" para acceder a Cloud Storage

El Pod cree que está corriendo con credenciales válidas de Google Cloud, cuando en realidad GKE está haciendo toda la traducción **KSA → GSA** de forma transparente.

## Configuración típica (KSA ↔ GSA) en GKE

A alto nivel, el flujo de configuración es:

1. Crear un **Google Service Account (GSA)** en IAM.
2. Asignarle los roles necesarios (por ejemplo, `roles/dns.admin` si vas a manipular Cloud DNS).
3. Permitir que el **Kubernetes ServiceAccount (KSA)** pueda impersonar al GSA, otorgando `roles/iam.workloadIdentityUser` al principal del KSA sobre el GSA.
4. Anotar el **KSA** con el email del GSA (`iam.gke.io/gcp-service-account`).
5. Configurar los Pods para usar ese KSA (`serviceAccountName`).

## Verificación de la identidad del Pod

Una forma sencilla de comprobar qué identidad está resolviendo un Pod es consultar el metadata server:

```sh
curl -s -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"
echo
```

Ejemplos de salida esperada:

```text
# Workload Identity funcionando correctamente (GSA asociado al Pod)
certmanager-igeo-operations@igeooperations.iam.gserviceaccount.com
```

```text
# Workload Identity roto (identidad del nodo)
gke-node-sa-igeo-operations@igeooperations.iam.gserviceaccount.com
```

Si ves el GSA asociado al Pod, Workload Identity está funcionando.
Si ves el service account del nodo, algo está interfiriendo en el proceso.

Para una comprobación más completa, también puedes pedir directamente un token:

```sh
curl -s -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
```

## El problema: Cilium con BPF masquerade

Para que Workload Identity funcione correctamente, el metadata server de GKE necesita **atribuir cada petición al Pod correcto**.
Una de las piezas clave para hacerlo es la **identidad de red de la petición**, típicamente la IP origen del Pod.

Aquí es donde entra Cilium.

Cilium implementa masquerading/NAT para tráfico saliente: en la práctica, **puede ocultar la IP del Pod detrás de la IP del nodo** cuando el tráfico sale del cluster.

En Helm values, esto suele configurarse así:

```yaml
bpf:
  masquerade: true
```

En ciertos escenarios en GKE, con `bpf.masquerade: true`, la petición del Pod al metadata server puede salir **SNATeada**. Cuando esto ocurre, el metadata server ve la petición como si viniera del **nodo**, no del **Pod**.

El resultado es el siguiente:

* El metadata server ya no puede asociar la petición al KSA.
* No se aplica el mapeo KSA → GSA.
* La respuesta cae al **service account del nodo**.

El síntoma es muy claro:

* **Antes (sin masquerade):**

  * `.../default/email` devuelve el **GSA del Pod**.

* **Con BPF masquerade activado:**

  * `.../default/email` devuelve el **service account del nodo**.
  * El Pod hereda los permisos (o la falta de permisos) del nodo, no los esperados.

Este tipo de rotura está documentada en issues de Cilium en GKE relacionados con metadata y Workload Identity cuando se usa el datapath BPF.

## Recomendación práctica: en GKE con Cloud NAT, evitar BPF masquerade

Si tus nodos son privados y tienes **Cloud NAT para salida**, normalmente **no necesitas** `bpf.masquerade` para tener conectividad a Internet: el egress acabará saliendo con las IP públicas del NAT igualmente.

En ese contexto, `bpf.masquerade` suele aportar poco valor y, como has visto, puede introducir efectos secundarios difíciles de diagnosticar.

La recomendación operativa es:

```yaml
bpf:
  masquerade: false
```

Después, valida que:

* El egress (salida a Internet / APIs externas) funciona correctamente.
* Workload Identity vuelve a resolver el GSA correcto.

## Si necesitas SNAT por razones específicas

Si en algún momento necesitas masquerade para un caso concreto (rutas de retorno complejas, egress gateway, etc.), la aproximación correcta es **masqueradear el tráfico normal pero excluir metadata/link-local**, ya que Workload Identity depende de esas llamadas.

Alternativas habituales:

* Usar `ip-masq-agent` con `masqLinkLocal: false` y exclusión explícita de `169.254.0.0/16`.
* Ajustar la configuración o versión de Cilium para evitar SNAT hacia el metadata server.

## Resumen

* Workload Identity en GKE se apoya en el **GKE metadata server** para entregar credenciales del **GSA** asociado al **KSA**.
* El metadata server necesita poder atribuir la petición al Pod correcto.
* Con Cilium y `bpf.masquerade: true`, el tráfico hacia metadata puede salir SNATeado y "parecer" venir del nodo.
* En ese caso, Workload Identity se rompe y el Pod pasa a usar el service account del nodo.
* Si tienes Cloud NAT, dejar `masquerade: false` suele ser más seguro y suficiente para egress.

Si estás operando Cilium en GKE y ves comportamientos extraños con Workload Identity, revisa primero tu configuración de masquerade.
Y si quieres discutir estos trade-offs de diseño, [ponte en contacto](/es/contacto).
