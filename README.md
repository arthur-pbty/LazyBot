# LazyBot - Discord Bot 

Bot Discord configurable via un dashboard web pour gérer :
- Rôles automatiques (`autorole-newuser` et `autorole-vocal`)
- Messages de bienvenue et d’au revoir
- Sélection de salons vocaux à exclure
- Multi-serveurs avec contrôle admin

---

## Installation

1. Cloner le projet :  
```bash
git clone https://github.com/arthur-pbty/LazyBot.git
cd mon-bot-discord
````

3. Créer un fichier `.env` :

```env
CLIENT_ID=VOTRE_BOT_CLIENT_ID
CLIENT_SECRET=VOTRE_BOT_CLIENT_SECRET
REDIRECT_URI=https://your_domaine.com/auth/discord/callback
PORT=3000
BOT_TOKEN=VOTRE_TOKEN_BOT
SESSION_SECRET=un_secret_aleatoire_pour_les_sessions
DB_PATH=database.sqlite
OWNER=VOTRE_ID_UTILISATEUR
```

4. Lancer le serveur :

```bash
docker compose up -d --build
```

* Serveur web : `http://localhost:3000`
* Le bot se connecte automatiquement aux serveurs où il est invité.

---

## Fonctionnalités clés

* Autoroles pour nouveaux membres et salons vocaux
* Messages de bienvenue et d’au revoir personnalisables
* Dashboard web pour configurer facilement chaque serveur
* Pré-sélection automatique options anciennement remplit