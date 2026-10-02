# Choix technologiques

Deux critères pour un prototype livré en 4 semaines : **une stack déjà maîtrisée**
(pas de temps d'apprentissage) et **un chemin clair vers la production** (rien à
réécrire si le prototype est retenu). Le détail de chaque arbitrage est dans
[`../decisions.md`](../decisions.md).

## Synthèse

| Besoin | Retenu | Écarté | Raison principale |
|---|---|---|---|
| API back | **Spring Boot** (Java) | .NET Core, NestJS, Symfony/Laravel | maîtrisé, écosystème complet |
| Front | **Angular** (TypeScript) | React, Vue.js | maîtrisé, cadre structuré et typé |
| Base de données | **PostgreSQL** | MongoDB | données relationnelles, intégrité garantie en base |
| Schéma de base | **Flyway** | `ddl-auto` Hibernate, Liquibase | schéma versionné en SQL lisible |
| Environnement BDD | **Docker** (Compose, lancé par Spring) | PostgreSQL installé sur le poste | une commande, même version partout |
| Stockage fichiers | **disque local** | AWS S3, MinIO | immédiat, sans compte ni coût |
| Authentification | **JWT** + BCrypt | sessions serveur | API sans état, exigé par le brief |
| Tests | JUnit, Mockito, Testcontainers · Jest · Cypress · k6 | — | un outil par niveau de test |

---

## Back — Spring Boot

- **Tout est inclus** : sécurité (Spring Security), accès aux données (Spring Data
  JPA), tâches planifiées (purge quotidienne), intégration Flyway et Docker Compose.
  Aucune bibliothèque tierce à assembler.
- **Structure imposée et lisible** : Controller → Service → Repository, DTO en
  entrée et en sortie.
- **En production** : un JAR dans une image Docker, configuration par variables
  d'environnement, sondes de santé fournies par Spring Boot Actuator.

## Front — Angular

- **Cadre complet** : routage, formulaires avec validation, client HTTP et
  intercepteurs sont fournis. La validation côté client exigée par le brief
  s'appuie sur les formulaires réactifs.
- **TypeScript** : les erreurs de type sont détectées à la compilation.
- **En production** : le build produit des fichiers statiques, servis par un
  serveur web ou un CDN. Les **budgets de taille** intégrés à Angular font échouer
  le build si le bundle dépasse le seuil fixé (repris dans `PERF.md`).

## Base de données — PostgreSQL + Flyway

- **Relationnel** : un compte possède des fichiers. PostgreSQL garantit en base
  l'unicité de l'email, la clé étrangère et les champs obligatoires. Avec MongoDB,
  ces contrôles seraient à la charge du code.
- **Flyway** : le schéma est décrit par des scripts SQL numérotés (`V1__init.sql`,
  `V2__…`), appliqués automatiquement au démarrage. Le même schéma sert en
  développement et dans les tests.
- **En production** : base managée (AWS RDS, Azure Database for PostgreSQL) ;
  Flyway applique les migrations au déploiement, sans intervention manuelle.

## Docker — la base en conteneur

- **Aucune installation** : PostgreSQL tourne dans un conteneur décrit par
  `compose.yaml`. Au lancement du back, Spring démarre le conteneur
  (`spring-boot-docker-compose`) et s'y connecte seul.
- **Même version partout** : sur chaque poste et dans les tests d'intégration
  (Testcontainers utilise la même image).
- Les données sont sur un **volume** : elles survivent à l'arrêt du conteneur.
- **En production** : le back et le front seraient eux aussi livrés en images
  Docker, déployées par un orchestrateur. Hors périmètre de ce prototype.

## Stockage — disque local

- **Le plus simple pour un prototype** : aucun service externe, testable en local.
- Le code passe par une interface `FileStorage` : la logique métier ne sait pas où
  sont les fichiers.
- **En production** : basculer vers un stockage objet (S3, Azure Blob) en écrivant
  une seconde implémentation de `FileStorage`. Le disque local ne permet ni
  redondance ni plusieurs instances du back.

## Authentification — JWT

- **Sans état** : le serveur ne garde pas de session. Chaque requête porte un jeton
  signé qui prouve l'identité de l'utilisateur.
- Mots de passe hachés avec **BCrypt** (salage intégré), comptes comme fichiers.
- **En production** : clé de signature stockée dans un gestionnaire de secrets,
  jamais dans le code ; durée de vie courte des jetons.

## Tests

| Niveau | Outil | Ce qu'il vérifie |
|---|---|---|
| Unitaire back | JUnit + Mockito | la logique des services, isolée de la base |
| Intégration back | Testcontainers | l'API sur un vrai PostgreSQL, migré par Flyway |
| Unitaire front | Jest | composants et services Angular |
| Bout en bout | Cypress | les parcours critiques dans un navigateur |
| Charge | k6 | le temps de réponse d'un endpoint critique |

**En production** : ces tests tournent dans le pipeline CI à chaque commit ;
couverture mesurée par JaCoCo (back) et Jest (front), seuil fixé à 70 %.
