---
layout: post
title: "kubectl-peek: a simple way to inspect Kubernetes Secrets and see where they are used"
date: 2026-07-17
lang: en
image: https://github.com/user-attachments/assets/10a12751-2e9f-4231-b048-7ad610d9f4ff
excerpt: "I built kubectl-peek to make browsing Kubernetes Secrets faster, simpler, and more useful by combining decoded values with workload usage discovery."
---

Working with Kubernetes Secrets is usually straightforward until you need to answer two very common questions:

**What does this Secret contain?**

And more importantly:

**Where is this Secret being used?**

The usual workflow involves several commands, manual Base64 decoding, searching through Deployments or Pods, and switching between manifests until you finally understand the relationship between a Secret and the workloads that depend on it.

That is why I created **kubectl-peek**.

`kubectl-peek` is a small interactive CLI and native `kubectl` plugin designed to make Secret inspection faster and easier without adding complexity to the cluster.

## Why I built it

I wanted a tool that remained intentionally simple:

- no web interface
- no custom resources
- no controller running inside the cluster
- no additional configuration
- no external database or service
- no need to copy and decode values manually

The tool uses the kubeconfig, context, and namespace you already have configured.

You launch it, select a Secret, and immediately see both its decoded content and the supported workloads that reference it.

## What kubectl-peek does

The tool provides an interactive Secret browser directly in the terminal.

You can:

- browse Secrets in the current namespace
- navigate using the keyboard
- filter interactively by pressing `/`
- pre-filter Secret names from the command line
- switch namespace, context, or kubeconfig
- reveal decoded Secret values
- discover where the selected Secret is used

The same binary can be executed in either form:

```bash
kubectl-peek
```

or as a native `kubectl` plugin:

```bash
kubectl peek
```

Both commands provide exactly the same functionality.

## Demo

<img width="1200" height="700" alt="kubectl-peek demo" src="https://github.com/user-attachments/assets/10a12751-2e9f-4231-b048-7ad610d9f4ff" />

The interaction is intentionally minimal:

1. Run `kubectl peek`
2. Browse the Secret list
3. Press `/` to filter
4. Type part of the Secret name
5. Press `Enter`
6. Review its metadata, usages, keys, and decoded values

## Used by discovery

One of the most useful features is the `Used by` section.

When a Secret is selected, `kubectl-peek` searches the current namespace for supported workloads that reference it.

The first version supports:

- Pods
- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs

It detects references through:

- `env[].valueFrom.secretKeyRef`
- `envFrom[].secretRef`
- Secret-backed volumes
- `imagePullSecrets`
- Init containers
- Ephemeral containers

Example output:

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

This is especially useful when checking whether a Secret is still referenced, investigating a workload, reviewing a namespace, or preparing a Secret rotation.

## Installation with Homebrew

The easiest installation method on macOS is Homebrew.

Add the tap:

```bash
brew tap pierinho13/tools
```

Install the tool:

```bash
brew install --cask kubectl-peek
```

You can also use the fully qualified name:

```bash
brew install --cask pierinho13/tools/kubectl-peek
```

To upgrade later:

```bash
brew update
brew upgrade --cask kubectl-peek
```

## Installation from GitHub Releases

Precompiled binaries are published for macOS, Linux, and Windows.

Download the archive for your operating system and architecture from the GitHub Releases page, extract it, and move the binary into a directory included in your `PATH`.

Example for macOS or Linux:

```bash
tar -xzf kubectl-peek_<version>_<os>_<arch>.tar.gz
chmod +x kubectl-peek
sudo mv kubectl-peek /usr/local/bin/
```

Then verify the installation:

```bash
kubectl-peek --help
```

## Building from source

You can also build it directly with Go:

```bash
git clone https://github.com/pierinho13/kubectl-peek.git
cd kubectl-peek
go build -o kubectl-peek .
```

Move the binary into your `PATH`:

```bash
sudo mv kubectl-peek /usr/local/bin/
```

## Basic usage

Browse Secrets in the current namespace:

```bash
kubectl peek
```

Filter by name before opening the interactive selector:

```bash
kubectl peek database
```

Use another namespace:

```bash
kubectl peek -n staging
```

Use another context:

```bash
kubectl peek --context development-cluster
```

Use a specific kubeconfig:

```bash
kubectl peek --kubeconfig ~/.kube/secondary-config
```

You can combine all options:

```bash
kubectl peek database \
  --namespace staging \
  --context development-cluster \
  --kubeconfig ~/.kube/secondary-config
```

## Permissions

The current Kubernetes identity must be able to read Secrets and list the supported workload resources in the selected namespace.

At minimum, Secret access requires:

```yaml
apiGroups:
  - ""
resources:
  - secrets
verbs:
  - get
  - list
```

The `Used by` functionality also needs list access to Pods, Deployments, StatefulSets, DaemonSets, Jobs, and CronJobs.

## Security considerations

`kubectl-peek` prints decoded Secret values directly to the terminal.

Those values may remain visible in:

- terminal scrollback
- screen recordings
- screenshots
- shared terminal sessions
- captured command output

The tool should only be used in trusted environments and with the minimum Kubernetes permissions required.

## Final thoughts

`kubectl-peek` is not intended to replace a full Kubernetes management platform.

Its goal is much smaller:

**make one common Kubernetes task faster, clearer, and easier to use.**

By combining interactive Secret browsing, decoded values, and workload usage discovery in a single command, it reduces the amount of manual investigation needed during day-to-day platform work.

The project is open source and available on GitHub:

[github.com/pierinho13/kubectl-peek](https://github.com/pierinho13/kubectl-peek)

If you're interested in this kind of platform engineering work, you can learn more about my experience or [get in touch](/en/contact).