# Architecture technique

Comment les briques s'emboîtent et comment les données circulent. Le choix de
chaque technologie est justifié dans [`choix-techno.md`](choix-techno.md).

## Vue d'ensemble

```mermaid
flowchart LR
  U([Navigateur])
  subgraph Poste["Poste de développement"]
    F["Front Angular<br/>:4200"]
    subgraph API["API Spring Boot :8080"]
      S["Controllers → Services → Repositories"]
      P["Purge quotidienne<br/>(tâche planifiée)"]
    end
    D[("Dossier local<br/>fichiers déposés")]
  end
  subgraph Docker["Conteneur Docker"]
    DB[("PostgreSQL :5432<br/>volume")]
  end

  U -- "HTTP" --> F
  F -- "REST / JSON<br/>Bearer JWT<br/>(proxy /api)" --> S
  S -- "JPA" --> DB
  S -- "FileStorage" --> D
  P --> DB
  P --> D
```

| Brique | Rôle | Technologie | Où elle tourne |
|---|---|---|---|
| Front | écrans, validation client, stockage du JWT | Angular | `ng serve`, port 4200 |
| API | règles métier, validation serveur, sécurité | Spring Boot | poste, port 8080 |
| Base de données | comptes et fiches des fichiers | PostgreSQL + Flyway | conteneur lancé par Spring, données sur un volume Docker |
| Stockage des fichiers | contenu des fichiers, nommés par leur UUID | disque local | dossier configurable du poste |
| Authentification | prouver l'identité à chaque requête | JWT signé (HS256), BCrypt | émis et vérifié par l'API |

**Le contenu d'un fichier ne passe jamais par la base** : PostgreSQL garde la fiche
(nom, taille, dates, empreinte du mot de passe), le disque garde les octets.

## En développement : proxy plutôt que CORS

Le front (`localhost:4200`) et l'API (`localhost:8080`) n'ont pas le même port, donc
pas la même **origine** pour le navigateur. Par sécurité, il bloque les appels d'une
origine vers une autre, sauf si le serveur les autorise explicitement (en-têtes
**CORS**).

Le serveur de dev Angular sert de **proxy** (`proxy.conf.json`) : le navigateur
appelle `localhost:4200/api/…`, et Angular relaie la requête à `localhost:8080`. Le
navigateur ne voit qu'une seule origine : il n'y a pas de CORS à gérer.

Pourquoi pas une configuration CORS dans Spring :
- elle n'existerait **que pour le dev**. En production, front et API sont servis
  derrière un même reverse proxy, sous le même domaine : le proxy de dev reproduit
  déjà ce schéma ;
- CORS ne protège pas l'API, il protège l'utilisateur : le navigateur empêche un
  autre site de lire les réponses de l'API. Configurer CORS, c'est **assouplir**
  cette protection, et une règle trop large la lève pour tout le monde.

## Sécurité : rôle de chaque couche

| Couche | Garantit | Où |
|---|---|---|
| Infrastructure (reverse proxy, en production) | HTTPS · une origine unique, qui rend CORS superflu | hors périmètre du prototype |
| Application (Spring) | authentification JWT · mots de passe hachés (BCrypt) · droits sur les fichiers · validation | ce dépôt, en dev comme en prod |

Les deux se complètent : le proxy ne remplace aucun contrôle de l'application, qui
reste seule à protéger l'API contre un appel direct (`curl`, Postman).

## Découpage interne

### Back — par couche

| Package | Contient | Rôle |
|---|---|---|
| `controller/` | `AuthController`, `FileController` | reçoit la requête HTTP, appelle le service, renvoie la réponse et son code (201 créé, 404 introuvable…) |
| `service/` | `AuthService`, `FileService`, `JwtService`, `FilePurgeService` | règles métier et validation serveur |
| `repository/` | `AccountRepository`, `SharedFileRepository` | lecture et écriture en base (Spring Data JPA) |
| `model/` | `Account`, `SharedFile` | entités JPA, le reflet des tables ; jamais renvoyées au client |
| `dto/` | objets d'entrée et de sortie | la forme exacte des données échangées avec le front |
| `mapper/` | interfaces MapStruct | convertit une entité en DTO. Ajoute des champs **calculés**, absents des tables : le statut, déduit de `expires_at` comparée à l'heure actuelle ; « protégé » (oui / non), qui fait afficher le cadenas et le champ mot de passe, déduit de `password_hash` sans jamais envoyer ce hash au front |
| `storage/` | `FileStorage`, `LocalFileStorage` | écrit, lit et efface un fichier sur le disque, sans rien décider : ce sont les services qui choisissent quoi effacer (`FileService` pour la suppression US06, `FilePurgeService` pour la purge) |
| `configuration/` | `SpringSecurityConfig`, `CustomUserDetailService` | routes publiques ou protégées, vérification du JWT |
| `exception/` | `RestExceptionHandler`, `ErrorDetails` | transforme toute erreur en une réponse au même format |

Un controller ne parle qu'à un service. Un service parle aux repositories et à
`FileStorage`, sans savoir où les octets sont rangés.

### Front — par écran

```
core/       auth.service, auth.interceptor (ajoute le JWT), auth.guard
features/   auth/ (connexion, inscription) · upload/ · download/ · my-files/
shared/     composants du design system : header, callout, bouton…
```

## Flux principaux

Les routes ci-dessous sont celles du [contrat d'interface](contrat-interface.md).

### Connexion (US03, US04)

```mermaid
sequenceDiagram
  actor U as Utilisateur
  participant F as Front
  participant A as API
  participant B as Base

  U->>F: email et mot de passe
  F->>F: validation client : format de l'email, 8 caractères minimum
  F->>A: POST /api/auth/login (route publique)
  A->>B: cherche le compte par email
  A->>A: compare le mot de passe à password_hash (BCrypt)
  alt email inconnu ou mot de passe faux
    A-->>F: 401, même message dans les deux cas
  end
  A->>A: signe un JWT : identifiant du compte, date d'expiration
  A-->>F: 200 + JWT
  F->>F: stocke le JWT (localStorage)

  Note over F,A: toutes les requêtes suivantes
  F->>A: requête + Authorization: Bearer JWT (ajouté par l'intercepteur)
  A->>A: vérifie signature et expiration, sinon 401
  A->>A: lit l'identifiant du compte dans le JWT
```

L'identité vient **toujours du JWT**, jamais d'un paramètre : l'historique (US05)
et la suppression (US06) savent ainsi à qui ils répondent, sans qu'on puisse se faire
passer pour un autre compte. Un message identique pour « email inconnu » et « mot de
passe faux » évite de révéler quels emails sont inscrits.

L'inscription (US03) suit le même chemin sans émettre de JWT : email unique vérifié,
mot de passe haché, réponse 201 ; l'utilisateur se connecte ensuite.

### Téléversement (US01)

```mermaid
sequenceDiagram
  actor U as Utilisateur connecté
  participant F as Front
  participant A as API
  participant D as Disque
  participant B as Base

  U->>F: choisit fichier, mot de passe, durée
  F->>F: validation client : taille ≤ 1 Go, extension autorisée,<br/>mot de passe ≥ 6 caractères, expiration de 1 à 7 jours
  F->>A: POST /api/files (multipart) + Bearer JWT
  A->>A: JWT valide ? sinon 401
  A->>A: validation serveur (mêmes règles) sinon 400
  A->>A: génère l'UUID
  A->>D: écrit le fichier sous le nom UUID
  A->>B: insère la fiche (mot de passe haché BCrypt)
  alt échec de l'insertion
    A->>D: efface le fichier écrit
    A-->>F: 500
  end
  A-->>F: 201 + UUID, date d'expiration
  F-->>U: lien de partage /download/UUID
```

Le fichier est écrit **en streaming** sur le disque, jamais chargé en entier en mémoire.
Spring refuse par défaut tout envoi de plus de 1 Mo : ce plafond est porté à
**1 Go**, la taille maximale autorisée par les spécifications.

### Téléchargement (US02)

Le destinataire **n'a pas de compte** : posséder le lien suffit (spec US02). C'est
l'expéditeur qui le lui transmet, par ses propres moyens (mail, messagerie), après
l'avoir copié sur l'écran « lien généré » ; l'application n'envoie aucun email.

```mermaid
sequenceDiagram
  actor R as Destinataire (sans compte)
  participant F as Front
  participant A as API
  participant B as Base
  participant D as Disque

  R->>F: ouvre le lien /download/UUID (page du front)
  F->>A: GET /api/files/UUID, sans JWT (route publique)
  A->>B: lit la fiche : métadonnées seules, pas le contenu
  A-->>F: nom, taille, expiration, protégé ? (ou 404 / expiré)
  F-->>R: métadonnées, champ mot de passe si protégé
  R->>F: clique sur Télécharger
  F->>A: POST /api/files/UUID/download, mot de passe dans le corps
  A->>A: expiré ? mot de passe correct (BCrypt) ?
  A->>D: lit le fichier
  A-->>F: fichier en streaming, nom d'origine
  F-->>R: enregistrement du fichier
```

Mot de passe en `POST`, **jamais dans l'URL** : une URL finit dans les logs du
serveur et l'historique du navigateur.

### Suppression (US06)

```mermaid
sequenceDiagram
  actor U as Utilisateur connecté
  participant F as Front
  participant A as API
  participant B as Base
  participant D as Disque

  U->>F: clique sur Supprimer
  F-->>U: demande confirmation (action irréversible)
  U->>F: confirme
  F->>A: DELETE /api/files/UUID + Bearer JWT
  A->>B: lit la fiche
  alt fichier inconnu, ou appartenant à un autre compte
    A-->>F: 404
  end
  A->>B: supprime la fiche
  A->>D: efface le fichier
  A-->>F: 204
  F-->>U: retire le fichier de la liste
```

Le fichier d'un autre compte reçoit la même réponse qu'un fichier inexistant : l'API
ne confirme pas son existence.

### Expiration et purge (US01, US10 partielle)

Le statut n'est **jamais stocké** : il se calcule à chaque accès en comparant
`expires_at` à l'heure courante.

| Quand | Qui | Effet |
|---|---|---|
| à chaque téléchargement | `FileService` | refus si `expires_at` est dépassée |
| à chaque affichage de l'historique | `FileService` | statut actif · expire bientôt · expiré |
| chaque nuit | `FilePurgeService` (`@Scheduled`) | efface du disque les fichiers expirés, **garde la fiche** |

La purge efface « si le fichier existe encore » : la relancer ne casse rien.

## Cohérence entre disque et base

Une transaction PostgreSQL est **atomique** (le A d'ACID) : tout ou rien, mais
seulement **dans la base**. Le système de fichiers n'est pas transactionnel et
n'entre pas dans cette transaction : une opération peut réussir sur le disque et
échouer en base, ou l'inverse. On compense donc à la main. La règle : **mieux vaut un fichier orphelin sur le
disque qu'une fiche qui pointe vers un fichier absent**.

| Opération | Ordre | Si la 2ᵉ étape échoue |
|---|---|---|
| Envoi (US01) | disque, puis base | le fichier écrit est effacé |
| Suppression (US06) | base, puis disque | fichier orphelin, journalisé |
