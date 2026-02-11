# Filament Backend Deployment Setup

## Vue d'ensemble

Ce workflow déploie automatiquement le dossier `filament/` vers GHCR (GitHub Container Registry) et le VPS lorsque des changements sont détectés dans `filament/**`.

## Configuration requise sur le VPS

### 1. Docker Compose pour le service backend-v2

Le service `sobitas-backend-v2` dans votre `docker-compose.yml` sur le VPS doit utiliser l'image GHCR au lieu d'un build local.

**Exemple de configuration dans `docker-compose.yml` sur le VPS :**

```yaml
services:
  sobitas-backend-v2:
    image: ghcr.io/declared-as-ala/sobitas-backend-v2:latest
    container_name: sobitas-backend-v2
    restart: unless-stopped
    env_file:
      - .env
    environment:
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      # ... autres variables d'environnement
    networks:
      - sobitas-net
    expose:
      - "9000"
    depends_on:
      - mysql
      - redis
    healthcheck:
      test: ["CMD-SHELL", "php-fpm-healthcheck || php -v >/dev/null 2>&1 || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
    volumes:
      # Optionnel: volumes pour persistence si nécessaire
      - backend-storage:/var/www/html/storage
      # Note: Le code est maintenant dans l'image, pas besoin de bind mount

  sobitas-laravel-nginx-v2:
    image: nginx:stable
    container_name: sobitas-laravel-nginx-v2
    restart: unless-stopped
    ports:
      - "8083:80"  # Port externe 8083 -> port interne 80
    volumes:
      - ./nginx/laravel.conf:/etc/nginx/conf.d/default.conf:ro
      # Optionnel: partager le storage avec backend
      - backend-storage:/var/www/html/storage:ro
    networks:
      - sobitas-net
    depends_on:
      - sobitas-backend-v2
```

**Important :**
- Le service doit s'appeler exactement `sobitas-backend-v2` (nom du service dans docker-compose)
- Le port externe reste `8083:80` pour nginx (pas de changement)
- Le backend expose toujours `9000` en interne (pas de changement)

### 2. Authentification GHCR sur le VPS

Le workflow utilise `GHCR_PAT` (Personal Access Token) pour se connecter à GHCR. Si ce secret n'est pas fourni, le workflow essaiera d'utiliser `GITHUB_TOKEN`.

**Option 1 : Utiliser GHCR_PAT (recommandé)**
- Créez un Personal Access Token GitHub avec le scope `read:packages`
- Ajoutez-le comme secret `GHCR_PAT` dans GitHub Actions

**Option 2 : Utiliser GITHUB_TOKEN (automatique)**
- GitHub fournit automatiquement `GITHUB_TOKEN`
- Mais il peut avoir des limitations de rate limit

## Secrets GitHub Actions

Ajoutez ces secrets dans **Settings → Secrets and variables → Actions** de votre repository :

### Secrets obligatoires

| Nom du secret | Description | Exemple |
|---------------|-------------|---------|
| `VPS_HOST` | Adresse IP ou hostname du VPS | `123.45.67.89` ou `vps.example.com` |
| `VPS_USER` | Nom d'utilisateur SSH | `root` ou `deploy` |
| `VPS_SSH_KEY` | Clé privée SSH pour se connecter au VPS | Contenu de `~/.ssh/id_rsa` ou `id_ed25519` |

### Secrets optionnels

| Nom du secret | Description | Valeur par défaut |
|---------------|-------------|-------------------|
| `VPS_PORT` | Port SSH du VPS | `22` |
| `VPS_APP_DIR` | Chemin du projet sur le VPS | `/root/sobitas-project` |
| `GHCR_PAT` | Personal Access Token GitHub pour GHCR | Utilise `GITHUB_TOKEN` si non fourni |

### Comment obtenir VPS_SSH_KEY

1. **Si vous avez déjà une clé SSH :**
   ```bash
   cat ~/.ssh/id_rsa
   # ou
   cat ~/.ssh/id_ed25519
   ```
   Copiez tout le contenu (y compris `-----BEGIN OPENSSH PRIVATE KEY-----` et `-----END OPENSSH PRIVATE KEY-----`)

2. **Si vous n'avez pas de clé SSH :**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions@yourdomain.com"
   ```
   Puis copiez le contenu de `~/.ssh/id_ed25519` dans le secret `VPS_SSH_KEY`

3. **Ajouter la clé publique sur le VPS :**
   ```bash
   # Sur votre machine locale
   cat ~/.ssh/id_ed25519.pub
   
   # Sur le VPS
   echo "VOTRE_CLE_PUBLIQUE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

## Workflow Frontend

Le workflow `frontend-deploy.yml` a été modifié pour **ne plus se déclencher automatiquement** sur les push dans `frontend/`. Il est maintenant disponible uniquement via **workflow_dispatch** (déclenchement manuel).

Pour déployer le frontend manuellement :
1. Allez dans **Actions** → **Frontend Build & Deploy**
2. Cliquez sur **Run workflow**
3. Sélectionnez la branche et cliquez sur **Run workflow**

## Test du déploiement

### Test manuel

1. Faites un changement dans `filament/` (ex: ajoutez un commentaire dans un fichier PHP)
2. Commit et push vers `main`
3. Allez dans **Actions** → **Deploy Filament Backend**
4. Vérifiez que le workflow se déclenche
5. Vérifiez les logs pour confirmer le déploiement

### Vérification sur le VPS

Après le déploiement, connectez-vous au VPS et vérifiez :

```bash
# Vérifier que le container est en cours d'exécution
docker ps | grep sobitas-backend-v2

# Vérifier les logs
docker logs --tail 50 sobitas-backend-v2

# Vérifier l'image utilisée
docker inspect sobitas-backend-v2 | grep Image

# Vérifier la version de l'image
docker images | grep sobitas-backend-v2
```

## Dépannage

### Le workflow ne se déclenche pas

- Vérifiez que vous avez push sur la branche `main` (ou `master`)
- Vérifiez que les fichiers modifiés sont dans `filament/**`
- Vérifiez les logs dans **Actions** → **Deploy Filament Backend**

### Erreur de connexion SSH

- Vérifiez que `VPS_HOST`, `VPS_USER`, et `VPS_SSH_KEY` sont correctement configurés
- Testez la connexion manuellement : `ssh -i ~/.ssh/id_rsa user@host`
- Vérifiez que la clé publique est dans `~/.ssh/authorized_keys` sur le VPS

### Erreur de pull d'image

- Vérifiez que `GHCR_PAT` ou `GITHUB_TOKEN` a les permissions nécessaires
- Vérifiez que l'image a bien été pushée sur GHCR : `ghcr.io/declared-as-ala/sobitas-backend-v2:latest`

### Le container ne démarre pas

- Vérifiez les logs : `docker logs sobitas-backend-v2`
- Vérifiez la configuration docker-compose : `docker compose config`
- Vérifiez que les dépendances (mysql, redis) sont en cours d'exécution

## Notes importantes

- **Ports** : Les ports externes ne changent pas (8083 pour nginx, 9000 interne pour PHP-FPM)
- **Volumes** : Si vous avez besoin de persister des données (storage, cache), utilisez des named volumes
- **Environnement** : Les variables d'environnement doivent être définies dans `.env` sur le VPS
- **Réseau** : Le backend et nginx doivent être sur le même réseau Docker (`sobitas-net`)
