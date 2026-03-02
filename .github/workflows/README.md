# GitHub Actions Workflows

## Workflows disponibles

### 1. `deploy-filament.yml` ✅ ACTIF
**Déploiement automatique du backend Filament**

- **Déclenchement** : Push sur `main` avec changements dans `filament/**`
- **Actions** :
  1. Build de l'image Docker depuis `filament/Dockerfile`
  2. Push vers GHCR : `ghcr.io/declared-as-ala/sobitas-backend-v2:latest`
  3. Déploiement sur le VPS via SSH
  4. Redémarrage du container `sobitas-backend-v2`

### 2. `frontend-deploy.yml` ⚠️ DÉSACTIVÉ (manuel uniquement)
**Déploiement du frontend Next.js**

- **Déclenchement** : **UNIQUEMENT manuel** via `workflow_dispatch`
- **Actions** : Build et déploiement du frontend (désactivé automatiquement)

### 3. `backend-assets-deploy.yml` ✅ ACTIF
**Compilation des assets du backend legacy**

- **Déclenchement** : Push sur `main` avec changements dans `backend/resources/**`
- **Actions** : Compilation des assets CSS/JS sur le VPS

## Configuration requise

Voir [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md) pour les instructions complètes.

### Secrets GitHub Actions (obligatoires)

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Adresse IP ou hostname du VPS |
| `VPS_USER` | Utilisateur SSH (ex: `root`) |
| `VPS_SSH_KEY` | Clé privée SSH complète |

### Secrets GitHub Actions (optionnels)

| Secret | Description | Défaut |
|--------|-------------|--------|
| `VPS_PORT` | Port SSH | `22` |
| `VPS_APP_DIR` | Chemin du projet sur VPS | `/root/sobitas-project` |
| `GHCR_PAT` | Personal Access Token GitHub | Utilise `GITHUB_TOKEN` |

## Fichiers modifiés/créés

- ✅ `.github/workflows/deploy-filament.yml` (nouveau)
- ✅ `.github/workflows/frontend-deploy.yml` (modifié - trigger désactivé)
- ✅ `.github/workflows/DEPLOYMENT_SETUP.md` (documentation)
- ✅ `.github/workflows/docker-compose.vps.example.yml` (exemple de config)

## Prochaines étapes

1. **Ajouter les secrets** dans GitHub (Settings → Secrets → Actions)
2. **Modifier le docker-compose.yml sur le VPS** pour utiliser l'image GHCR (voir `docker-compose.vps.example.yml`)
3. **Tester le déploiement** en faisant un push dans `filament/`
