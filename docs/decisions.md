# Journal des décisions

Une entrée par décision, **écrite le jour où elle est prise**.
Reconstituer ces justifications en fin de projet fait perdre les vraies raisons.

Format : date, décision, options écartées, raison, conséquence acceptée.

---

## AAAA-MM-JJ — <décision>

**Décidé :** 
**Écarté :** 
**Pourquoi :** 
**Conséquence assumée :** 

---


## 2026-09-30 — Stockage des fichiers : système de fichiers local

**Décidé :** stockage dans un **dossier local du serveur**, dont le chemin est
configurable. Accès isolé derrière une interface `FileStorage`.
*(Corrigé le 2026-10-02 : seul PostgreSQL est conteneurisé, le back tourne hors
Docker ; il n'y a donc pas de volume monté pour les fichiers.)*

**Écarté :**
- **AWS S3** pas de compte, pas de pratique du
  fournisseur, crédit nécessaire. Aucun gain fonctionnel sur un POC.
- **MinIO** (stockage objet compatible S3, en conteneur) — donnerait l'API S3 sans
  compte ni coût, mais ajoute un conteneur et un SDK pour un bénéfice théorique sur
  un prototype de 4 semaines.

**Pourquoi :** le stockage local est immédiat, testable sans dépendance externe, et
suffisant pour la volumétrie d'un prototype. L'interface `FileStorage` conserve la
possibilité de basculer vers un stockage objet sans toucher à la logique métier.

**Conséquence assumée :** pas de redondance, pas de scalabilité horizontale — le
serveur détient les fichiers. À documenter dans `MAINTENANCE.md`. Le jour où le
back sera conteneurisé, ce dossier devra devenir un **volume Docker**, sinon les
fichiers disparaîtront à chaque redémarrage du conteneur.

**Contexte :** environnements cloud pratiqués par ailleurs (Azure au travail, GCP en
personnel) ; les spécifications n'autorisent que local ou AWS S3.

---

## 2026-10-02 — Périmètre : MVP strict, US07 à US10 écartées

**Décidé :** seules US01 à US06 sont développées. Conséquences sur le modèle :
- `user_id` **obligatoire** sur un fichier (pas d'upload anonyme)
- **pas de table Tag**
- **pas de purge planifiée** *(révisé : voir « US10 partielle » ci-dessous)* :
  un fichier expiré est refusé au téléchargement
  (contrôle à chaque accès) et reste listé dans l'historique comme « expiré »
  (onglets de la maquette) ; seule la suppression US06 efface physiquement.
  *(Corrigé le 2026-10-02 : « masqué de l'historique » contredisait la maquette.)* Le statut (actif · expire bientôt · expiré) est **calculé**
  depuis `expires_at`, pas stocké.
- le mot de passe sur fichier **reste** (il fait partie d'US01 ; US09 ne fait que
  l'étendre aux anonymes) → `password_hash` nullable

**Écarté :** implémenter US07 pour coller à la maquette d'accueil (upload sans compte).

**Pourquoi :** recommandation du mentor (entretien hebdo) — le développement n'est
pas la priorité du parcours DevOps, le temps va aux livrables test / sécurité /
perf / maintenance. Tranche l'ancienne question Q2.

**Conséquence assumée :** écart avec la maquette — l'accueil redirige vers la
connexion. Les fichiers expirés restent sur disque jusqu'à suppression manuelle :
limite à documenter dans `MAINTENANCE.md`.

---

## 2026-10-02 — Outils de conception : Mermaid et OpenAPI design-first

**Décidé :**
- schéma d'architecture en **Mermaid**, dans le Markdown
- contrat d'interface en **`openapi.yaml` écrit à la main avant le code**
  (design-first), résumé par un tableau dans `contrat-interface.md`

**Écarté :** draw.io / Lucidchart (fichiers binaires ou externes, non diffables) ;
contrat en tableau Markdown seul (pas de schémas ni de doc navigable) ; code-first
pur avec springdoc (le contrat n'existerait qu'après le code).

**Pourquoi :** tout reste du texte versionné, relu dans l'IDE et rendu par GitHub.
Le design-first produit le contrat à l'étape 1, comme l'énoncé le demande.

**Conséquence assumée :** le YAML et le code peuvent diverger — à contrôler à
l'étape 6 contre le Swagger UI généré par springdoc.

---

## 2026-10-02 — MCD en Merise avec Mocodo (version en ligne)

**Décidé :** MCD en notation **Merise**, écrit en texte dans **Mocodo** (mocodo.net).
La source texte et l'export SVG sont versionnés.

**Écarté :** Looping (outil de prédilection, mais Windows uniquement) ;

---

## 2026-10-02 — Schéma de base géré par Flyway

**Décidé :** le schéma est créé et modifié par des **migrations Flyway** versionnées
(`db/migration/V1__init.sql`, …). Hibernate passe en `ddl-auto=validate` : il
vérifie que les entités correspondent au schéma, il ne le modifie jamais.

**Écarté :** `ddl-auto=update/create` (schéma implicite, non traçable, rien à
livrer) ; Liquibase (même rôle, changelogs XML/YAML plus verbeux que du SQL).

**Pourquoi :** les scripts SQL deviennent le livrable « installation et
configuration de la BDD ». Le même schéma est appliqué en dev (conteneur lancé par
`spring-boot-docker-compose`) et dans les tests (Testcontainers).

**Conséquence assumée :** une migration appliquée ne se modifie plus (contrôle par
checksum) ; toute évolution passe par un nouveau fichier `V2__…`. D'où l'intérêt de
stabiliser le MCD avant d'écrire `V1`.

---

## 2026-10-02 — US10 partielle : purge quotidienne du fichier physique

**Décidé :** une tâche planifiée quotidienne efface le **fichier physique** des
fichiers expirés ; les **métadonnées sont conservées**. Le reste d'US10 (durée 1-7 jours, défaut 7, validation serveur) est
déjà couvert par US01.
**Écarté :** US10 à la lettre (suppression des métadonnées : l'onglet « Expiré » de la
maquette serait toujours vide) ; pas de purge (le message « il n'est plus stocké
chez nous » serait faux).
**Pourquoi :** fidélité à la maquette pour un coût marginal ; tâche d'exploitation
utile au disque, pertinente pour un parcours DevOps.
**Conséquence assumée :** écart assumé avec US10 sur les métadonnées. Perspectives
d'évolution : supprimer les métadonnées après une durée de rétention ; en production,
sortir la purge de l'API (règle de cycle de vie du stockage objet, ou tâche planifiée
indépendante) pour qu'elle ne dépende ni du démarrage ni du nombre d'instances du back.

---

## 2026-10-02 — Front : Angular (TypeScript)

**Décidé :** front en **Angular / TypeScript**, tests front avec **Jest**.
**Écarté :** Vue.js (choix initial), React.
**Pourquoi :** stack déjà pratiquée au P2 (Angular 19) ; les briques éprouvées du P2
se réutilisent directement (intercepteur JWT, guard, config Jest et Cypress).
**Conséquence assumée :** framework plus lourd que Vue pour un prototype, compensé
par l'absence de temps d'apprentissage.

---

## 2026-10-02 — Back : Spring Boot (Java)

**Décidé :** API REST en **Spring Boot**, architecture Controller → Service →
Repository, DTO.
**Écarté :** .NET Core, NestJS, Symfony / Laravel (autres options autorisées).
**Pourquoi :** stack pratiquée au P2 ; ses briques se réutilisent (sécurité JWT via
`oauth2-resource-server`, Testcontainers, JaCoCo). L'écosystème couvre tout le
besoin sans bibliothèque tierce : Spring Security, Spring Data JPA, tâches
planifiées (purge US10), intégration Flyway et Docker Compose.

---

## 2026-10-02 — Base de données : PostgreSQL en conteneur

**Décidé :** **PostgreSQL**, dans un conteneur Docker lancé par Spring au démarrage
(`spring-boot-docker-compose`, comme au P2), données sur un volume.
**Écarté :** MongoDB (seule autre option autorisée).
**Pourquoi :** les données sont relationnelles (un compte possède des fichiers) ;
PostgreSQL garantit en base l'unicité de l'email, la clé étrangère et les champs
obligatoires, là où MongoDB laisserait ces contrôles au code. Type `TIMESTAMPTZ`
adapté aux dates d'expiration.
**Conséquence assumée :** changement par rapport au P2 (MySQL) : driver, image
Docker et module Testcontainers à adapter.

---

## 2026-10-02 — Back rangé par couche, comme au P2

**Décidé :** packages par couche technique : `controller/`, `service/`,
`repository/`, `model/`, `dto/`, plus `storage/`, `configuration/`, `exception/`.
**Écarté :** rangement par fonctionnalité (`auth/`, `file/`, chacun avec ses couches).
**Pourquoi :** structure déjà pratiquée au P2, plus facile à parcourir et à expliquer.
Avec deux domaines seulement, le rangement par fonctionnalité n'apporte rien de décisif.
**Conséquence assumée :** les classes d'un même domaine sont réparties entre plusieurs
dossiers. À revoir si le nombre de domaines augmente.

---

## 2026-10-02 — Cohérence disque / base : ordre des écritures

**Décidé :** à l'envoi, le fichier est écrit sur le disque **avant** l'insertion en base,
puis effacé si l'insertion échoue. À la suppression, la fiche est supprimée **avant** le
fichier ; un échec côté disque laisse un orphelin, journalisé.
**Écarté :** transaction commune disque + base (le système de fichiers n'est pas
transactionnel) ; ordre inverse (risque d'une fiche pointant vers un fichier absent).
**Pourquoi :** l'**atomicité** (le A d'ACID, tout ou rien) d'une transaction
PostgreSQL ne couvre que la base ; l'écriture sur disque y échappe. On applique donc
la pratique courante de *compensation* : on annule à la main l'étape déjà faite. Un orphelin sur disque est invisible pour l'utilisateur ; une fiche
sans fichier produit une erreur au téléchargement.
**Conséquence assumée :** des orphelins restent possibles. Perspective : la purge
pourrait aussi effacer les fichiers du disque sans fiche en base.

---

## 2026-10-02 — Dev : proxy Angular plutôt que configuration CORS

**Décidé :** en développement, le serveur Angular relaie `/api` vers l'API
(`proxy.conf.json`). Aucune configuration CORS côté Spring.
**Écarté :** autoriser l'origine `localhost:4200` dans Spring Security (CORS).
**Pourquoi :** le navigateur ne voit qu'une origine, comme en production où front et
API sont servis sous le même domaine derrière un reverse proxy. Une règle CORS
n'existerait que pour le dev et assouplirait, pour une origine de plus, la protection
que le navigateur offre à l'utilisateur.
**Conséquence assumée :** le front doit être lancé avec le proxy (`ng serve` configuré
dans `angular.json`) ; un appel direct à `:8080` depuis le navigateur sera bloqué.

---

## 2026-10-03 — Lien de partage = identifiant du fichier

**Décidé :** le lien de partage est `/download/{file_id}` : l'UUID du fichier sert à
la fois de clé en base, de nom sur le disque et de lien (modèle Google Drive).
**Écarté :** un jeton de partage distinct du fichier (modèle Dropbox), qui demanderait
une colonne ou une table de plus.
**Pourquoi :** une seule colonne pour tout, suffisant pour le MVP ; l'UUID satisfait
déjà l'exigence d'identifiant non prédictible.
**Conséquence assumée :** un lien ne peut être révoqué qu'en supprimant le fichier.
Conforme à la spec, qui ne prévoit aucune révocation : seule la suppression (US06)
coupe l'accès. Perspective d'évolution : jeton séparé pour régénérer ou révoquer un lien, ou
créer plusieurs liens pour un même fichier.

---

## 2026-10-03 — OpenAPI en usage documentaire, sans génération de code

**Décidé :** `openapi.yaml` sert de **référence de conception** et de documentation.
Les controllers et les DTO sont écrits à la main. La conformité est contrôlée à
l'étape 6, en comparant le contrat au Swagger UI que springdoc génère depuis le code.
**Écarté :** génération du code depuis le contrat (openapi-generator : interfaces
Spring et DTO côté back, services et modèles TypeScript côté front).
**Pourquoi :** choix volontaire, pour ne pas ajouter de complexité : un générateur de
plus à configurer et du code généré à expliquer, pour une dizaine de routes seulement.
**Conséquence assumée :** le contrat et le code peuvent diverger entre deux contrôles.
Perspective : générer le code depuis le contrat pour rendre toute divergence impossible.

---

## 2026-10-03 — Routes regroupées par niveau d'accès

**Décidé :** `/api/auth/**` et `/api/download/**` publics, `/api/files/**` sous JWT.
**Écarté :** routes publiques et protégées mêlées sous `/api/files/{id}` (accès
public en `GET`, protégé en `DELETE`).
**Pourquoi :** la règle de sécurité tient en une ligne ; la liste des routes publiques
de l'intercepteur front devient deux préfixes. Sans cette exclusion, un destinataire
porteur d'un JWT expiré recevrait un `401` sur un téléchargement public (piège déjà
rencontré au P2 sur `/api/login`).
**Conséquence assumée :** deux préfixes pour une même ressource, le fichier, selon
qu'on en est propriétaire ou destinataire.

---

## 2026-10-03 — Codes et format d'erreur

**Décidé :** format d'erreur du P2 (`timestamp`, `message`, `details`) pour toutes
les routes. `404` pour un fichier inconnu **ou d'un autre compte** ; `410` pour un
fichier expiré ; `403` pour un mot de passe de fichier faux ; `401` avec un message
unique que l'email ou le mot de passe soit faux ; `409` pour un email déjà pris.
**Écarté :** format normalisé RFC 9457 (`ProblemDetail` de Spring), plus standard mais
sans gain pour un front écrit par nous ; `403` pour le fichier d'un autre compte
(confirmerait son existence) ; `401` pour le mot de passe de fichier (l'intercepteur
déconnecterait l'utilisateur) ; messages distincts à la connexion (énumération des
comptes inscrits).
**Pourquoi :** continuité avec le P2, et des codes qui n'en disent pas plus que
nécessaire à un attaquant.
**Conséquence assumée :** l'inscription révèle encore si un email est inscrit (`409`) ;
le contourner exigerait un envoi d'email, absent du MVP. À signaler dans `SECURITY.md`.

---

## 2026-10-03 — Téléchargement reçu par HttpClient (blob)

**Décidé :** le front reçoit le fichier par `HttpClient` puis propose de l'enregistrer.
**Écarté :** URL de téléchargement signée à courte durée, que le navigateur
téléchargerait seul (demande un mécanisme de jeton supplémentaire).
**Pourquoi :** gestion d'erreur identique au reste de l'appli (`403`, `410`) et barre
de progression fournie par Angular ; le serveur, lui, envoie bien en streaming.
**Conséquence assumée :** le fichier entier tient dans la mémoire du navigateur (jusqu'à
1 Go) : acceptable sur ordinateur, risqué sur mobile. À mentionner dans `PERF.md`.

---

## 2026-10-03 — Règles de validation précisées

**Décidé :**
- extensions refusées : `exe`, `bat`, `cmd`, `com`, `msi`, `sh`, `ps1`, `vbs`, `jar` ;
  casse ignorée, seule la dernière extension compte (`facture.pdf.exe` refusé), fichier
  sans extension accepté
- statut `EXPIRING_SOON` quand il reste moins de 24 h (alerte orange de la maquette)
- durée `expirationDays` : entier de 1 à 7, **7 par défaut** (spec)

**Écarté :** liste blanche d'extensions (trop restrictive pour un outil de partage
généraliste) ; défaut « une journée » de la maquette (contredit la spec).
**Pourquoi :** la spec laisse la liste « à définir selon la politique de sécurité » :
on vise les exécutables et scripts, vecteurs classiques de logiciels malveillants.
**Conséquence assumée :** une liste noire n'est jamais complète, et l'extension se
renomme facilement ; une vraie protection passerait par un antivirus côté serveur.
