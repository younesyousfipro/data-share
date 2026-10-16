# Maintenance

Comment garder les dépendances de DataShare à jour sans casser l'application.
Résultats du dernier scan : [`SECURITY.md`](SECURITY.md).

**Sommaire** : [Ce qu'on maintient](#ce-quon-maintient) · [Fréquence](#fréquence) ·
[Procédure](#procédure) · [Risques](#risques) · [En suspens](#en-suspens)

## Ce qu'on maintient

| Brique | Version | Où la changer | À savoir |
|---|---|---|---|
| Spring Boot | 4.1.1 | `back/pom.xml`, `<parent>` | fixe la version de toutes les dépendances du back |
| Java | 25 | `back/pom.xml`, `java.version` | version LTS |
| Angular | 22.2 | `front/package.json` | une version majeure tous les 6 mois |
| Node.js | 24 | poste de dev ([`README.md`](README.md)) | version LTS |
| Cypress | 16.2 | `front/package.json` | script d'installation autorisé version par version |
| PostgreSQL | 18 | `back/compose.yaml` | image Docker |
| Trivy | 0.75.0 | commande de scan (ci-dessous) | figé par son empreinte, mis à jour à la main |
| k6 | 2.3.0 | commande de test ([`PERF.md`](PERF.md)) | idem |
| nginx | 1.30.6 | commande de mesure Lighthouse ([`PERF.md`](PERF.md)) | idem |

`package-lock.json` fixe la version exacte de chaque paquet du front ; `npm ci` installe
exactement celles-là.

## Fréquence

| Quand | Quoi |
|---|---|
| chaque semaine | scan des dépendances (étapes 2 et 3 de la procédure) |
| dès qu'une faille CRITICAL touche une de nos briques | scan et correction sans attendre |
| chaque mois | versions de correction (dernier chiffre : 4.1.1 → 4.1.2) |
| à chaque version majeure (Angular, Spring Boot, Java) | branche dédiée, en suivant le guide de migration officiel |

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

| Option | Rôle |
|---|---|
| `:ro` | dépôt et cache Maven en lecture seule : Trivy ne peut rien modifier |
| `trivy-cache` | garde la base de failles entre deux scans |
| `@sha256:…` | l'image exacte de Trivy 0.75.0, jamais une version plus récente prise d'office |
| `--include-dev-deps` | analyse aussi les outils de dev du front, ignorés par défaut |
| `--skip-dirs` | ignore les dossiers générés : moins de bruit pour la recherche de secrets |

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

## Risques

| Risque | Parade |
|---|---|
| **régression** : une mise à jour change un comportement | tests unitaires, d'intégration et E2E à chaque montée de version ; une version majeure à la fois |
| **paquet piégé** (attaque de la chaîne d'approvisionnement) | `npm ci` et le lockfile : pas de version inattendue ; scripts d'installation bloqués sauf autorisation (`allowScripts`) ; Trivy figé par son empreinte ; ne pas adopter une version publiée depuis moins d'une semaine (le temps qu'un piège soit repéré) |
| **version forcée oubliée** dans `pom.xml` | commentaire à côté, et rubrique « En suspens » ci-dessous |
| **mise à jour majeure trop lourde** (migration Angular ou Spring Boot) | guide de migration officiel, branche dédiée, ne pas sauter de version majeure |
| **front alourdi** par une nouvelle dépendance | budget de build (`front/angular.json`) : avertissement à 420 kB, échec à 520 kB |
| **scan oublié** (rien n'est automatisé) | fréquence ci-dessus ; automatisation dans [`perspectives.md`](docs/perspectives.md) |

## En suspens

| Action | Quand |
|---|---|
| retirer `tomcat.version` et `jackson-bom.version` de `back/pom.xml` | au passage à Spring Boot 4.1.2 |
| passer Trivy en version plus récente : relever la nouvelle empreinte sur Docker Hub | au prochain scan, sur une version publiée depuis plus d'une semaine |
