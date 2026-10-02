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


## Questions ouvertes — à éclaircir avec le mentor


## 2026-09-30 — Stockage des fichiers : système de fichiers local

**Décidé :** stockage sur le système de fichiers local, servi par un conteneur Docker
avec volume monté. Accès isolé derrière une interface `FileStorage`.

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
serveur détient les fichiers. À documenter dans `MAINTENANCE.md`. Les fichiers
doivent être sur un **volume Docker monté**, sinon ils disparaissent au redémarrage
du conteneur.

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
**Conséquence assumée :** écart assumé avec US10 sur les métadonnées. Perspective
d'évolution : supprimer les métadonnées après une durée de rétention.

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
