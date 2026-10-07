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

`.env` contient les identifiants de la base de dev ; il n'est pas versionné. Le mot
de passe peut être changé **avant** le premier lancement : il est lu uniquement à la
création de la base. Pour le changer ensuite, supprimer la base avec
`docker compose down -v` (toutes les données sont perdues).

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
