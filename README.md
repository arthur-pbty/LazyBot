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
git clone <URL_DU_REPO>
cd mon-bot-discord
````

3. Créer un fichier `.env` :

```env
TOKEN=VOTRE_TOKEN_BOT
CLIENT_ID=VOTRE_CLIENT_ID
CLIENT_SECRET=VOTRE_CLIENT_SECRET
REDIRECT_URI=http://localhost:3000/auth/discord/callback
SESSION_SECRET=un_secret_aleatoire
PORT=3000
DB_PATH=database.sqlite
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