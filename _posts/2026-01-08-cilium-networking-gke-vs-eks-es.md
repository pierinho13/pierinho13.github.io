---
layout: post
title: "Cilium en EKS vs GKE: por qué el networking en Kubernetes se siente más simple en GKE"
date: 2026-01-08
lang: es
image: https://plus.unsplash.com/premium_photo-1744345196324-94c618a49bc3?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&q=80
excerpt: "Tras desplegar Cilium tanto en EKS como en GKE, una diferencia quedó muy clara: el networking es significativamente más fácil de razonar en GKE."
---

Tras desplegar **Cilium** tanto en **EKS** como en **GKE**, hubo algo que se volvió muy evidente:

**El networking es mucho más fácil de razonar en GKE.**

No se trata de qué plataforma es “mejor”, sino de qué tan alineado está su modelo de red con la forma en la que Kubernetes fue diseñado originalmente.

## El networking de Kubernetes como fue concebido (GKE)

En GKE, el modelo de red de Kubernetes se siente natural y predecible. La mayoría de las cosas se comportan como esperas si entiendes los fundamentos de Kubernetes.

Algunas características clave:

- Los pods obtienen IPs desde **rangos secundarios de la VPC**
- **IPAM puede funcionar en modo `kubernetes`** sin fricción
- Las IPs de los pods son **ciudadanos de primera clase** dentro de la VPC
- La densidad de pods y el escalado son predecibles
- Las funcionalidades avanzadas de Cilium funcionan con mínimos ajustes específicos de la plataforma

Desde el punto de vista operativo, esto reduce mucho la carga mental. Piensas en términos de Kubernetes, no en limitaciones de infraestructura.

## Donde EKS añade fricción

EKS es una plataforma sólida, pero su networking está más acoplado a primitivas de infraestructura propias de AWS.

En la práctica, esto introduce varias restricciones adicionales:

- Las IPs de los pods están ligadas a **ENIs**
- El agotamiento de IPs requiere **muchísima más planificación previa**
- La densidad de pods depende del tipo de instancia EC2
- Algunas funcionalidades de Cilium requieren cambiar el **tipo de target del Load Balancer** (instance vs IP)
- El modelo mental pasa a ser **infraestructura-céntrico**, no Kubernetes-céntrico

Nada de esto convierte a EKS en una mala plataforma. Pero sí implica que operar configuraciones avanzadas de red requiere un mayor conocimiento de los detalles internos de AWS y más disciplina operativa.

## Cilium amplifica las diferencias

Cilium no es el problema. De hecho, funciona muy bien en ambas plataformas.

Pero precisamente porque Cilium expone y se apoya en conceptos de networking nativos de Kubernetes, **las diferencias entre plataformas se hacen más visibles**:

- En GKE, Cilium se siente como una extensión natural de la plataforma
- En EKS, Cilium a menudo te obliga a revisar decisiones de red de bajo nivel

Esto se nota especialmente cuando trabajas con:
- Políticas FQDN
- Control avanzado de egress
- Integraciones con load balancers
- Clústeres con alta densidad de pods

## Perspectiva operativa

Desde el punto de vista de platform engineering, el soporte nativo de GKE para rangos secundarios elimina gran parte de la fricción operativa.

Permite:
- Escalar clústeres sin pensar constantemente en límites de IP
- Aplicar políticas de red con menos sorpresas
- Centrarse en abstracciones de Kubernetes en lugar de soluciones específicas del proveedor cloud

En EKS, los mismos resultados son posibles, pero normalmente requieren **más planificación, más restricciones y mayor disciplina operativa**.

## Reflexión final

Esto no es un debate GKE vs EKS.

Ambas plataformas están preparadas para producción y se usan ampliamente a gran escala.

Pero si tu plataforma depende fuertemente de networking avanzado en Kubernetes, **el modelo de red de GKE se siente más cercano a cómo Kubernetes quiere ser operado**, y eso se traduce directamente en una menor carga cognitiva para los equipos de plataforma.

A veces, menos sorpresas es la mejor característica.

Si te interesa este tipo de arquitecturas, puedes ver más sobre mi experiencia o [contactarme](/es/contacto).
