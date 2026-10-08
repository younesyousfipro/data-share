# Tests

Stratégie de test de DataShare, tenue à jour à chaque user story.

## Niveaux de test

| Niveau | Outil | Vérifie | Dépendances réelles |
|---|---|---|---|
| Unitaire back | JUnit 5, Mockito, AssertJ | les règles d'un service, isolé | aucune : base et disque remplacés par des doublures |
| Intégration back | Spring Boot Test, MockMvc, Testcontainers | une route de bout en bout : sécurité, validation, codes HTTP, base | PostgreSQL 18 en conteneur, migré par Flyway |
| Unitaire front | Vitest | composants et services Angular | aucune : API simulée |
| E2E | Cypress | un parcours utilisateur complet dans le navigateur | à préciser avec les scénarios |
| Performance | k6 | temps de réponse d'un endpoint critique sous charge | voir `PERF.md` |

## Fonctionnalités critiques

Identifiées avant le développement : ce sont elles que les tests doivent couvrir en
priorité, et en échec comme en succès.

| Fonctionnalité | US | Risque si elle casse | Tests prévus |
|---|---|---|---|
| Inscription : email unique, mot de passe haché | US03 | comptes en double, mots de passe lisibles en base | unitaire + intégration |
| Connexion : JWT, même message d'erreur que l'email ou le mot de passe soit faux | US04 | accès impossible, ou liste des comptes devinable | unitaire + intégration + E2E |
| Routes protégées : `401` sans JWT valide | US04 | données d'un compte accessibles sans connexion | intégration |
| Droits sur les fichiers : un compte ne voit ni ne supprime les fichiers d'un autre (`404`) | US05, US06 | fuite ou perte de fichiers d'autrui | intégration |
| Envoi : 1 Go max, extensions refusées, durée de 1 à 7 jours, mot de passe ≥ 6 | US01 | fichiers dangereux ou hors limites stockés | unitaire + intégration + E2E |
| Téléchargement : `410` si expiré, `403` si mot de passe faux | US02 | fichier accessible après expiration ou sans son mot de passe | unitaire + intégration + E2E |
| Suppression physique : fiche et fichier effacés | US06 | fichier conservé alors que l'utilisateur le croit supprimé | unitaire + intégration |

## Couverture

Seuil de **70 %** sur les quatre métriques (instructions, lignes, branches, méthodes),
mesuré **séparément** pour le back (JaCoCo) et le front (Vitest). Sous le seuil, la
commande échoue (décision du 2026-10-07).

**Exclu de la mesure** — uniquement du code sans logique :

| Côté | Exclu | Raison |
|---|---|---|
| Back | `DatashareApplication` | point d'entrée : une ligne qui démarre Spring |
| Back | code généré par Lombok (accesseurs, constructeurs) | marqué `@Generated` par `lombok.config` ; seul le code écrit à la main est mesuré |
| Front | `app.config.ts`, `app.routes.ts` | déclarations de configuration, sans branchement |

## Exécution

| Commande | Depuis | Produit |
|---|---|---|
| `./mvnw verify` | `back/` | tests unitaires et d'intégration (Docker requis), rapport `target/site/jacoco/index.html`, contrôle du seuil |
| `npm run test:coverage` | `front/` | tests Vitest, rapport `coverage/` et contrôle du seuil |

## Tests par user story

### US03 — Création de compte

| Test | Niveau | Cas couverts |
|---|---|---|
| `AuthServiceTest` | unitaire | email enregistré en minuscules et mot de passe haché · email déjà pris refusé sans enregistrement · email pris par une inscription simultanée (contrainte d'unicité) |
