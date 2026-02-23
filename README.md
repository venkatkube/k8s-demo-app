<<<<<<< HEAD
# k8s-demo-app
k8s-demo-app
=======
## k8s-demo-app: Production-Style GitOps Project

This is a **production-style, end-to-end Kubernetes GitOps demo** using:

- **Git & GitHub**: version control and collaboration
- **GitHub Actions**: CI + release pipeline
- **Docker & GHCR**: container image build and registry
- **Kustomize**: environment-specific Kubernetes overlays (dev/staging/prod)
- **Argo CD**: GitOps-based deployment to Kubernetes

Designed for **Windows + WSL2**.

---

## 1. Project structure

At the root of the repo:

- **`app/`**: Node.js demo API
- **`k8s/base/`**: base deployment & service
- **`k8s/overlays/dev|staging|prod/`**: env-specific Kustomize overlays
- **`argocd/`**: Argo CD `Application` manifests
- **`.github/workflows/`**: CI + release pipelines

---

## 2. Prerequisites (Windows + WSL2)

Install these **inside WSL2** (Ubuntu):

- **Git**
- **Docker** (Docker Desktop with WSL2 integration OR Docker in WSL)
- **kubectl**
- **kind** (or `minikube` if you prefer)

Example (inside WSL):

```bash
sudo apt update
sudo apt install -y git curl

curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

Install `kubectl` from official docs: `https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/`.

---

## 3. Clone / create GitHub repo

1. Create a **new GitHub repository**, e.g. `k8s-demo-app`.
2. In WSL2, from your project root:

```bash
git remote add origin git@github.com:<your-github-username>/k8s-demo-app.git
git branch -M main
git add .
git commit -m "Initial production-style k8s demo"
git push -u origin main
```

Replace `<your-github-username>` accordingly.

Also **search and replace** in this repo:

- `your-github-username` → your actual GitHub username

Specifically:

- `k8s/base/deployment.yaml` image
- `k8s/overlays/*/kustomization.yaml` image
- `argocd/app-*.yaml` `repoURL`

---

## 4. Application: Node.js demo API

Path: `app/`

Run locally (optional, inside WSL):

```bash
cd app
npm install
npm start
```

Visit `http://localhost:3000` to see JSON response.

---

## 5. Container image build (local sanity check)

```bash
cd app
docker build -t k8s-demo-app:local .
docker run --rm -p 3000:3000 k8s-demo-app:local
```

---

## 6. Create two local kind clusters (dev & prod)

Create a **dev** and a **prod** cluster with kind:

```bash
# Dev cluster
kind create cluster --name k8s-dev --image kindest/node:v1.30.0

# Prod cluster
kind create cluster --name k8s-prod --image kindest/node:v1.30.0
```

Each cluster gets its own kube context:

- Dev context: `kind-k8s-dev`
- Prod context: `kind-k8s-prod`

Verify both:

```bash
kubectl config get-contexts

kubectl --context kind-k8s-dev get nodes
kubectl --context kind-k8s-prod get nodes
```

---

## 7. Install Argo CD (in each cluster)

You will run **one Argo CD per cluster**:

- Argo CD in **dev cluster** manages `dev` (and optionally `staging`)
- Argo CD in **prod cluster** manages `prod`

### 7.1 Argo CD in dev cluster

```bash
# Switch context to dev cluster
kubectl config use-context kind-k8s-dev

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for pods:

```bash
kubectl -n argocd get pods
```

Port-forward Argo CD API server for the **dev cluster**:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Access the UI at `https://localhost:8080` (accept self-signed cert).

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

### 7.2 Argo CD in prod cluster

Open a **second terminal** (or stop the above port-forward), then:

```bash
# Switch context to prod cluster
kubectl config use-context kind-k8s-prod

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for pods:

```bash
kubectl -n argocd get pods
```

Port-forward Argo CD API server for the **prod cluster** (different local port):

```bash
kubectl port-forward svc/argocd-server -n argocd 8081:443
```

Access the UI at `https://localhost:8081` (accept self-signed cert).

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

---

## 8. Configure GitHub Container Registry (GHCR)

This project uses **GHCR** for images.

In GitHub:

1. Go to **Settings → Actions → General** and ensure **“Read and write permissions”** for `GITHUB_TOKEN`.
2. Optionally enable **GHCR** visibility as desired.

The `release.yml` workflow:

- Logs in to `ghcr.io` using `GITHUB_TOKEN`
- Builds & pushes `ghcr.io/<owner>/k8s-demo-app:<tag>` and `:latest`
- Updates `k8s/overlays/prod/kustomization.yaml` with the new tag
- Commits & pushes back to `main`

No extra secrets are required beyond the default `GITHUB_TOKEN`.

---

## 9. GitHub Actions workflows

### 9.1 CI workflow

Path: `.github/workflows/ci.yml`

- Runs on `push` and `pull_request` to `main`
- Installs Node.js dependencies and runs `npm test`

### 9.2 Release workflow

Path: `.github/workflows/release.yml`

Triggered on **tag push**: `v*.*.*`, for example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Steps:

1. Build & push Docker image to GHCR with tag `1.0.0` and `latest`
2. Update `k8s/overlays/prod/kustomization.yaml` `newTag` to `1.0.0`
3. Commit the manifest change and push

Argo CD will then detect the change in Git and roll out the new version.

---

## 10. Argo CD applications (GitOps)

Path: `argocd/`

- `app-dev.yaml`: points to `k8s/overlays/dev`
- `app-prod.yaml`: points to `k8s/overlays/prod`

After pushing your repo to GitHub and fixing `repoURL`, apply them:

```bash
# In dev cluster Argo CD (manages dev app)
kubectl --context kind-k8s-dev apply -n argocd -f argocd/app-dev.yaml

# In prod cluster Argo CD (manages prod app)
kubectl --context kind-k8s-prod apply -n argocd -f argocd/app-prod.yaml
```

In Argo CD UI, you should see:

- `k8s-demo-app-dev`
- `k8s-demo-app-prod`

You can **sync** and watch Argo CD apply the manifests.

---

## 11. Deploy dev/staging/prod manually (optional)

You can also apply overlays directly with `kubectl` for testing:

```bash
# Dev cluster (dev + staging)
kubectl --context kind-k8s-dev apply -k k8s/overlays/dev
kubectl --context kind-k8s-dev apply -k k8s/overlays/staging

# Prod cluster (prod)
kubectl --context kind-k8s-prod apply -k k8s/overlays/prod
```

Test the service (for kind clusters, via port-forward):

```bash
# Dev cluster
kubectl --context kind-k8s-dev -n demo-dev get pods
kubectl --context kind-k8s-dev -n demo-dev port-forward svc/dev-k8s-demo-app 8082:80
```

Hit `http://localhost:8081`.

---

## 12. Typical end-to-end flow

1. **Develop**:
   - Edit code under `app/`
   - Commit & push to a feature branch
   - Open PR → CI runs via `ci.yml`
2. **Merge to `main`** after review.
3. **Cut a release**:
   - From `main`: `git tag v1.0.0 && git push origin v1.0.0`
   - `release.yml` builds image, pushes to GHCR, updates `k8s/overlays/prod`
4. **Argo CD syncs**:
   - Argo CD in the **prod cluster** sees the Git change and deploys to the `demo-prod` namespace there.
   - You can watch rollout in Argo CD UI.

---

## 13. Next steps / customizations

- Add **proper tests** in `app/` and extend CI.
- Tune **resource requests/limits** and replicas per environment.
- Add **Ingress** (or Gateway API) for real cluster exposure.
- Add **App of Apps** pattern in `argocd/` for multiple services.

This project should give you a **complete, GitOps-style, production-leaning example** that ties together Git, GitHub, Actions, Kubernetes, Kustomize, and Argo CD on your **Windows + WSL2** setup.

>>>>>>> dacf293 (Initial production-style k8s demo)
