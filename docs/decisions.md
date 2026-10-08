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
*(Révisé le 2026-10-07 : Vitest remplace Jest, voir « Tests front : Vitest ».)*
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

---

## 2026-10-07 — Versions de la stack : dernières stables

**Décidé :** Java **25** (LTS) · Spring Boot **4.1** (fixe Spring Security 7.1, Jackson 3.1,
Flyway 12.4, Testcontainers 2.0, Lombok) · MapStruct 1.6.3 · JaCoCo 0.8.15 · PostgreSQL
**18** · Angular **22** (TypeScript 6.0) · Node **24** (LTS) · Vitest 5 *(Jest 30 à
l'origine, révisé le 2026-10-07)* · Cypress 16 · k6 2.
Relevé le 2026-10-03 sur start.spring.io, Maven Central, npm et endoflife.date.

---

## 2026-10-07 — Socle back généré par start.spring.io

**Décidé :** projet généré par start.spring.io avec la commande ci-dessous, commité
sans modification.
*(Révisé le 2026-10-07 : package renommé `io.github.younesyousfipro.datashare`, voir
« Package de base ».)* On n'y met que les dépendances du socle ; les autres arrivent avec
le code qui les utilise (sécurité, JWT, Lombok, MapStruct à l'étape 3 ; *révisé le 2026-10-07 : MapStruct arrive avec US01/US05, US03 n'ayant rien à convertir*).

```bash
curl https://start.spring.io/starter.zip -o back.zip \
  -d type=maven-project -d language=java -d bootVersion=4.1.1 -d javaVersion=25 \
  -d groupId=com.openclassrooms -d artifactId=datashare -d name=datashare \
  -d description="DataShare API" -d packageName=com.openclassrooms.datashare -d packaging=jar \
  -d dependencies=web,data-jpa,validation,flyway,postgresql,docker-compose,actuator,testcontainers
```

**Écarté :** reprendre le `pom.xml` du P2 ; l'assistant d'IntelliJ ; toutes les
dépendances dès le départ.
**Pourquoi :** Spring Boot 4 a changé le nom de plusieurs dépendances : le pom du P2
serait faux. La commande garde la trace des options choisies, l'assistant non. Une
dépendance arrive avec son usage, ce qui la justifie dans l'historique.
**Conséquence assumée :** le `pom.xml` évolue à chaque étape.

---

## 2026-10-07 — Maven Wrapper (`mvnw`)

**Décidé :** le projet se construit avec `./mvnw` (`mvnw.cmd` sous Windows), qui
télécharge et utilise une version précise de Maven.
**Écarté :** le Maven installé sur le poste.
**Pourquoi :** tout le monde construit avec le même Maven, sans l'installer. Seuls Java
et Docker sont requis.

---

## 2026-10-07 — Base de dev : Docker Compose seul, PostgreSQL 18

**Décidé :** en dev, la base est lancée par `compose.yaml` uniquement, en version
`postgres:18` (la même dans les tests). Les identifiants sont dans un `.env` non versionné.
**Écarté :** `postgres:latest`, qui change sans prévenir ; le second lanceur généré par
start.spring.io (`TestDatashareApplication`), qui démarre une base jetable.
**Pourquoi :** une seule façon de lancer l'application, avec des données conservées.
**Conséquence assumée :** copier `.env.example` en `.env` avant le premier lancement.

---

## 2026-10-07 — Socle front généré par Angular CLI

**Décidé :** projet généré par la commande ci-dessous (depuis `data-share/`), commité
sans modification. Angular CLI est lancé par `npx`, sans installation globale.

```bash
npx @angular/cli@22.2.2 new datashare --directory front --routing --style css \
  --ssr false --zoneless --skip-git --ai-config none --package-manager npm
```

**Écarté :** Angular CLI installé globalement ; rendu côté serveur (SSR) ; `zone.js`.
**Pourquoi :** une CLI globale finit par différer de la version du projet ; après
génération, la CLI du projet (`npx ng`) fait foi, comme `./mvnw` côté back. Le SSR
n'apporte rien à un prototype. Sans `zone.js` (défaut d'Angular 22) : une dépendance de
moins.

---

## 2026-10-07 — Tests front : Vitest plutôt que Jest

**Décidé :** tests unitaires front avec **Vitest**, le lanceur fourni par Angular 22.
**Écarté :** Jest via `jest-preset-angular` (choix du 2026-10-02, repris du P2).
**Pourquoi :** Angular 22 ne propose plus Jest. `jest-preset-angular` est un module
tiers dont la version est liée à celle d'Angular (`<23.0.0`) : chaque montée de version
d'Angular attendrait la sienne. Vitest se configure dans `angular.json`, sans fichier
dédié. Syntaxe des tests quasi identique (`vi.fn()` au lieu de `jest.fn()`).
**Conséquence assumée :** la config Jest du P2 n'est pas réutilisée ; son point clé
(mesurer aussi les fichiers sans test) est repris par `coverageInclude`.

---

## 2026-10-07 — Couverture : 70 %, bloquant, mesuré de chaque côté

**Décidé :** seuil de **70 %** sur les quatre métriques (lignes, instructions,
fonctions, branches), appliqué **séparément** au front (Vitest) et au back (JaCoCo).
Sous le seuil, la commande échoue. Seuls les fichiers **sans logique** sont exclus
(front : `app.config.ts`, `app.routes.ts`), chacun justifié dans `TESTING.md`.
**Écarté :** seuil indicatif non bloquant ; mesure globale front + back ; seuil sur les
seules lignes.
**Pourquoi :** l'énoncé fixe 70 % sans préciser la métrique ni le périmètre. Un seuil
qui ne bloque rien finit ignoré ; une mesure globale laisserait un back bien testé
masquer un front qui ne l'est pas.
**Conséquence assumée :** le seuil des branches est le plus exigeant ; s'il devient un
frein, le limiter aux lignes et instructions, et le tracer ici.

---

## 2026-10-07 — Styles : CSS simple et design tokens en variables CSS

**Décidé :** CSS simple, sans bibliothèque de composants. Les valeurs des maquettes
(couleurs, tailles, espacements, rayons) sont déclarées une fois en variables CSS dans
`styles.css` ; les composants y font référence (`var(--color-orange)`).
**Écarté :** Angular Material (impose son propre style, à l'opposé des maquettes) ;
Tailwind, SCSS (rien de décisif pour une dizaine d'écrans).
**Pourquoi :** les maquettes font foi et forment un design system complet : il suffit
de le transcrire.
**Conséquence assumée :** les composants de base (bouton, champ, carte) sont écrits à
la main, y compris leur accessibilité (focus clavier, contrastes).

---

## 2026-10-07 — Police DM Sans auto-hébergée

**Décidé :** la police est installée par npm (`@fontsource/dm-sans`) et servie par
l'application elle-même.
**Écarté :** le lien Google Fonts proposé par `design-tokens.md`.
**Pourquoi :** même logique que le proxy, une seule origine. Google ne reçoit pas l'IP
des visiteurs (RGPD : jugement de Munich, 2022) ; aucun domaine externe à autoriser
dans la politique de sécurité ; police disponible même si Google est bloqué ; version
figée par le lockfile. Le cache partagé entre sites, avantage historique de Google
Fonts, n'existe plus depuis que les navigateurs cloisonnent leur cache (2020).
**Conséquence assumée :** une dépendance de plus à maintenir (fichiers de police, sans
code exécutable).

---

## 2026-10-07 — Scripts d'installation npm non approuvés

**Décidé :** les 5 dépendances indirectes signalées par npm (`esbuild`,
`@parcel/watcher`, `fsevents`, `lmdb`, `msgpackr-extract`) **ne sont pas autorisées** à
exécuter leur script d'installation (`allowScripts`).
**Écarté :** les approuver pour faire disparaître l'avertissement.
**Pourquoi :** un script d'installation peut exécuter n'importe quelle commande sur le
poste : c'est un vecteur classique d'attaque de la chaîne d'approvisionnement. Ces
paquets fournissent des binaires précompilés ; l'application se construit et se teste
sans leurs scripts.
**Conséquence assumée :** l'avertissement reste affiché à chaque installation. À revoir
à chaque montée de version d'Angular, et à reprendre dans `SECURITY.md`.

---

## 2026-10-07 — Email du compte enregistré en minuscules

**Décidé :** l'email est mis en minuscules avant tout enregistrement et toute
comparaison (inscription, connexion).
*(Corrigé le 2026-10-08 : le service ne retire pas les espaces. `@Email` refuse déjà un
email entouré d'espaces (`400`) ; c'est le front qui les retire à la saisie.)*
**Écarté :** l'enregistrer tel quel ; porter la règle en base (index unique sur
`lower(email)` ou type `citext`).
**Pourquoi :** l'unicité de PostgreSQL tient compte de la casse : `Marie@mail.fr` et
`marie@mail.fr` donneraient deux comptes, et une majuscule tapée par erreur
empêcherait de se connecter. La norme (RFC 5321) autorise une partie locale sensible à
la casse, mais aucun fournisseur courant ne l'applique. La règle en base demanderait
une migration de plus pour un cas que le service couvre.
**Conséquence assumée :** la règle n'existe que dans le code ; une insertion faite hors
de l'API (SQL à la main) peut la contourner.

---

## 2026-10-07 — Mot de passe du compte : 8 à 72 caractères

**Décidé :** longueur de 8 à 72 caractères, contrôlée côté client et serveur.
**Écarté :** aucune limite haute ; pré-hacher le mot de passe (SHA-256) avant BCrypt.
**Pourquoi :** BCrypt ne lit que les 72 premiers octets, et Spring Security refuse
désormais un mot de passe plus long par une exception : sans limite, la réponse serait
une erreur `500` au lieu d'un `400`. 72 caractères suffisent à une phrase de passe ;
le pré-hachage contournerait la limite au prix d'un montage non standard.
**Conséquence assumée :** 72 caractères ne font pas toujours 72 octets (un `é` en
occupe 2). Ce cas marginal doit aussi répondre `400`, à vérifier dans le gestionnaire
d'erreurs.

---

## 2026-10-07 — Confirmation du mot de passe : front seulement

**Décidé :** le champ « Vérification du mot de passe » de la maquette est contrôlé par
le formulaire et n'est **pas envoyé** à l'API (`RegisterRequest` = email, mot de passe).
**Écarté :** l'envoyer et le comparer côté serveur.
**Pourquoi :** il protège l'utilisateur d'une faute de frappe, ce n'est pas une règle
de sécurité. Un client qui appelle l'API directement choisit son mot de passe en
connaissance de cause.

---

## 2026-10-07 — Erreurs de formulaire, absentes des maquettes

**Décidé :**
- erreur renvoyée par le serveur (email déjà pris, identifiants refusés) : callout
  rouge du design system, annoncé aux lecteurs d'écran (`role="alert"`)
- erreur de champ : texte rouge en 14 px sous le champ, relié à celui-ci
  (`aria-describedby`), affiché quand on quitte le champ ou à l'envoi
- bouton d'envoi **toujours actif**

**Écarté :** bouton désactivé tant que le formulaire est invalide ; erreur affichée à
chaque frappe.
**Pourquoi :** comble l'écart n° 5 relevé dans les maquettes (aucun état d'erreur
d'authentification), avec les composants existants. Un bouton désactivé n'explique pas
ce qui manque et sort de la navigation au clavier. Une erreur à chaque frappe signale
« email invalide » dès la première lettre.
**Conséquence assumée :** différent de l'écran de téléchargement protégé, où la
maquette désactive le bouton. À trancher avec US02 : harmoniser ou garder l'écart.

---

## 2026-10-07 — Nommage des classes back : suffixe par rôle

**Décidé :** chaque classe porte le suffixe de son rôle : `RegisterRequestDTO`,
`AuthService`, `AuthController`, `AccountRepository`, `…Mapper`. Les entités restent
sans suffixe (`Account`, `SharedFile`), comme au P2.
**Écarté :** DTO sans suffixe (`RegisterRequest`), comme dans `openapi.yaml`.
**Pourquoi :** la recherche de fichier dans l'IDE trouve toute une couche en tapant
son suffixe, et le rôle d'une classe se lit dans son nom.
**Conséquence assumée :** le nom Java d'un DTO diffère de son schéma OpenAPI (suffixe en
plus) ; la correspondance est notée dans `contrat-interface.md`.

---

## 2026-10-07 — Package de base : `io.github.younesyousfipro.datashare`

**Décidé :** `groupId` `io.github.younesyousfipro`, package `io.github.younesyousfipro.datashare`,
à la place de `com.openclassrooms`, repris du P2 à la génération du socle.
**Écarté :** `com.openclassrooms` (laisse croire à un code fourni par OpenClassrooms,
alors que le P3 n'a aucun code de départ) ; `com.datashare` (domaine que l'on ne
possède pas).
**Pourquoi :** la convention Java fait commencer le package par un domaine que l'on
contrôle, écrit à l'envers. Le dépôt est publié sur le compte GitHub
`younesyousfipro`, qui donne le domaine `younesyousfipro.github.io` : c'est le préfixe
qu'accepte Maven Central pour un compte GitHub.
**Conséquence assumée :** renommage fait avant l'entité `Account`, quand il ne touchait
que quatre classes.

---

## 2026-10-08 — Gestionnaire d'erreurs : hériter de `ResponseEntityExceptionHandler`

**Décidé :** `RestExceptionHandler` hérite de `ResponseEntityExceptionHandler` et
surcharge `handleExceptionInternal` pour rendre **toutes** les erreurs au format
`ErrorDetailsDTO`. Les erreurs de validation listent les champs refusés, **jamais la
valeur saisie**.
**Écarté :** une classe autonome, sans héritage (prévu au plan d'US03) ; garder le
format `ProblemDetail` de Spring pour ses propres erreurs.
**Pourquoi :** sans héritage, les erreurs techniques de Spring (JSON mal formé, méthode
non supportée, route inconnue) tombent dans le cas général et deviennent des `500`.
Spring connaît déjà le bon code de chacune ; on ne change que la forme du corps. Un
seul format évite au front deux cas à traiter. La valeur refusée peut être un mot de
passe : ni réponse ni log ne la contiennent.
**Conséquence assumée :** dépend des méthodes à surcharger de Spring ; à vérifier à
chaque montée de version majeure (`MAINTENANCE.md`).
