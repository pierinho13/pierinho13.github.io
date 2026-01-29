---
layout: post
title: "Exposing Internal and External URLs in GKE Without Mixing Responsibilities"
date: 2026-01-12
lang: en
image: /assets/img/load-balancers.png
excerpt: "Designing how internal and external services are exposed in Kubernetes is key to preserving isolation, security, and operational clarity in GCP."
---

When designing an architecture in **GCP with Kubernetes**, one of the most important decisions is **how to expose internal and external URLs without mixing responsibilities or compromising security**.

This is not about “what works”, but about **what mental model you want to enforce in your platform**.

## Internal URLs: accessible only from your network

For internal services (backoffice, operations, private APIs), the cleanest pattern is to use an **Internal Load Balancer**.

In this model:

- The service has **only a private IP**
- Access is limited to:
  - VPN
  - corporate network
  - internal workloads within the VPC
- There is no public endpoint reachable from the Internet

In **GKE**, this is usually implemented as:

- An **internal** Service or Ingress
- Traefik (or another ingress controller) exposed only through an **Internal Load Balancer**
- Firewall rules and network routing providing real isolation

The key advantage is clear:

> Internal services **do not exist** for the Internet, not even due to application misconfiguration.

Here, isolation does not rely on headers, paths, or middlewares, but on **network boundaries**.

## External URLs: exposed in a controlled way

For public services (websites, public APIs), the standard pattern is an **External HTTP(S) Load Balancer**.

A very common and effective design in GKE is:

- External Load Balancer (with **Cloud Armor**, if applicable)
- The load balancer routes traffic to **GKE NEGs**
- NEGs point directly to **Traefik pods**
- Traefik handles routing to services inside the cluster

Important characteristics of this approach:

- Traefik **does not need its own public IP**
- The only Internet-facing component is the Load Balancer
- Pod access is restricted to Google infrastructure (health checks / proxies)
- No NodePorts or additional Load Balancers are exposed

This pattern reduces complexity and works very well as a **public edge**, keeping control at the perimeter.

## One gateway, two entry paths

Although both patterns use **Traefik** and **Kubernetes**, their goals are different:

- **Internal**: isolation through networking
- **External**: controlled exposure at the perimeter (LB + WAF)

Both traffic flows converge at the same logical point inside the cluster:

- Internal traffic reaches Traefik through an **Internal Load Balancer**
- External traffic reaches Traefik through **NEGs from an External Load Balancer**

The final backend is the same: **the cluster’s microservices**.  
What changes is **how** traffic reaches them.

## The real decision

You can:

- Use Traefik for private URLs
- Use Traefik for public URLs
- Share backend services when it makes sense

But you should never **mix entry points**.

The decision is not “what works”, but:

> what level of isolation you want and where you place your real perimeter.

Designing this separation correctly from the beginning reduces complexity, lowers operational risk, and makes the architecture much easier to reason about over time.

If you are designing or evolving a GKE platform and want to discuss these patterns, you can [contact me](/en/contact).
