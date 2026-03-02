# Configuration email (Gmail SMTP)

## Erreur « 535 Username and Password not accepted »

Deux points à corriger :

### 1. Utiliser le mailer SMTP (pas sendmail)

Dans votre `.env`, vous avez des variables SMTP (Gmail) mais `MAIL_MAILER=sendmail`. Avec `sendmail`, Laravel n’utilise pas `MAIL_HOST`, `MAIL_USERNAME`, etc.

**À faire :** mettre :

```env
MAIL_MAILER=smtp
```

au lieu de `sendmail`, pour que les paramètres Gmail soient bien utilisés.

### 2. Mot de passe Gmail : utiliser un « App Password »

Gmail n’accepte en général plus le mot de passe du compte pour SMTP. Il faut utiliser un **mot de passe d’application** :

1. Aller sur [Google Account → Sécurité](https://myaccount.google.com/security)
2. Activer la **validation en deux étapes** si ce n’est pas déjà fait
3. Aller dans **Mots de passe des applications** (ou « App passwords »)
4. Créer un mot de passe d’application pour « Mail » (ou « Autre »)
5. Copier le mot de passe (16 caractères, souvent avec des espaces)
6. Dans `.env`, mettre ce mot de passe dans `MAIL_PASSWORD` (avec ou sans espaces, les deux fonctionnent)

### Exemple `.env` pour Gmail

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=nachdit.customers@gmail.com
MAIL_PASSWORD="votre_app_password_16_caracteres"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=nachdit.customers@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

Puis vider le cache de config :

```bash
php artisan config:clear
php artisan cache:clear
```

Ensuite, utiliser « Envoyer un test maintenant » sur la page Envoyer Email pour vérifier.
