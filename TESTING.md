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

**Convention back** : un service est testé en **unitaire** (ses règles, isolées) ; un
controller en **intégration** (la chaîne complète). Un controller ne fait que relier HTTP au service.

**Convention front** : un service est testé contre un faux serveur HTTP
(`HttpTestingController`) ; un composant est testé **par son HTML** (on remplit un champ,
on lit le message affiché), avec des services simulés (`vi.fn()`).

## Fonctionnalités critiques

Identifiées avant le développement : ce sont elles que les tests doivent couvrir en
priorité, et en échec comme en succès.

| Fonctionnalité | US | Risque si elle casse | Tests prévus |
|---|---|---|---|
| Inscription : email unique, mot de passe haché | US03 | comptes en double, mots de passe lisibles en base | unitaire + intégration |
| Connexion : JWT, même message d'erreur que l'email ou le mot de passe soit faux | US04 | accès impossible, ou liste des comptes devinable | unitaire + intégration + E2E |
| Routes protégées : `401` sans JWT valide | US01 (jeton émis par US04) | données d'un compte accessibles sans connexion | intégration |
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
| `AuthControllerTest` | intégration | `201` et hash BCrypt en base · `409` même avec une casse différente, au format `ErrorDetailsDTO` · `400` : email invalide, email entouré d'espaces, mot de passe trop court (sans renvoyer la valeur), mot de passe de plus de 18 caractères, JSON mal formé |
| `auth.service.spec.ts` (front) | unitaire | `POST /api/auth/register` avec l'email et le mot de passe |
| `register.spec.ts` (front) | unitaire | aucune erreur avant de quitter un champ · formulaire vide : trois erreurs · email mal formé, erreur reliée au champ (`aria-invalid`, `aria-describedby`) · espaces retirés de l'email · mot de passe hors 8 à 18 caractères · confirmation différente · aucun appel si le formulaire est invalide · envoi de l'email et du mot de passe seuls, puis redirection vers `/login?registered=true` · `409` : « email déjà utilisé » · autre erreur : message générique · double clic : une seule requête |

### US04 — Connexion

| Test | Niveau | Cas couverts |
|---|---|---|
| `JwtServiceTest` | unitaire | jeton relu avec la même clé : `sub` = identifiant du compte, expiration 1 heure après l'émission |
| `AuthServiceTest` | unitaire | jeton renvoyé quelle que soit la casse de l'email · email inconnu et mot de passe faux refusés, sans émettre de jeton |
| `AuthControllerTest` | intégration | `200` + jeton · `401` au même message pour email inconnu et mot de passe faux · `401` (et non `500`) pour un mot de passe de plus de 72 octets, limite de BCrypt · `400` email invalide |
| `auth.service.spec.ts` (front) | unitaire | `POST /api/auth/login` : jeton enregistré, `isLoggedIn` vrai · `401` : rien n'est enregistré · jeton déjà présent au démarrage : connecté |
| `login.spec.ts` (front) | unitaire | message « compte créé » seulement avec `?registered=true` · formulaire vide : deux erreurs · email mal formé, erreur reliée au champ · espaces retirés de l'email · mot de passe court accepté (longueur contrôlée à l'inscription) · aucun appel si le formulaire est invalide · envoi puis redirection vers `/` · `401` : « email ou mot de passe incorrect » · autre erreur : message générique · double clic : une seule requête |
| `header.spec.ts` (front) | unitaire | « Se connecter » vers `/login` si déconnecté · bascule sur « Mon espace » dès la connexion, sans recréer le composant |

Les tests reçoivent une clé JWT factice par la configuration Maven (Surefire) : ils
tournent sans `.env`.
