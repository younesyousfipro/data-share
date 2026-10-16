# DataShare

Prototype d'une plateforme de transfert sécurisé de fichiers : un utilisateur inscrit
dépose un fichier et obtient un lien de téléchargement à partager, valable 7 jours au plus.

| Dossier | Contenu |
|---|---|
| [`back/`](back/) | API REST Spring Boot, base PostgreSQL |
| [`front/`](front/) | application Angular |
| [`docs/`](docs/) | documentation technique : architecture, modèle de données, contrat d'API, décisions |

| Suivi qualité | Contenu |
|---|---|
| [`TESTING.md`](TESTING.md) | stratégie de test, scénarios E2E, couverture |
| [`SECURITY.md`](SECURITY.md) | règles de sécurité, scan des dépendances |
| [`MAINTENANCE.md`](MAINTENANCE.md) | mise à jour des dépendances : procédure, fréquence, risques |

## Prérequis

| Outil | Version | Rôle |
|---|---|---|
| Java (JDK) | 25 | compile et exécute le back |
| Docker | Docker Desktop lancé | fait tourner PostgreSQL, en dev comme dans les tests |
| Node.js | 24 | compile et sert le front (npm est fourni avec) |

Maven n'est pas à installer : le projet fournit `./mvnw`, qui télécharge la bonne
version au premier lancement.

## Back

### Installation (une seule fois)

```bash
cd back
cp .env.example .env
```

`.env` contient les identifiants de la base de dev et la clé de signature des JWT ;
il n'est pas versionné. Le mot de passe de la base peut être changé **avant** le premier
lancement : il est lu uniquement à la création de la base. Pour le changer ensuite,
supprimer la base avec `docker compose down -v` (toutes les données sont perdues).

**Clé JWT** (`JWT_SECRET`, 32 caractères minimum) : sans elle, l'API refuse de démarrer.
Pour en générer une, ou pour l'ajouter à un `.env` créé avant l'US04 (depuis `back/`) :

```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

**Fichiers déposés** : rangés dans `back/uploads/` (non versionné), chacun sous le nom de
son UUID. Autre dossier possible avec `STORAGE_DIRECTORY` dans `.env`.

### Lancement

```bash
./mvnw spring-boot:run
```

Au démarrage, Spring lance le conteneur PostgreSQL, puis Flyway crée les tables
(scripts dans `src/main/resources/db/migration`) et le dossier des fichiers déposés est
créé s'il manque. L'API écoute sur le port 8080.

Vérification : http://localhost:8080/actuator/health doit répondre `{"status":"UP"}`.

`Ctrl+C` arrête l'API et le conteneur ; les données sont conservées. Le code modifié
n'est pris en compte qu'au lancement suivant.

### Tests

```bash
./mvnw test
```

Les tests démarrent leur propre PostgreSQL, vide et jetable : ils ne touchent pas à la
base de dev. Rapports dans `target/surefire-reports/`.

### Accéder à la base (DBeaver, psql…)

| Paramètre | Valeur |
|---|---|
| Hôte | `localhost` |
| Port | `5432` |
| Base, utilisateur, mot de passe | ceux du fichier `back/.env` |

Le port 5432 doit être libre sur le poste.

## Front

### Installation (une seule fois)

```bash
cd front
npm ci
```

`npm ci` installe exactement les versions figées dans `package-lock.json`.

Angular CLI n'est pas à installer globalement : il est fourni par le projet. Pour une
commande hors scripts, passer par `npx ng …` (ex. `npx ng generate component …`).

### Lancement

```bash
npm start
```

L'application est servie sur http://localhost:4200 et se recharge à chaque sauvegarde.

**Le back doit tourner** pour que les écrans fonctionnent : les appels à l'API passent
par le proxy de dev (ci-dessous).

Parcours disponibles : création de compte (`/register`), connexion (`/login`), puis
upload d'un fichier sur l'accueil (`/`), réservé aux utilisateurs connectés : sans
jeton, l'accueil renvoie vers la connexion. Le lien obtenu (`/download/<id>`) ouvre la
page de téléchargement, **publique** : elle s'ouvre aussi sans être connecté.
« Mon espace » (`/my-files`) liste les fichiers du compte, et permet d'en supprimer un
après confirmation ; « Déconnexion » ramène à `/login`.

### Appels à l'API : le proxy de dev

```
navigateur ──► localhost:4200/api/... ──(proxy)──► localhost:8080/api/...
```

- Dans le code, les appels à l'API utilisent une **URL relative** : `/api/auth/login`,
  jamais `http://localhost:8080/...`. Un appel direct au port 8080 est bloqué par le
  navigateur (origine différente, CORS volontairement non configuré).
- Le proxy relaie tout ce qui commence par `/api` vers l'API (`proxy.conf.json`) ; il
  est chargé automatiquement par `npm start`.
- Il n'existe qu'en dev. En production, un reverse proxy joue le même rôle : front et
  API sous un même domaine. Le code ne change pas.

Pourquoi ce choix : [`docs/decisions.md`](docs/decisions.md) (2026-10-02).

### Tests

```bash
npm test                # mode surveillance : relance à chaque sauvegarde
npm run test:coverage   # passage unique + couverture, échoue sous 70 %
```

Tests unitaires exécutés par Vitest, dans un navigateur simulé (jsdom) : aucun
navigateur ne s'ouvre. Rapport de couverture : `coverage/index.html`.

```bash
npm run e2e        # tests E2E (Cypress), navigateur sans fenêtre
npm run e2e:open   # interface Cypress : on voit chaque test s'exécuter
```

Les tests E2E tournent sur la vraie application : **back et front doivent être
lancés**. Chaque test crée un compte `e2e-…@test.local` dans la base de dev ;
`docker compose down -v` (depuis `back/`) repart d'une base vide.

L'application Cypress est téléchargée au premier `npm ci` : son script d'installation
est autorisé dans `package.json` (`allowScripts`), npm bloquant les autres par défaut.

## Utiliser l'API sans le front

Avec le back lancé, l'API répond directement sur le port 8080 :

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "marie@mail.fr", "password": "s3cretPass"}'
```

| Code | Signification |
|---|---|
| `201` | compte créé, corps vide |
| `400` | email invalide ou mot de passe hors 8 à 18 caractères |
| `409` | email déjà utilisé, quelle que soit la casse |

Puis se connecter pour obtenir un JWT :

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "marie@mail.fr", "password": "s3cretPass"}'
```

| Code | Signification |
|---|---|
| `200` | `{"token": "eyJ..."}`, valable 1 heure |
| `400` | email invalide ou champ vide |
| `401` | email inconnu ou mot de passe faux (même message dans les deux cas) |

Déposer un fichier (US01), avec le jeton obtenu :

```bash
TOKEN=eyJ...   # valeur de "token" dans la réponse de /login
curl -i http://localhost:8080/api/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@README.md" \
  -F "password=s3cret" \
  -F "expirationDays=3"
```

`password` et `expirationDays` sont facultatifs (pas de mot de passe, 7 jours).

| Code | Signification |
|---|---|
| `201` | fiche du fichier : `id` (le lien de partage), dates, statut, protégé ou non |
| `400` | extension interdite, nom invalide, mot de passe hors 6 à 18 caractères, durée hors 1 à 7 jours, fichier absent |
| `401` | jeton absent, falsifié ou expiré (corps vide) |
| `413` | fichier de plus de 1 Go |

Télécharger un fichier (US02), sans jeton : `ID` est l'`id` renvoyé par l'upload.

```bash
ID=3f2b9c1e-...
curl -i http://localhost:8080/api/download/$ID          # métadonnées
curl -X POST http://localhost:8080/api/download/$ID \
  -H "Content-Type: application/json" \
  -d '{"password": "s3cret"}' \
  -o fichier-recu                                       # fichier
```

Sans mot de passe sur le fichier, le second appel se fait sans `-H` ni `-d`.

| Code | Signification |
|---|---|
| `200` | métadonnées (nom, taille, expiration, protégé ou non), ou le fichier |
| `400` | identifiant qui n'est pas un UUID, mot de passe de plus de 18 caractères |
| `403` | mot de passe absent ou faux |
| `404` | lien inconnu |
| `410` | fichier expiré |

Lister ses fichiers (US05), avec le jeton :

```bash
curl -i http://localhost:8080/api/files -H "Authorization: Bearer $TOKEN"
```

| Code | Signification |
|---|---|
| `200` | fiches du compte, expirées comprises, la plus récente d'abord (`[]` si aucune) |
| `401` | jeton absent, falsifié ou expiré (corps vide) |

Supprimer un de ses fichiers (US06), définitivement :

```bash
curl -i -X DELETE http://localhost:8080/api/files/$ID -H "Authorization: Bearer $TOKEN"
```

| Code | Signification |
|---|---|
| `204` | fiche et fichier effacés, corps vide |
| `400` | identifiant qui n'est pas un UUID |
| `401` | jeton absent, falsifié ou expiré (corps vide) |
| `404` | fichier inconnu, ou appartenant à un autre compte (même réponse) |

Les erreurs ont toutes le même format JSON (`timestamp`, `message`, `details`), sauf le
`401` des routes protégées, à corps vide.

Toutes les routes sont décrites dans
[`docs/conception/openapi.yaml`](docs/conception/openapi.yaml). Avec **Postman** :
*Import* de ce fichier, qui crée une requête prête à l'emploi par route.
