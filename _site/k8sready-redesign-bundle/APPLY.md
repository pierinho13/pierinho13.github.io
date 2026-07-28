# K8sReady redesign

## Recommended: apply the patch

From the root of `pierinho13.github.io`:

```bash
git switch -c redesign/k8sready-portfolio
git apply --check k8sready-redesign.patch
git apply k8sready-redesign.patch
bundle exec jekyll serve
```

Then open `http://localhost:4000/en/` or `http://localhost:4000/es/`.

## Alternative: copy the files

Copy the files in this ZIP over the same paths in the repository.

The redesign modifies source files only. Do not commit generated `_site/` content.
