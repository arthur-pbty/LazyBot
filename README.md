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
- PostgreSQL
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
NODE_ENV=production
PORT=3000
BOT_TOKEN=VOTRE_TOKEN_BOT
SESSION_SECRET=UN_SECRET_LONG_ET_UNIQUE
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=lazybot
POSTGRES_USER=lazybot
POSTGRES_PASSWORD=change_me
POSTGRES_DATA_PATH=./data/postgres
DATABASE_URL=postgresql://lazybot:change_me@db:5432/lazybot
OWNER=VOTRE_ID_UTILISATEUR
URL=https://lazybot.arthurp.fr
```

Variables d'environnement prises en charge:

- CLIENT_ID
- CLIENT_SECRET
- REDIRECT_URI
- NODE_ENV
- PORT
- BOT_TOKEN
- SESSION_SECRET
- POSTGRES_HOST
- POSTGRES_PORT
- POSTGRES_DB
- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DATA_PATH
- DATABASE_URL
- OWNER
- URL

4. Lancer

```bash
docker compose up -d --build
```

Le dashboard est ensuite disponible sur `http://localhost:3000`.

## Exemples de profils

Exemple developpement (.env):

```env
NODE_ENV=development
PORT=3002
POSTGRES_DATA_PATH=./data/postgres/dev
URL=http://localhost:3002
```

Exemple production (.env):

```env
NODE_ENV=production
PORT=3000
POSTGRES_DATA_PATH=./data/postgres
URL=https://lazybot.arthurp.fr
```

## Securite avant publication

- Ne jamais versionner `.env`
- Verifier que `.vscode/` reste ignore (ex: `sftp.json`)
- Eviter de publier des tokens, secrets ou cles privees

## Licence

Projet prive par defaut. Ajouter une licence explicite si publication open source.