---
layout: post
title: "Cilium on EKS vs GKE: why Kubernetes networking feels simpler on GKE"
date: 2026-01-08
lang: en
image: https://plus.unsplash.com/premium_photo-1744345196324-94c618a49bc3?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&q=80
excerpt: "After rolling out Cilium on both EKS and GKE, one difference became very clear: networking is significantly easier to reason about on GKE."
---

After rolling out **Cilium** on both **EKS** and **GKE**, one thing became very clear to me:

**Networking is much easier to reason about on GKE.**

This is not about which platform is “better”, but about how closely the networking model aligns with how Kubernetes was originally designed to work.

## Kubernetes networking as designed (GKE)

On GKE, the Kubernetes networking model feels natural and predictable. Most things behave the way you expect them to if you understand Kubernetes fundamentals.

Some key characteristics:

- Pods receive IPs from **secondary VPC ranges**
- **IPAM can run in `kubernetes` mode** without friction
- Pod IPs are **first-class citizens** in the VPC
- Pod density and scaling behave in a predictable way
- Advanced Cilium features work with minimal platform-specific adjustments

From an operator point of view, this removes a lot of mental overhead. You reason in Kubernetes terms, not in infrastructure constraints.

## Where EKS adds friction

EKS is a solid platform, but networking is more tightly coupled to AWS infrastructure primitives.

In practice, this introduces additional constraints:

- Pod IPs are tied to **ENIs**
- IP exhaustion requires **much more upfront planning**
- Pod density is constrained by EC2 instance types
- Some Cilium features require changing **Load Balancer target types** (instance vs IP)
- The mental model becomes **infrastructure-driven**, not Kubernetes-driven

None of this makes EKS a bad platform. But it does mean that operating advanced networking setups requires deeper knowledge of AWS internals and more careful capacity planning.

## Cilium amplifies the differences

Cilium itself is not the problem. In fact, it works very well on both platforms.

However, because Cilium exposes and relies on Kubernetes-native networking concepts, **platform differences become more visible**:

- On GKE, Cilium feels like a natural extension of the platform
- On EKS, Cilium often forces you to revisit lower-level networking decisions

This is especially noticeable when working with:
- FQDN policies
- Advanced egress control
- Load balancer integrations
- High pod density clusters

## Operational perspective

From a platform engineering point of view, GKE’s native support for secondary ranges removes a lot of operational friction.

It allows you to:
- Scale clusters without constantly thinking about IP limits
- Apply network policies with fewer surprises
- Focus on Kubernetes abstractions instead of cloud-specific workarounds

On EKS, the same outcomes are possible, but they usually require **more planning, more constraints, and more operational discipline**.

## Final thoughts

This is not a GKE vs EKS debate.

Both platforms are production-ready and widely used at scale.

But if your platform relies heavily on advanced Kubernetes networking, **GKE’s networking model feels closer to how Kubernetes wants to be operated**, and that translates directly into lower cognitive load for platform teams.

Sometimes, fewer surprises is the biggest feature.

If you're interested in this kind of architecture, you can learn more about my experience or [get in touch](/en/contact).
