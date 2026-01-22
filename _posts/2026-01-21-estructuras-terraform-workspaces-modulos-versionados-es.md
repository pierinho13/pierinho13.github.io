---
layout: post
title: "¿Cómo estructurar tus proyectos Terraform? Workspaces vs repositorios por entorno"
date: 2026-01-21
lang: es
image: /assets/img/non_recommended_structure_terraform.png
excerpt: "En muchos equipos es habitual encontrar una estructura de Terraform basada en un único repositorio con carpetas por entorno. Aunque funciona, existen alternativas más robustas para entornos productivos."
---

En muchos equipos es habitual encontrar una estructura de Terraform basada en un único repositorio, con carpetas por entorno (prod, preprod, staging) y una carpeta común de módulos reutilizables. Aunque no es un estándar oficial definido por Terraform, sí es un patrón muy extendido en la comunidad, especialmente en equipos que empiezan a escalar su infraestructura como código.

Un ejemplo típico de este enfoque sería el siguiente:

```
terraform-infra/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── prod/
│   ├── backend.tf
│   ├── providers.tf
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars
├── preprod/
│   ├── backend.tf
│   ├── providers.tf
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars
└── staging/
    ├── backend.tf
    ├── providers.tf
    ├── main.tf
    ├── variables.tf
    └── terraform.tfvars
```

En este modelo, cada entorno referencia los módulos locales definidos dentro del mismo repositorio, por ejemplo desde `prod/main.tf`:

```hcl
module "vpc" {
  source = "../modules/vpc"
  name   = "prod"
}

module "eks" {
  source = "../modules/eks"
}
```

Este enfoque funciona bien en equipos pequeños o en fases iniciales, y suele combinarse con **Terraform workspaces** para gestionar múltiples estados desde la misma base de código.

## Workspaces: contexto y limitaciones

Terraform, por diseño, es flexible respecto a la organización del código y no impone una estructura concreta. En este contexto, los Terraform workspaces suelen aparecer como una solución natural para gestionar múltiples entornos desde la misma base de código, algo que encaja especialmente bien con **Terraform Cloud**, donde el workspace se selecciona explícitamente desde la interfaz y queda claramente asociado a un estado, variables y políticas concretas.

Sin embargo, fuera de Terraform Cloud, el uso de workspaces introduce ciertos riesgos operativos. En ejecución local o en pipelines genéricas, el workspace activo depende del contexto del comando (`terraform workspace select`). Esto hace que el error humano sea más probable: un `apply` ejecutado en el workspace incorrecto puede impactar en el entorno equivocado si no existen controles adicionales.

La propia documentación oficial de Terraform reconoce esta limitación y, en la sección **Alternatives to Workspaces**, propone una estrategia distinta para escenarios más complejos:

> "Instead of creating CLI workspaces, you can use one or more re-usable modules to represent the common elements and then represent each instance as a separate configuration that instantiates those common elements in the context of a different backend."
>
> — [Terraform CLI – Workspaces](https://developer.hashicorp.com/terraform/cli/workspaces#alternatives-to-workspaces)

Esto respalda la idea de que, cuando los entornos requieren un aislamiento claro —por ejemplo distintos backends, credenciales o dominios de responsabilidad— usar configuraciones separadas que consumen módulos reutilizables puede ser más robusto que depender únicamente de workspaces en la CLI.

## Un repositorio por entorno

Desde esta perspectiva, una alternativa habitual en entornos productivos es utilizar **un repositorio por entorno**. En este modelo, cada entorno (producción, preproducción, etc.) tiene su propio repositorio, su propio backend, su propio estado y su propio control de accesos, reduciendo significativamente el riesgo de errores operativos.

La reutilización se consigue mediante **módulos compartidos**, idealmente alojados en repositorios independientes, con versionado explícito y controlado. Terraform no solo soporta este enfoque, sino que lo documenta de forma clara.

En la documentación oficial sobre configuración de módulos, Terraform explica cómo instalar versiones concretas de un módulo, tanto desde registries como desde repositorios Git, permitiendo fijar una versión mediante tags, ramas o hashes:

> "If you are using modules hosted in GitHub, BitBucket, or another Git repository, Terraform clones and uses the default branch referenced by HEAD. You can add the ref query parameter to the location specified in the source argument to reference any value supported by the git checkout command, such as a branch, SHA-1 hash, or tag."
>
> — [Terraform – Module Configuration](https://developer.hashicorp.com/terraform/language/modules/configuration)

La propia documentación incluye ejemplos explícitos utilizando tags versionados y hashes para fijar la versión exacta del módulo:

```hcl
module "vpc" {
  source = "git::https://example.com/vpc.git?ref=v1.2.0"
}

module "storage" {
  source = "git::https://example.com/storage.git?ref=51d462976d84fdea54b47d80dcabbf680badcdb8"
}
```

Este enfoque permite que distintos entornos consuman el mismo módulo, pero con versiones distintas y variables distintas, facilitando una evolución controlada de la infraestructura sin romper entornos existentes.

## Ejemplo práctico: repositorios por entorno con módulos versionados

Una posible materialización práctica de este enfoque es separar los entornos en repositorios independientes y consumir módulos compartidos desde repositorios externos, fijando versiones concretas.

### Repositorios de módulos (compartidos)

```
tf-modules-vpc/        (tags: v1.2.0, v1.3.0, v2.0.0)
tf-modules-eks/        (tags: v0.9.1, v1.0.0)
tf-modules-rds/        (tags: v3.4.2)
```

Cada módulo se desarrolla, evoluciona y versiona de forma independiente.

### Repositorio de entorno: preproducción

```
infra-preprod/
├── backend.tf
├── providers.tf
├── versions.tf
├── main.tf
├── variables.tf
└── env/
    └── preprod.tfvars
```

Ejemplo de consumo de módulos en `infra-preprod/main.tf`:

```hcl
module "vpc" {
  source = "git::https://github.com/tu-org/tf-modules-vpc.git?ref=v1.3.0"
  name   = "preprod"
}

module "eks" {
  source = "git::https://github.com/tu-org/tf-modules-eks.git?ref=v1.0.0"
}
```

### Repositorio de entorno: producción

```
infra-prod/
├── backend.tf
├── providers.tf
├── versions.tf
├── main.tf
├── variables.tf
└── env/
    └── prod.tfvars
```

Ejemplo de consumo de módulos en `infra-prod/main.tf`:

```hcl
module "vpc" {
  source = "git::https://github.com/tu-org/tf-modules-vpc.git?ref=v1.2.0"
  name   = "prod"
}

module "eks" {
  source = "git::https://github.com/tu-org/tf-modules-eks.git?ref=v0.9.1"
}
```

### Ventajas de este modelo

De este modo:

- Ambos entornos reutilizan los mismos módulos
- Cada entorno fija explícitamente la versión del módulo que consume
- Preproducción puede avanzar versiones antes que producción
- Producción permanece estable hasta que se decide actualizar

## Conclusión

Los Terraform workspaces encajan muy bien cuando se usan junto con Terraform Cloud y controles claros desde la plataforma. Sin embargo, para organizaciones con múltiples entornos críticos, pipelines automatizadas y necesidades fuertes de aislamiento, un modelo basado en **repositorios por entorno**, combinado con **módulos reutilizables versionados**, suele ofrecer mayor claridad, control y seguridad operativa a largo plazo.

## Otros recursos interesantes de HashiCorp

Para profundizar en los distintos enfoques de organización de código Terraform y entender mejor los trade-offs entre estructuras, repositorios y módulos, estos recursos oficiales de HashiCorp resultan especialmente útiles:

**[Terraform Repository Best Practices](https://www.hashicorp.com/en/resources/terraform-repository-best-practices)**  
Una guía práctica sobre cómo estandarizar repositorios Terraform, reducir duplicaciones y mejorar mantenibilidad, sin imponer una única estructura válida.

**[Terraform Mono-Repo vs Multi-Repo: The Great Debate](https://www.hashicorp.com/en/blog/terraform-mono-repo-vs-multi-repo-the-great-debate)**  
Análisis de ventajas y desventajas entre enfoques monorepo y multi-repo aplicados a Terraform, destacando que la decisión depende del contexto organizativo y operativo.

**[Structuring Terraform Configuration for Production](https://www.hashicorp.com/en/blog/structuring-hashicorp-terraform-configuration-for-production)**  
Recomendaciones para evolucionar configuraciones Terraform hacia entornos productivos, enfatizando la separación de responsabilidades y el uso de módulos reutilizables.

**[Terraform CLI – Workspaces (Alternatives to Workspaces)](https://developer.hashicorp.com/terraform/cli/workspaces#alternatives-to-workspaces)**  
Documentación oficial donde HashiCorp describe explícitamente alternativas a los workspaces basadas en configuraciones separadas que reutilizan módulos comunes con backends distintos.

**[Terraform – Module Configuration](https://developer.hashicorp.com/terraform/language/modules/configuration)**  
Documentación oficial sobre cómo consumir módulos desde registries o repositorios Git, incluyendo versionado mediante tags, ramas o hashes.

Si te interesa este tipo de arquitecturas, puedes ver más sobre mi experiencia o [contactarme](/es/contacto).
