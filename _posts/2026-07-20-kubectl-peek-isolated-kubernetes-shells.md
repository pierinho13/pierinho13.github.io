---
layout: post
title: "kubectl-peek now opens isolated Kubernetes shells for any context and namespace"
date: 2026-07-20
lang: en
image: https://github.com/user-attachments/assets/9eb0f303-cc02-4cc2-b434-ead0ceb10c35
excerpt: "kubectl-peek now lets you open isolated, context-aware Kubernetes shells backed by temporary kubeconfigs, so you can work across clusters and namespaces without changing your real context or repeating flags."
---

Switching between Kubernetes clusters and namespaces is one of those small tasks that becomes surprisingly expensive when you do it all day.

A typical workflow looks like this:

```bash
kubectl config use-context staging
kubectl config set-context --current --namespace payments
kubectl get pods
```

Then a few minutes later:

```bash
kubectl config use-context production
kubectl config set-context --current --namespace payments
kubectl get pods
```

This works, but it also changes your real kubeconfig state.

That creates several familiar problems:

- you forget which context is currently active
- a new terminal inherits a context changed somewhere else
- you keep passing `--context` and `--namespace` to every command
- you risk running a command against the wrong cluster
- parallel work across environments becomes awkward
- tools such as Helm and Flux need the same scope repeated again

The newest version of **kubectl-peek** solves this with isolated Kubernetes shells.

You can now select a context and namespace, open a temporary shell scoped to both, work normally, and return to your original environment with a simple `exit`.

No permanent context switch.

No modification to your original kubeconfig.

No need to repeat flags on every command.

---

## kubectl-peek is becoming a broader Kubernetes productivity CLI

`kubectl-peek` originally started as an interactive way to inspect Kubernetes Secrets and discover which resources use, produce, or reference them.

That functionality is still available through:

```bash
kubectl-peek secret
```

But the project now covers several first-class Kubernetes workflows:

```text
kubectl-peek
├── secret       Inspect Secrets and their relationships
├── namespace    Select and persist a namespace
└── shell        Open an isolated context-aware shell
```

Running the root command now shows the available workflows:

```bash
kubectl-peek
```

The same commands also work as a native `kubectl` plugin:

```bash
kubectl peek secret
kubectl peek namespace
kubectl peek shell
```

---

## The common problem: context switching changes global state

Kubernetes contexts are convenient because they combine:

- a cluster
- user credentials
- a default namespace

But changing the active context also changes the state used by your normal terminal session.

For example:

```bash
kubectl config use-context production
```

After that, every command that relies on the default kubeconfig starts targeting production unless you explicitly override it.

The same applies to namespaces:

```bash
kubectl config set-context --current --namespace payments
```

This is especially inconvenient when you need to compare environments or work in several clusters at the same time.

You can avoid changing context by passing flags:

```bash
kubectl \
  --context production \
  --namespace payments \
  get pods
```

But then every command becomes repetitive:

```bash
kubectl --context production -n payments get pods
helm --kube-context production -n payments list
flux --context production -n payments get all
```

The isolated shell workflow gives you the convenience of a selected context and namespace without changing your real kubeconfig.

---

## Open an isolated Kubernetes shell

Run:

```bash
kubectl-peek shell
```

`kubectl-peek` will:

1. list the contexts available in your kubeconfig
2. let you select one interactively
3. connect through that context
4. list the namespaces available in that cluster
5. let you select a namespace
6. create a temporary kubeconfig
7. open a child shell using that temporary configuration

The full workflow looks like this:

```text
Select a Kubernetes context
            │
            ▼
List namespaces available through that context
            │
            ▼
Select a namespace
            │
            ▼
Create a temporary kubeconfig
            │
            ▼
Open an isolated shell
```

---

## Demo

<img width="1800" height="800" alt="kubectl-peek isolated Kubernetes shell demo" src="https://github.com/user-attachments/assets/9eb0f303-cc02-4cc2-b434-ead0ceb10c35" />

Inside the child shell, the selected context and namespace remain visible in the prompt:

```text
[k8s:production ns:payments] piero@MacBook-Pro %
```

The context is displayed in cyan and the namespace in yellow on terminals that support ANSI colors.

That small visual indicator makes a real difference when several terminals are open at the same time.

---

## Skip the interactive selectors when you already know the target

You can provide the context directly:

```bash
kubectl-peek shell --context production
```

In that case, only the namespace selector is displayed.

You can also provide the namespace:

```bash
kubectl-peek shell -n payments
```

`kubectl-peek` will ask for the context and validate that the namespace exists in the selected cluster.

To skip both selectors:

```bash
kubectl-peek shell \
  --context production \
  --namespace payments
```

This is useful for aliases, scripts, documentation, or environments you use frequently.

---

## Work normally inside the shell

Once the isolated shell is open, you can use your usual Kubernetes tools without repeating context or namespace options:

```bash
kubectl get pods
kubectl get services
kubectl describe deployment api
helm list
flux get all
```

All of those commands use the temporary kubeconfig exposed to the child shell through `KUBECONFIG`.

The parent terminal remains unchanged.

---

## The original kubeconfig is not modified

The temporary kubeconfig is created specifically for the child shell.

It:

- contains the effective Kubernetes configuration
- preserves clusters, users, contexts, credentials, and exec plugins
- embeds certificate and key data referenced through local file paths
- selects the requested context
- applies the selected namespace only to that context
- is created with `0600` permissions
- is exposed only inside the child shell
- is removed after leaving the shell

The original kubeconfig remains untouched.

When you finish:

```bash
exit
```

you return to the previous terminal with the same Kubernetes configuration you had before.

---

## Work across multiple clusters in parallel

This is one of the most useful parts of the new workflow.

Open one terminal for staging:

```bash
kubectl-peek shell \
  --context staging \
  --namespace payments
```

Open another for production:

```bash
kubectl-peek shell \
  --context production \
  --namespace payments
```

Now each terminal has its own temporary Kubernetes scope:

```text
[k8s:staging ns:payments]
```

and:

```text
[k8s:production ns:payments]
```

You can compare logs, resources, Helm releases, Flux state, or deployments without repeatedly switching your shared context.

---

## Nested isolated shells are blocked

Opening isolated shells inside isolated shells can become confusing very quickly.

For that reason, `kubectl-peek` detects an active isolated shell before displaying any selectors.

Attempting to open another one returns an error similar to:

```text
an isolated kubectl-peek shell is already active
(context "production", namespace "payments");
run exit before opening another one
```

The check happens early, before selecting another context or namespace.

---

## Namespace-first workflow

The existing namespace selector can also open an isolated shell:

```bash
kubectl-peek namespace --shell
```

This workflow is useful when you want to keep the current context and only select a namespace.

You can provide an initial filter:

```bash
kubectl-peek namespace pay --shell
```

Or select another context explicitly:

```bash
kubectl-peek namespace \
  --context staging \
  --shell
```

Without `--shell`, the command persists the selected namespace in the chosen kubeconfig context:

```bash
kubectl-peek namespace
```

That gives you both options:

- persist a namespace intentionally
- open an ephemeral namespace-scoped shell

---

## Secret inspection is now an explicit command

As `kubectl-peek` has grown beyond Secrets, Secret inspection has moved into its own first-class command:

```bash
kubectl-peek secret
```

Filter by name:

```bash
kubectl-peek secret database
```

Inspect another namespace:

```bash
kubectl-peek secret database -n staging
```

Load custom CRD discovery rules:

```bash
kubectl-peek secret \
  --rules ./examples/rules-all.yaml
```

Secret inspection still includes:

- interactive selection
- filtering and pagination
- decoded values
- built-in relationship discovery
- custom CRD discovery through YAML rules
- `uses`, `produces`, and `references` relationships

The difference is that the CLI now presents Secrets, namespaces, and isolated shells as equally important workflows.

---

## Why temporary kubeconfigs instead of changing the process environment only?

Setting a namespace environment variable would not be enough.

Kubernetes tools do not all use the same flags or environment variables, but they do understand kubeconfig.

By creating a temporary kubeconfig and exposing it through `KUBECONFIG`, the isolated scope works naturally with tools such as:

- `kubectl`
- Helm
- Flux
- Kustomize workflows that invoke Kubernetes clients
- Go applications using `client-go`
- other tools that respect kubeconfig

This makes the shell useful beyond a single `kubectl` command.

---

## Installation

### Homebrew

```bash
brew tap pierinho13/tools
brew install --cask kubectl-peek
```

Upgrade an existing installation:

```bash
brew update
brew upgrade --cask kubectl-peek
```

Verify the installed version:

```bash
kubectl-peek --version
```

---

### GitHub Releases

Precompiled binaries are available for macOS, Linux, and Windows through GitHub Releases.

---

### Build from source

```bash
git clone https://github.com/pierinho13/kubectl-peek.git
cd kubectl-peek
go build -o kubectl-peek .
```

---

## Example workflows

### Select everything interactively

```bash
kubectl-peek shell
```

### Select only the namespace

```bash
kubectl-peek shell --context production
```

### Open directly

```bash
kubectl-peek shell --context production -n payments
```

### Keep the current context and select a temporary namespace

```bash
kubectl-peek namespace --shell
```

### Persist a namespace in the current context

```bash
kubectl-peek namespace
```

### Inspect Secret relationships

```bash
kubectl-peek secret
```

---

## Final thoughts

The goal of `kubectl-peek` is not to replace `kubectl`.

It is to remove friction from a few Kubernetes workflows that platform engineers, SREs, and developers repeat constantly.

Secret inspection helps answer:

> What is this Secret connected to?

The new shell workflow helps answer:

> How can I work safely in this context and namespace without changing my real environment?

That makes `kubectl-peek` useful not only when investigating Secrets, but also during deployments, incident response, cluster comparisons, namespace troubleshooting, and everyday multi-cluster work.

The project is open source:

**https://github.com/pierinho13/kubectl-peek**

Contributions, feedback, and ideas are welcome.

If you're interested in this kind of platform engineering work, you can learn more about my experience or [get in touch](/en/contact).