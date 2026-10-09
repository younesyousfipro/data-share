# DataShare

Prototype d'une plateforme de transfert sécurisé de fichiers : un utilisateur inscrit
dépose un fichier et obtient un lien de téléchargement à partager, valable 7 jours au plus.

| Dossier | Contenu |
|---|---|
| [`back/`](back/) | API REST Spring Boot, base PostgreSQL |
| [`front/`](front/) | application Angular |
| [`docs/`](docs/) | documentation technique : architecture, modèle de données, contrat d'API, décisions |

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

### Lancement

```bash
./mvnw spring-boot:run
```

Au démarrage, Spring lance le conteneur PostgreSQL, puis Flyway crée les tables
(scripts dans `src/main/resources/db/migration`). L'API écoute sur le port 8080.

Vérification : http://localhost:8080/actuator/health doit répondre `{"status":"UP"}`.

`Ctrl+C` arrête l'API et le conteneur ; les données sont conservées.

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

Parcours disponibles : création de compte (`/register`) puis connexion (`/login`).
Jusqu'à l'US01, l'accueil (`/`) redirige vers la connexion ; une connexion réussie se
voit au bouton « Mon espace » du header. Pour se déconnecter en attendant l'US05,
supprimer la clé `token` du `localStorage` (outils de développement > Application).

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

Les erreurs ont toutes le même format JSON (`timestamp`, `message`, `details`).

Toutes les routes sont décrites dans
[`docs/conception/openapi.yaml`](docs/conception/openapi.yaml). Avec **Postman** :
*Import* de ce fichier, qui crée une requête prête à l'emploi par route.
