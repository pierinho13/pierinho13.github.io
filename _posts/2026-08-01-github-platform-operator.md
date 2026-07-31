---
layout: post
title: "Your GitHub organization is infrastructure too"
date: 2026-07-31
lang: en
image: /assets/img/github-platform-operator.png
excerpt: "GitHub configuration is platform state. I built github-platform-operator to manage repositories, rulesets, organization members, teams, access, environments, secrets, and variables through Kubernetes and GitOps, with continuous reconciliation and safe adoption."
---

Creating a GitHub repository is easy.

Keeping hundreds of repositories, teams, permissions, rulesets, environments, secrets, and variables consistent over time is not.

The initial setup is rarely the real problem.

The problem starts later:

- one repository allows merge commits while another only allows squash merges
- vulnerability alerts are enabled in some repositories but not others
- a team has access to repositories it no longer owns
- a user is added manually and never removed
- a ruleset is changed directly in the GitHub UI
- a new repository is missing the organization defaults
- nobody knows whether the UI, a script, Terraform, or an old runbook represents the intended configuration

At that point, GitHub is no longer just a place where source code is stored.

It is part of the engineering platform.

That is the problem I wanted to address with **github-platform-operator**.

`github-platform-operator` is an open-source Kubernetes operator for declaratively creating, adopting, and continuously reconciling common GitHub platform resources.

It manages:

```text
repositories
repository rulesets
organization members
teams
team memberships
repository access
environments
Actions secrets
Actions variables
```

The desired configuration lives in Kubernetes resources and can be delivered through the same GitOps workflow used for the rest of the platform.

> **GitHub configuration is platform state, and platform state should be declarative, reviewable, adoptable, and continuously reconciled.**

---

## GitHub configuration drifts too

Infrastructure drift is usually discussed in the context of cloud resources, Kubernetes workloads, networking, or IAM.

But GitHub configuration drifts in exactly the same way.

A repository may start with the desired settings:

```text
visibility: private
delete branches after merge: enabled
vulnerability alerts: enabled
squash merge: enabled
required approvals: 1
code owner review: required
```

Then someone changes one setting directly in the UI.

The repository still exists. Applications continue building. Nothing immediately fails.

But the platform is no longer in the expected state.

The change may remain unnoticed until:

- a pull request is merged using an unsupported strategy
- a required review is bypassed
- an old user retains access
- a security control is found disabled
- a new repository behaves differently from every other repository

This is not fundamentally different from someone manually editing a cloud firewall rule or changing a Kubernetes Deployment outside GitOps.

The state has drifted.

The difference is that GitHub is often treated as an administrative tool rather than as part of the platform control plane.

That distinction becomes difficult to justify when GitHub controls:

- who can access source code
- how code reaches production
- which reviews are required
- which environments can deploy
- which secrets are available to automation
- which teams own each repository
- how repositories are created and retired

For many engineering organizations, GitHub configuration is infrastructure.

---

## Why scripts stop scaling

A script is often the fastest way to automate the first repository.

For example:

```bash
gh api \
  --method PATCH \
  /repos/example-org/payments-api \
  -f delete_branch_on_merge=true \
  -f allow_squash_merge=true
```

Another script may configure team access:

```bash
gh api \
  --method PUT \
  /orgs/example-org/teams/platform/repos/example-org/payments-api \
  -f permission=maintain
```

Scripts are useful.

They are also the right tool for imports, migrations, one-off maintenance, and discovery.

The problem appears when scripts become the permanent control mechanism.

A script describes a sequence of actions:

```text
find repository
      ↓
create it if missing
      ↓
update settings
      ↓
configure teams
      ↓
create ruleset
      ↓
continue if every previous request succeeded
```

But a platform usually needs a description of the desired result:

```text
This repository should exist.
These settings should be configured.
This team should have this permission.
This ruleset should remain active.
```

Those are different models.

A script must decide:

- what already exists
- which operations already succeeded
- how to resume after partial failure
- how to detect later manual changes
- how to handle dependencies
- how to report observed state
- when to retry
- how to stop retrying during an API rate limit
- what should happen when configuration is deleted

Eventually, the script starts implementing a reconciliation loop.

At that point, it is becoming a controller without the Kubernetes API, status model, watches, finalizers, events, and lifecycle semantics that controllers already provide.

> **A script describes actions. A Kubernetes resource describes desired state.**

---

## A short introduction to Kubernetes operators

A Kubernetes operator extends the Kubernetes API with new resource types and controllers.

The resource describes the desired state:

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

A controller watches that resource and reconciles it with the external system.

In this case:

```text
GitHubRepository
       ↓
Kubernetes controller
       ↓
GitHub REST API
       ↓
Observed GitHub repository
       ↓
Kubernetes status
```

The controller repeatedly compares desired and observed state.

If the repository does not exist, it can create it.

If it already exists, it can adopt it.

If a managed setting changes remotely, the controller can restore the declared value.

If GitHub is temporarily unavailable, the controller can requeue the operation.

If the API rate limit is exhausted, the controller can wait until the reset instead of producing an uncontrolled retry loop.

The important part is not that Kubernetes can call an external API.

The important part is that the lifecycle becomes declarative.

```text
Desired state
      ↓
Reconcile
      ↓
Observe
      ↓
Correct drift
      ↓
Report status
      ↺
```

---

## The idea behind github-platform-operator

The goal of `github-platform-operator` is not to expose every GitHub REST API endpoint as a custom resource.

It intentionally focuses on recurring platform workflows:

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

This allows a platform team to describe a repository and its common dependencies using Kubernetes manifests.

For example:

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

The manifest can be reviewed like any other platform change:

```text
developer opens pull request
            ↓
platform review
            ↓
merge
            ↓
Argo CD applies the resource
            ↓
operator reconciles GitHub
```

The Git repository becomes the source of desired state.

Kubernetes provides the API and lifecycle.

The operator translates that desired state into GitHub operations.

---

## The real use case is not an empty organization

Creating a new repository is straightforward.

Adopting an existing organization is more difficult.

Real platform migrations rarely begin with:

```text
0 repositories
0 teams
0 users
0 existing conventions
```

They begin with years of accumulated state:

- repositories created by different people
- teams with existing members
- direct collaborators
- inconsistent merge settings
- existing rulesets
- environments and Actions configuration
- manually maintained ownership
- partial automation from previous projects

A useful operator must support brownfield adoption.

`github-platform-operator` therefore does not assume that every remote resource should be created from scratch.

If a repository already exists with the declared name, the controller can adopt it.

If a team already exists, it can be adopted and reconciled.

The same principle applies to other supported resources.

This is also why omitted fields matter.

For repository settings:

```text
field omitted        → observe but do not manage it
field configured     → continuously reconcile it
empty string         → explicitly clear it
empty list           → explicitly remove all managed entries
```

This avoids a common migration problem: adopting a resource should not require the operator to take ownership of every remote setting immediately.

A team can begin with only a few controlled fields and expand that ownership gradually.

> **Real platforms rarely start from an empty organization. Adoption is not an edge case; it is the migration path.**

---

## Importing existing teams into GitOps

Adoption becomes more useful when the current remote state can be converted into manifests.

For that reason, I also created an importer workflow that:

```text
lists existing organization teams
      ↓
reads their direct memberships
      ↓
preserves member and maintainer roles
      ↓
generates GitHubTeam manifests
      ↓
generates GitHubTeamMembership manifests
      ↓
builds the Kustomize structure
```

A generated team can look like:

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

Its current direct members become individual resources:

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

The importer does not need to recreate the teams remotely.

It generates the desired state required for the operator to adopt them.

Importing is a migration operation.

Reconciliation is an ongoing control-plane responsibility.

---

## Human-readable APIs matter

External APIs frequently expose internal identifiers.

GitHub ruleset bypass actors are a good example.

A ruleset may need a numeric actor ID for a team or user, but numeric IDs are inconvenient in GitOps:

```yaml
bypassActors:
  - actorType: Team
    actorID: 1234567
```

That value is difficult to understand during review and difficult to maintain.

The operator API supports human-readable identifiers:

```yaml
bypassActors:
  - actorType: Team
    teamSlug: platform
    bypassMode: always
  - actorType: User
    username: release-admin
    bypassMode: pull_request
```

During reconciliation, the controller resolves the team slug or username to the numeric identifier GitHub requires.

This keeps remote implementation details out of the desired-state API.

> **A declarative API should expose stable, human-readable identifiers whenever possible instead of leaking remote implementation details.**

These decisions determine whether an API remains understandable after hundreds of manifests and years of changes.

---

## Repository rulesets as platform policy

A repository is not ready only because it exists.

It also needs working conventions.

A ruleset for the default branch can be represented as:

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

This makes repository policy:

- reviewable in a pull request
- reproducible across repositories
- visible in the same platform repository
- continuously reconciled
- independent of manual UI configuration

It also allows policies to be generated consistently for repository families such as:

```text
gitops-*
infra-terraform-*
```

---

## Safe by default

Declarative automation can be dangerous when deletion semantics are implicit.

Deleting a Kubernetes object should not unexpectedly destroy a production repository.

`github-platform-operator` uses explicit deletion policies:

```text
Orphan
Archive
Delete
Revoke
```

For a repository:

```yaml
deletionPolicy: Orphan
```

means that deleting the Kubernetes resource keeps the GitHub repository.

```yaml
deletionPolicy: Archive
```

archives it.

```yaml
deletionPolicy: Delete
```

permanently deletes it.

For access resources, `Revoke` explicitly removes the remote membership or permission.

The safe default is `Orphan`.

The operator also uses finalizers where remote cleanup must complete before Kubernetes removes the resource.

Dependencies are considered as well.

For example, a team should not be deleted while managed memberships still reference it.

An environment configured for deletion should remain protected while managed Actions resources depend on it.

These behaviors are not implementation details.

They are part of the API contract.

> **Declarative infrastructure should not mean accidentally destructive infrastructure.**

---

## Suspending an entire provider

External reconciliation sometimes needs to stop.

Reasons include:

- credential rotation
- GitHub maintenance
- an incident involving API usage
- an unexpected rate-limit consumer
- a planned migration
- investigation of remote drift
- temporary administrative work in the GitHub UI

The provider can be suspended declaratively:

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

While suspended:

```text
controllers stop remote reconciliation
credentials are not read
GitHub API calls stop
managed resources report ReconciliationSuspended
Kubernetes resources remain present
```

This provides a control-plane circuit breaker without scaling the controller to zero or deleting managed resources.

Because the suspension flag belongs to the provider resource, it can also be managed through GitOps.

---

## Rate limits are a controller design concern

GitHub is an external API with primary and secondary rate limits.

A controller that ignores those limits can turn a temporary failure into a continuous error storm.

The problem is larger when many reconcilers share the same credentials.

Repositories, teams, memberships, rulesets, environments, secrets, and variables may all consume the same API budget.

The operator therefore uses a shared reactive rate-limit gate.

When GitHub reports a rate limit, the operator can:

```text
read Retry-After
or read the reset timestamp
      ↓
pause remote requests through the shared gate
      ↓
requeue affected resources
      ↓
resume after the limit allows it
```

This is different from simply adding a delay to one controller.

The API budget belongs to the credential or installation, so coordination must happen across reconcilers using that identity.

Handling this correctly is part of operating an external control plane, not an optional optimization.

---

## Secrets without plaintext custom resources

GitHub Actions secrets are represented declaratively, but the plaintext value does not belong in the custom resource.

Instead, the resource references a Kubernetes Secret:

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

The controller:

```text
reads the referenced Kubernetes Secret
      ↓
retrieves GitHub's public key
      ↓
encrypts the value
      ↓
sends the encrypted payload
      ↓
stores no plaintext in status
```

Changes to the Kubernetes Secret trigger reconciliation and rotate the remote value.

The goal is not only to automate the API call.

The goal is to provide an API that encourages safer usage.

---

## Why not Terraform?

Terraform has a mature GitHub provider and is a strong option for managing GitHub resources.

It is particularly suitable when:

- GitHub configuration already belongs to an existing Terraform estate
- teams prefer plan-driven changes
- infrastructure provisioning is centralized in Terraform
- periodic reconciliation is acceptable
- Kubernetes is not the platform control plane

`github-platform-operator` is designed for a different operating model.

It fits environments where:

- Kubernetes already provides the control-plane API
- Argo CD or Flux already delivers desired state
- platform resources should expose Kubernetes status
- controllers should continuously correct drift
- GitHub resources need to compose with Kubernetes references
- suspension and finalizer behavior should be represented in the API

The distinction is not that one tool can create a repository and the other cannot.

The distinction is the lifecycle model.

```text
Terraform:
configuration → plan → apply

Operator:
desired state → observe → reconcile → repeat
```

Neither model is universally better.

They optimize for different platform architectures.

---

## Why not Crossplane?

Crossplane can also manage external services through Kubernetes, including GitHub through a provider.

For organizations already using Crossplane as their platform control plane, that can be the natural choice.

Crossplane provides capabilities far beyond GitHub:

- managed resources
- compositions
- custom platform APIs
- functions
- package management
- provider dependencies
- provider revisions
- a broad ecosystem of external-service integrations

That power also introduces a different operational model.

A GitHub setup based on Crossplane typically involves:

```text
Crossplane core
      +
package management
      +
GitHub provider package
      +
provider runtime
      +
provider revisions and upgrades
```

That is appropriate when Crossplane is already a strategic part of the platform.

But I wanted a narrower option.

`github-platform-operator` is a standalone controller focused on recurring GitHub platform tasks.

It deliberately trades:

```text
broad provider coverage
compositions
general control-plane extensibility
```

for:

```text
one focused operator
a curated API
fewer platform components
GitHub-specific adoption semantics
explicit deletion behavior
shared rate-limit handling
```

This does not make either approach universally better.

It makes them suitable for different environments.

| Approach | Best fit |
|---|---|
| Scripts | Imports, migrations, and one-off automation |
| Terraform GitHub provider | Plan-driven GitHub provisioning in a Terraform estate |
| Crossplane GitHub provider | Organizations already building a broader Crossplane control plane |
| `github-platform-operator` | Focused Kubernetes-native management of recurring GitHub platform workflows |

The project exists because a focused operator can be easier to introduce when GitHub is the main external platform that needs this model.

> **Crossplane optimizes for building extensible control planes. github-platform-operator optimizes for a focused set of recurring GitHub platform workflows.**

---

## A deliberately smaller API

A provider generated from a broad external API can expose a large number of resources and fields.

That breadth is valuable.

It can also make the user-facing API closely resemble the remote provider schema.

`github-platform-operator` takes a curated approach.

The project intentionally does not attempt to manage every GitHub feature.

Current non-goals include:

```text
GitHub Actions runners
webhooks
arbitrary repository files
Dependabot secrets
organization policies
billing
enterprise administration
the complete GitHub API
```

The smaller scope makes it possible to spend more design effort on the supported workflows:

- safe adoption
- unmanaged optional fields
- human-readable references
- explicit destructive behavior
- dependency protection
- status conditions
- suspension
- rate-limit coordination
- importer workflows

A smaller API is not automatically better.

But a focused API can provide clearer semantics for its intended use case.

---

## Architecture

At a high level, the project follows this flow:

```text
Git repository
      ↓
Argo CD or Flux
      ↓
Kubernetes API
      ↓
github-platform-operator
      ↓
GitHub REST API
```

Internally:

```text
GitHubProviderConfig
      ↓
credential resolution
      ↓
shared GitHub client and rate-limit gate
      ↓
resource-specific reconcilers
      ↓
status conditions and requeues
```

The operator is built with:

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

The controller image is published as a multi-platform image.

The Helm chart is published as an OCI artifact.

CRDs are packaged with the chart.

The release workflow publishes the GitHub release, binaries, container image, and Helm chart together.

---

## Status is part of the API

A controller should not only perform remote operations.

It should explain what it observed.

Resources expose Kubernetes conditions with reasons such as:

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

This allows users and automation to answer:

- Was the resource created?
- Was an existing resource adopted?
- Is an invitation still pending?
- Is a referenced dependency unavailable?
- Is the provider suspended?
- Did GitHub reject the operation?
- Has the latest desired generation been observed?

The status model is part of the product experience.

A remote API error hidden only in controller logs is not enough.

---

## Testing more than the happy path

A GitHub client unit test is useful, but it is not sufficient for a controller.

The project includes several layers of validation:

```text
Go unit tests
GitHub request contract tests
controller reconciliation tests
envtest
generated CRD verification
RBAC generation
Helm linting and rendering
end-to-end tests
```

Contract tests assert the serialized JSON sent to GitHub.

Controller tests cover reconciliation behavior and status transitions.

Helm validation matters because generated Kubebuilder RBAC and chart RBAC are separate delivery paths.

A controller may work with `make run` and still fail when installed through Helm if the chart does not include the permissions introduced by a new reconciler.

That kind of issue reinforced an important lesson:

> A feature is not complete when the controller compiles. It is complete when its API, reconciliation, RBAC, packaging, documentation, and upgrade path work together.

---

## What I learned

Building the operator involved more than mapping REST endpoints to Go methods.

Some of the most important lessons were about API and lifecycle design.

### Designing the API is harder than calling the API

The remote request may be simple.

The difficult questions are:

```text
What does omission mean?
Can the resource be adopted?
Which fields are creation-only?
How is drift detected?
What happens during deletion?
How are dependencies protected?
Which identifiers should users declare?
What status explains the current state?
```

### Adoption semantics must be intentional

Existing resources are the normal migration case.

The operator must distinguish between:

```text
observed fields
managed fields
explicitly cleared fields
creation-only fields
```

### Destructive behavior should be explicit

`Orphan` is the default because Kubernetes deletion should not silently imply remote destruction.

### Status is part of usability

A controller that performs the correct API request but does not explain its state is difficult to operate.

### Rate limits belong in the architecture

When many controllers share credentials, API budgets must be coordinated across reconcilers.

### Packaging is part of the feature

CRDs, RBAC, Helm templates, image versions, release automation, and documentation must remain aligned.

### Focus is a product decision

The project could expose more GitHub resources.

That does not mean it should.

The useful boundary is the set of common platform workflows that can be represented with clear and safe semantics.

---

## When this approach makes sense

`github-platform-operator` is a good fit when:

- Kubernetes already acts as a platform control plane
- Argo CD or Flux already manages desired state
- GitHub configuration should follow pull-request review
- repository and organization state needs continuous reconciliation
- existing resources must be adopted safely
- teams want a focused operator instead of a broader control-plane framework
- platform engineers want Kubernetes status, references, and finalizers

It may not be the right choice when:

- GitHub configuration already works well in Terraform
- the organization already standardizes on Crossplane
- no Kubernetes control plane exists
- only a small one-off migration is required
- the required GitHub feature is intentionally outside the project scope

A useful platform tool should make its boundaries clear.

---

## Final thoughts

The main goal of `github-platform-operator` is not simply to create repositories.

The goal is to make common GitHub platform configuration:

```text
declarative
reviewable
adoptable
safe
observable
continuously reconciled
```

GitHub repositories, teams, permissions, rulesets, environments, secrets, and variables influence how software is built and delivered.

They are part of the platform.

Once that state becomes declarative, the question changes.

Instead of asking:

> Who changed this setting in GitHub?

You can ask:

> What state should the platform enforce?

The project is open source:

**https://github.com/pierinho13/github-platform-operator**

The complete API, installation guide, operational behavior, deletion policies, and examples are documented in the repository.

Contributions, feedback, API design discussions, controller improvements, tests, and additional focused GitHub platform workflows are very welcome.

If you're working on Kubernetes platforms, GitOps control planes, developer platforms, or cloud-native infrastructure, you can learn more about my experience or [get in touch](/en/contact).
