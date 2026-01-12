---
layout: post
title: "Exponiendo URLs internas y externas en GKE sin mezclar responsabilidades"
date: 2026-01-12
lang: es
image: /assets/img/load-balancers.png
excerpt: "Diseñar correctamente cómo exponer servicios internos y externos en Kubernetes es clave para mantener aislamiento, seguridad y claridad operativa en GCP."
---

Cuando diseñas una arquitectura en **GCP con Kubernetes**, una de las decisiones más importantes es **cómo exponer tus URLs internas y externas sin mezclar responsabilidades ni comprometer seguridad**.

No es un problema de “qué funciona”, sino de **qué modelo mental quieres imponer a tu plataforma**.

## URLs internas: accesibles solo desde tu red

Para servicios internos (backoffice, operaciones, APIs privadas), el patrón más limpio es usar un **Internal Load Balancer**.

En este modelo:

- El servicio solo tiene **IP privada**
- El acceso se realiza desde:
  - VPN
  - red corporativa
  - workloads internos en la VPC
- No existe ningún endpoint público alcanzable desde Internet

En **GKE**, esto suele materializarse como:

- Service o Ingress **interno**
- Traefik (u otro ingress) expuesto únicamente mediante un **Internal Load Balancer**
- Firewall y routing de red proporcionando el aislamiento real

La ventaja clave es clara:

> Lo interno **no existe** para Internet, ni siquiera por error de configuración de aplicación.

Aquí el aislamiento no depende de headers, rutas o middlewares, sino de **red**.

## URLs externas: expuestas de forma controlada

Para servicios públicos (webs, APIs públicas), el patrón habitual es un **External HTTP(S) Load Balancer**.

Un diseño muy común y efectivo en GKE es:

- External Load Balancer (con **Cloud Armor** si aplica)
- El load balancer enruta tráfico hacia **NEGs de GKE**
- Los NEGs apuntan directamente a pods de **Traefik**
- Traefik se encarga del routing a los servicios dentro del clúster

Puntos importantes de este enfoque:

- Traefik **no necesita IP pública propia**
- El único punto accesible desde Internet es el Load Balancer
- El acceso a los pods está limitado a la infraestructura de Google (health checks / proxies)
- No existen NodePorts ni Load Balancers adicionales abiertos

Este patrón reduce complejidad y funciona muy bien como **edge público**, manteniendo el control en el perímetro.

## Un solo gateway, dos caminos de entrada

Aunque ambos patrones usen **Traefik** y **Kubernetes**, el objetivo de cada uno es distinto:

- **Interno**: aislamiento por red
- **Externo**: exposición controlada por perímetro (LB + WAF)

Ambos flujos convergen en el mismo punto lógico dentro del clúster:

- El tráfico interno llega a Traefik a través de un **Internal Load Balancer**
- El tráfico externo llega a Traefik a través de **NEGs desde un External Load Balancer**

El backend final es el mismo: **los microservicios del clúster**.  
Lo que cambia es **cómo** se llega hasta ellos.

## La decisión real

Puedes:

- Usar Traefik para URLs privadas
- Usar Traefik para URLs públicas
- Compartir backend services si tiene sentido

Pero nunca deberías **confundir los puntos de entrada**.

La decisión no es “qué funciona”, sino:

> qué nivel de aislamiento quieres y dónde colocas tu perímetro real.

Diseñar bien esta separación desde el principio ahorra complejidad, reduce riesgo operativo y hace que la arquitectura sea mucho más fácil de razonar a largo plazo.

Si estás diseñando o evolucionando una plataforma en GKE y quieres comentar estos patrones, puedes [contactar conmigo](/es/contact).
