# Maintenance

## L'essentiel

| | |
|---|---|
| **Fréquence** | scan des dépendances chaque semaine, sans attendre pour une faille critique ; versions de correction chaque mois ; versions majeures sur une branche dédiée |
| **Procédure** | branche → scan → tri des failles → mise à jour → tests et budget du front → nouveau scan → PR ([Procédure](#procédure)) |
| **Risques surveillés** | régression, paquet piégé, version forcée oubliée, migration majeure trop lourde, front alourdi, disque rempli par les logs ([Risques](#risques)) |
| **En suspens** | retirer les versions forcées de Tomcat et Jackson au passage à Spring Boot 4.1.2 ([En suspens](#en-suspens)) |
| **Versions livrées** | marquées par un tag git, `v0.1.0` pour le prototype ([Versions](#versions)) |

Comment garder les dépendances de DataShare à jour sans casser l'application, analyser
la qualité de son code et exploiter ses logs. Résultats du dernier scan :
[`SECURITY.md`](SECURITY.md).

**Sommaire** : [Fréquence](#fréquence) · [Risques](#risques) · [Procédure](#procédure) ·
[En suspens](#en-suspens) · [Versions](#versions) · [Ce qu'on maintient](#ce-quon-maintient) ·
[Qualité du code](#qualité-du-code-sonarqube) · [Logs](#logs)

## Fréquence

| Quand | Quoi |
|---|---|
| chaque semaine | scan des dépendances (étapes 2 et 3 de la procédure) |
| dès qu'une faille CRITICAL touche une de nos briques | scan et correction sans attendre |
| chaque mois | versions de correction (dernier chiffre : 4.1.1 → 4.1.2) |
| à chaque version majeure (Angular, Spring Boot, Java) | branche dédiée, en suivant le guide de migration officiel |
| chaque semaine | lecture des logs : erreurs `5xx`, fichiers orphelins ([Logs](#logs)) |
| à la fin de chaque chantier, avant la PR | analyse SonarQube : 0 remarque ouverte ([Qualité du code](#qualité-du-code-sonarqube)) |

## Risques

| Risque | Parade |
|---|---|
| **régression** : une mise à jour change un comportement | tests unitaires, d'intégration et E2E à chaque montée de version ; une version majeure à la fois |
| **paquet piégé** (attaque de la chaîne d'approvisionnement) | `npm ci` et le lockfile : pas de version inattendue ; scripts d'installation bloqués sauf autorisation (`allowScripts`) ; Trivy figé par son empreinte ; ne pas adopter une version publiée depuis moins d'une semaine (le temps qu'un piège soit repéré) |
| **version forcée oubliée** dans `pom.xml` | commentaire à côté, et rubrique [En suspens](#en-suspens) |
| **mise à jour majeure trop lourde** (migration Angular ou Spring Boot) | guide de migration officiel, branche dédiée, ne pas sauter de version majeure |
| **front alourdi** par une nouvelle dépendance | budget de build (`front/angular.json`) : avertissement à 420 kB, échec à 520 kB |
| **disque rempli par les logs** | rotation automatique ([Logs](#logs)) ; en production, plafond de taille total (`logging.logback.rollingpolicy.total-size-cap`) |
| **dette qui s'accumule** sans que personne la voie | analyse SonarQube avant chaque PR ; en CI, une *quality gate* bloquante ([`perspectives.md`](docs/perspectives.md)) |
| **scan oublié** (rien n'est automatisé) | fréquence ci-dessus ; automatisation dans [`perspectives.md`](docs/perspectives.md) |

## Procédure

**1. Branche** : `chore/deps-<date>`, ou `fix/...` pour corriger une faille.

**2. Scan du front** (depuis `front/`) :

```bash
npm audit                # tout le front
npm audit --omit=dev     # seulement ce qui part dans le navigateur
```

**3. Scan du back, du front et des secrets** (depuis la racine du dépôt). Compiler le
back avant (`./mvnw verify`) : Trivy lit les `pom` de Spring Boot dans le cache Maven
(`~/.m2`) ; sans lui, il les demande à Maven Central, qui bloque l'adresse IP pour
30 minutes au-delà de quelques dizaines de requêtes (erreur `429`).

```bash
docker run --rm \
  -v ~/.m2:/root/.m2:ro \
  -v "$PWD":/src:ro \
  -v trivy-cache:/root/.cache/trivy \
  aquasec/trivy@sha256:af6acf9a6b85dfe389a1941505c0ce9efef52a4719635e1a962f022a3d855daa \
  fs --scanners vuln,secret --include-dev-deps \
     --skip-dirs "**/node_modules" --skip-dirs "**/target" --skip-dirs "**/coverage" \
     --skip-dirs "**/.angular" --skip-dirs "**/uploads" \
     /src
```

<details>
<summary>Rôle de chaque option</summary>

| Option | Rôle |
|---|---|
| `:ro` | dépôt et cache Maven en lecture seule : Trivy ne peut rien modifier |
| `trivy-cache` | garde la base de failles entre deux scans |
| `@sha256:…` | l'image exacte de Trivy 0.75.0, jamais une version plus récente prise d'office |
| `--include-dev-deps` | analyse aussi les outils de dev du front, ignorés par défaut |
| `--skip-dirs` | ignore les dossiers générés : moins de bruit pour la recherche de secrets |

</details>

**4. Tri** : pour chaque faille, trois questions : la bibliothèque part-elle en
production ? la faille est-elle atteignable dans notre usage ? une version corrigée
existe-t-elle ? Décision et raison dans [`SECURITY.md`](SECURITY.md).

**5. Mise à jour**

| Cas | Commande ou geste |
|---|---|
| back, cas général | monter la version du parent Spring Boot : toutes les dépendances suivent |
| back, correctif urgent avant la version de Spring Boot | redéfinir la propriété de la bibliothèque dans `pom.xml` (ex. `tomcat.version`), avec un commentaire disant quand la retirer |
| front, versions de correction | `npm update`, qui reste dans les plages de `package.json` |
| front, version majeure d'Angular | `ng update @angular/core @angular/cli` |
| Cypress | après la mise à jour : `npm install-scripts approve cypress` |

**6. Tests** : `./mvnw verify` (back), `npm run test:coverage` et `npm run e2e`
(front) ; détail dans [`TESTING.md`](TESTING.md).

**6 bis. Budget du front** : `npm run build` doit passer **sans avertissement de budget**.
Sinon, une dépendance a fait grossir le bundle : `npm run build -- --stats-json` puis
l'analyseur d'esbuild montrent laquelle (détail dans [`PERF.md`](PERF.md#le-poids--le-bundle)).

**7. Nouveau scan** : 0 faille, ou une faille acceptée et justifiée dans `SECURITY.md`.

**8. Commit et PR** : `fix:` pour une faille, `chore:` pour une mise à jour de routine.

## En suspens

| Action | Quand |
|---|---|
| retirer `tomcat.version` et `jackson-bom.version` de `back/pom.xml` | au passage à Spring Boot 4.1.2 |
| passer Trivy et SonarQube (serveur, scanner) en version plus récente : relever la nouvelle empreinte sur Docker Hub | au prochain scan, sur une version publiée depuis plus d'une semaine |
| réanalyser le back avec SonarQube : la purge des fichiers expirés (PR #26) est arrivée après la dernière analyse | à la prochaine analyse |

## Versions

Chaque version livrée est marquée par un **tag git annoté**, numéroté selon le
versionnement sémantique (`MAJEURE.MINEURE.CORRECTIF`). Le tag sert de repère fixe : voir
ce qui a changé depuis (`git diff v0.1.0..main`), repartir de cette version
(`git switch -c fix/... v0.1.0`).

| Version | Contenu |
|---|---|
| `v0.1.0` | le prototype livré : US01 à US06, purge des fichiers expirés (US10 partielle). `0.x` : rien n'est encore figé, l'API peut changer |
| `v0.1.1` | correction : l'inscription refuse un email dont le domaine n'a pas de point (`marie@mail`) |

Poser le tag, sur `main` à jour, une fois la PR mergée :

```bash
git tag -a v0.1.0 -m "DataShare PoC: US01-06 and partial US10"
git push origin v0.1.0
```

Ensuite : `0.2.0` pour une nouvelle fonctionnalité, `0.1.1` pour une correction ; `1.0.0`
quand l'application sera mise en ligne et son API stable.

## Ce qu'on maintient

| Brique | Version | Où la changer | À savoir |
|---|---|---|---|
| Spring Boot | 4.1.1 | `back/pom.xml`, `<parent>` | fixe la version de toutes les dépendances du back |
| Java | 25 | `back/pom.xml`, `java.version` | version LTS |
| springdoc-openapi | 3.1.1 | `back/pom.xml`, `springdoc.version` | hors du parent Spring Boot : sa version majeure suit celle de Spring Boot (3.x pour Spring Boot 4) |
| Angular | 22.2 | `front/package.json` | une version majeure tous les 6 mois |
| Node.js | 24 | poste de dev ([`README.md`](README.md)) | version LTS |
| Cypress | 16.2 | `front/package.json` | script d'installation autorisé version par version |
| PostgreSQL | 18 | `back/compose.yaml` | image Docker |
| Trivy | 0.75.0 | commande de scan ([Procédure](#procédure)) | figé par son empreinte, mis à jour à la main |
| k6 | 2.3.0 | commande de test ([`PERF.md`](PERF.md)) | idem |
| nginx | 1.30.6 | commande de mesure Lighthouse ([`PERF.md`](PERF.md)) | idem |
| SonarQube Community Build | 26.9 | commande d'analyse ([Qualité du code](#qualité-du-code-sonarqube)) | idem |
| Scanner SonarQube du front | 12.2 | idem | idem |
| Plugin Maven SonarQube du back | 5.8 | `back/pom.xml`, `sonar-maven-plugin.version` | |

`package-lock.json` fixe la version exacte de chaque paquet du front ; `npm ci` installe
exactement celles-là.

## Qualité du code (SonarQube)

Résultat côté sécurité : [`SECURITY.md`](SECURITY.md#analyse-du-code-sonarqube) ; raisons
des choix : [`decisions.md`](docs/decisions.md).

| SonarQube mesure | Ce qu'on en fait |
|---|---|
| des remarques (*issues*), classées par qualité touchée : sécurité, fiabilité, maintenabilité | chacune est corrigée, ou justifiée dans l'outil |
| la dette technique : temps estimé pour corriger les remarques ouvertes | elle reste à 0 |
| la duplication : lignes copiées-collées | expliquée si elle n'est pas nulle |
| la complexité cognitive : difficulté à lire une fonction | aucune au-dessus de 15, le seuil de SonarQube |
| la couverture | **SonarQube ne la calcule pas** : il affiche les rapports de JaCoCo et de Vitest ([`TESTING.md`](TESTING.md#couverture)) |

### Résultats (17 octobre 2026)

Analyse antérieure à la purge des fichiers expirés (PR #26) : ce code n'a pas encore été
analysé (voir [En suspens](#en-suspens)).

| | Back | Front |
|---|---|---|
| Remarques ouvertes, avant → après | 19 → 0 | 15 → 0 |
| Dette technique, avant → après | 102 min → 0 | 58 min → 0 |
| Duplication | 0 % | 3 % |
| Complexité la plus haute | 12 (`FileService`) | 12 (`download.ts`) |
| Couverture | 96,3 % | 98,9 % |

**34 remarques : 24 corrigées, 10 justifiées.**

| Corrigé | Comment |
|---|---|
| **un vrai défaut** : l'horodatage des erreurs partait sans fuseau (`10:15:30`), seule date de l'API sans `Z` | `Instant` (UTC) ; un test vérifie le `Z` |
| 13 tests qui pouvaient passer pour une mauvaise raison | l'argument est préparé avant `assertThatThrownBy`, qui ne contient plus que l'appel testé |
| 10 remarques de lisibilité | ternaires imbriqués, `throws` inutile, `Set` plutôt qu'un tableau, `toHaveLength` |

| Accepté (dette assumée) | Raison |
|---|---|
| CSRF désactivé (1) | [`SECURITY.md`](SECURITY.md#la-remarque-de-sécurité--csrf-désactivé) |
| `role="status"` et `role="group"` plutôt que `<output>` et `<fieldset>` (8) | rôles ARIA valides et bien lus par les lecteurs d'écran (accessibilité Lighthouse : 100), sur lesquels Cypress s'appuie ; `<output>` est prévu pour le résultat d'un calcul, `<fieldset>` pour des champs de formulaire. À revoir lors de la revue de l'interface |
| champ fichier sans label (1, faux positif) | il porte `hidden`, donc hors de l'arbre d'accessibilité ; ce sont les boutons visibles qui ouvrent le sélecteur |
| duplication de 3 % (une mesure, pas une remarque) | 27 lignes communes à `login.html` et `register.html` : deux pages qui évolueront séparément, un composant commun serait de la sur-ingénierie |

<details>
<summary>Lancer une analyse SonarQube</summary>

**1. Serveur**, une fois ; le port n'est ouvert que sur la machine :

```bash
docker run -d --name sonarqube -p 127.0.0.1:9000:9000 \
  sonarqube:26.9.0.129388-community@sha256:c0f1160bccfa435db4168c2d7df69af3c3ea7bfeb87395613014048fb33a68c1
curl -s http://localhost:9000/api/system/status   # attendre "status":"UP", 1 à 2 min
```

**2. Premier lancement** : http://localhost:9000, `admin` / `admin`, nouveau mot de passe
imposé. Puis *My Account* → *Security* → un token de type **Global Analysis Token**
(30 jours) : il ne sert qu'à envoyer des analyses.

**3. Token dans le terminal**, sans trace dans l'historique (à refaire dans chaque
nouveau terminal) :

```bash
read -s SONAR_TOKEN && export SONAR_TOKEN
```

**4. Back** (depuis `back/`) ; `verify` régénère le rapport de couverture juste avant :

```bash
./mvnw verify sonar:sonar
```

**5. Front** (depuis `front/`) :

```bash
npm run test:coverage   # produit coverage/datashare/lcov.info, lu par SonarQube
docker run --rm --platform linux/amd64 \
  --network container:sonarqube \
  -e SONAR_TOKEN \
  -v "$PWD:/usr/src:ro" \
  sonarsource/sonar-scanner-cli:12.2.0.4256_8.1.0@sha256:a3f4215076706c95a17a68c19322ee916e40a3acd081a8c1a1e839e0194afa57 \
  -Dsonar.working.directory=/tmp/scannerwork
```

| Option | Rôle |
|---|---|
| `--network container:sonarqube` | le scanner partage le réseau du serveur : `localhost:9000` désigne bien SonarQube, et non le conteneur du scanner |
| `-e SONAR_TOKEN` | sans valeur : Docker reprend la variable du terminal, le token n'apparaît pas dans la commande |
| `:ro` et `sonar.working.directory` | code en lecture seule ; les fichiers de travail du scanner restent dans le conteneur, effacé à la fin |

**6. Lire** : *Projects*, puis l'onglet *Issues* de chaque projet ; *Why is this an
issue?* explique chaque règle. Une remarque non corrigée est marquée *Accept* ou
*False Positive*, avec sa raison en commentaire.

**7. Arrêter** : `docker stop -t 60 sonarqube` libère la mémoire (environ 2 Go) ; sans
`-t 60`, Docker le tue au bout de 10 s, avant qu'il ait fermé sa base (code `137`).
`docker start sonarqube` reprend avec les analyses et les décisions ; **`docker rm` les
efface**.

Configuration versionnée : propriétés `sonar.*` de `back/pom.xml`,
`front/sonar-project.properties`. Pendant l'écriture du code, l'extension *SonarQube for
IDE* de VS Code applique les mêmes règles.

</details>

<details>
<summary>Pièges rencontrés</summary>

| Piège | Parade |
|---|---|
| sans `sonar.host.url`, les scanners récents visent SonarQube Cloud : au premier essai, le token local y a été envoyé (et refusé) | URL du serveur écrite dans `pom.xml` et `sonar-project.properties` |
| le token d'analyse ne peut pas lire l'API (export des remarques en JSON) | lire avec le compte `admin` : `curl -u admin "http://localhost:9000/api/issues/search?components=datashare-back&ps=500"` |
| image du scanner front publiée en amd64 seulement | `--platform linux/amd64` : émulée sur un Mac Apple Silicon, plus lente |
| la *quality gate* par défaut juge le **nouveau** code | à la première analyse, « Passed » ne prouve rien : lire les remarques |

</details>

## Logs

| | |
|---|---|
| Fichier | `back/logs/datashare.log`, une ligne JSON par événement ; chemin modifiable par `LOG_FILE` (`back/.env`) |
| Rotation | automatique (Spring Boot) : nouveau fichier à 10 Mo, archives gardées 7 jours |
| Logs des tests | `back/target/test-logs/`, effacés par `mvn clean` |
| Analyse | `./perf/analyze-logs.sh` depuis la racine (détail dans [`PERF.md`](PERF.md#logs-structurés-et-suivi-des-métriques)) |

**Vider le log sans arrêter le back : `: > back/logs/datashare.log`, jamais `rm`.**
Logback garde le fichier ouvert : `rm` ne retire que son nom, le back continue d'écrire
dans un fichier devenu invisible, et le disque n'est pas libéré. `: >` vide le contenu en
gardant le fichier. Après un `rm` par erreur, redémarrer le back recrée le fichier.

**Corriger un fichier orphelin** (effacé de la base, resté sur le disque après une panne
du disque, voir [`architecture.md`](docs/conception/architecture.md#cohérence-entre-disque-et-base)) :

1. `./perf/analyze-logs.sh` : la rubrique *Orphan files* liste leurs identifiants.
2. Supprimer chacun dans le dossier de stockage, où il porte son identifiant pour nom :
   `rm back/uploads/<fileId>`.
3. Si un orphelin revient souvent, chercher la cause (droits, disque plein) dans la trace
   d'erreur de la même ligne de log.
