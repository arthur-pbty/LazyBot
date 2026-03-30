# LazyBot

LazyBot est un bot Discord multi-serveurs avec dashboard web pour configurer facilement votre serveur.

Site officiel: https://lazybot.arthurp.fr

## Fonctionnalités

- Commandes générales, économie, niveaux, modération et administration
- Gestion d'autoroles (nouveaux membres et vocal)
- Messages de bienvenue et d'au revoir personnalisables
- Configuration anti-raid, logs, panels de roles, salons statistiques
- Dashboard web pour piloter les options serveur

## Stack

- Node.js
- Discord.js
- SQLite
- Docker et Docker Compose

## Installation

1. Cloner le projet

```bash
git clone https://github.com/arthur-pbty/LazyBot.git
cd lazybot
```

2. Creer votre fichier d'environnement

```bash
cp .env.example .env
```

3. Renseigner les variables dans `.env`

```env
CLIENT_ID=VOTRE_BOT_CLIENT_ID
CLIENT_SECRET=VOTRE_BOT_CLIENT_SECRET
REDIRECT_URI=https://lazybot.arthurp.fr/auth/discord/callback
PORT=3000
BOT_TOKEN=VOTRE_TOKEN_BOT
SESSION_SECRET=UN_SECRET_LONG_ET_UNIQUE
DB_PATH=database.sqlite
OWNER=VOTRE_ID_UTILISATEUR
URL=https://lazybot.arthurp.fr
```

4. Lancer avec Docker

```bash
docker compose up -d --build
```

Le dashboard est ensuite disponible sur `http://localhost:3000`.

## Securite avant publication

- Ne jamais versionner `.env`
- Verifier que `.vscode/` reste ignore (ex: `sftp.json`)
- Eviter de publier des tokens, secrets ou cles privees

## Licence

Projet prive par defaut. Ajouter une licence explicite si publication open source.