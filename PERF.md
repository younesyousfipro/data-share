# Performance

## L'essentiel

| Mesure | Résultat | Objectif |
|---|---|---|
| **Upload sous charge** (k6, 10 utilisateurs simultanés, fichiers de 1 Mo) | 95 % des uploads en **31 ms**, 0 erreur | moins de 1 s, moins de 1 % d'erreurs |
| **Poids du front** (code chargé avant le premier affichage) | **91 kB** compressés, environ 0,5 s en 4G lente | budget : alerte à 420 kB, échec à 520 kB (non compressé) |
| **Rapidité des pages** (Lighthouse, profil mobile) | score **98** (`/login`) et **99** (`/download`), affichage en moins de 2 s | ≥ 90 |
| **Suivi des métriques** | temps de réponse et taille de chaque fichier dans un log JSON, analysés par un script | — |

**Limite principale** : tout est mesuré sur le poste de développement. La capacité maximale
du serveur et le comportement avec de gros fichiers (jusqu'à 1 Go) ne sont pas mesurés.

Raison de chaque choix : [`decisions.md`](docs/decisions.md).

**Sommaire** : [Test de charge](#test-de-charge-de-lupload-k6) ·
[Budget front](#budget-de-performance-front) ·
[Logs et métriques](#logs-structurés-et-suivi-des-métriques) ·
[Pistes d'optimisation](#pistes-doptimisation)

## Test de charge de l'upload (k6)

`POST /api/files` est l'endpoint le plus coûteux : chaque requête vérifie le JWT, reçoit le
fichier, l'écrit sur le disque et enregistre sa fiche en base.

| | |
|---|---|
| Script | [`perf/upload.js`](perf/upload.js) |
| Fichier envoyé | 1 Mo, le même à chaque requête |
| Charge | montée de 0 à 10 utilisateurs simultanés en 10 s, 30 s à 10, descente en 10 s |
| Un utilisateur virtuel | envoie un fichier, attend 1 s, recommence |
| Préparation et nettoyage | un compte neuf par exécution ; ses fichiers sont supprimés à la fin |
| Seuils (le test échoue au-delà) | 95 % des uploads en moins de **1 s** · moins de **1 %** d'erreurs |

Pourquoi 1 s : en dessous, l'utilisateur garde le fil de ce qu'il fait (Jakob Nielsen,
*Response Times: The 3 Important Limits*).

### Résultats

Mesure du 2026-10-16, k6 2.3.0, sur le poste de développement (macOS).

| Mesure | Valeur |
|---|---|
| Uploads envoyés | 400, en 53 s |
| Erreurs | **0** |
| Temps de réponse : médiane / 95 % / maximum | 22 ms / **31 ms** / 95 ms |
| Débit | 7,6 uploads par seconde, 8 Mo/s |
| Seuils | tous deux respectés |

![Rapport k6 : temps de réponse, débit, erreurs et attente au fil du test](docs/captures/perf-upload.png)

**Lecture des graphiques** :
- **Request Rate** : la charge monte, reste stable à environ 10 requêtes par seconde, puis
  redescend, comme prévu.
- **Request Duration** : entre 20 et 35 ms pendant tout le plateau. Le pic de 90 ms au
  début vient des premières requêtes : création du compte de test (BCrypt est
  volontairement lent) et serveur qui vient de démarrer.
- **Request Failed Rate** : 0 % du début à la fin.
- **Request Waiting** : presque égal au temps de réponse : le temps est passé côté
  serveur, le réseau ne compte presque pas (tout tourne sur la même machine).

**Conclusion** : à 10 utilisateurs simultanés, un upload de 1 Mo prend environ 30 ms, sans
erreur, 30 fois sous le seuil.

### Limites

| Limite | Conséquence |
|---|---|
| k6, le back et PostgreSQL sur la même machine | ils se partagent processeur et disque : chiffres à lire comme des ordres de grandeur |
| Serveur pas poussé à bout | chaque utilisateur attend 1 s entre deux envois de 20 ms : le débit est fixé par cette pause. La capacité maximale n'est **pas** mesurée |
| Fichiers de 1 Mo seulement (limite : 1 Go) | gros fichiers non mesurés ; chaque fichier est écrit deux fois sur le disque (fichier temporaire de Tomcat, puis copie) |
| Pas de réseau réel | sur une connexion à 10 Mbit/s, ce fichier met 0,8 s à partir : en vrai, c'est le réseau de l'utilisateur qui fixe la durée |
| Téléchargement non testé | le fichier téléchargé tient entier dans la mémoire du navigateur (jusqu'à 1 Go) ; k6 ne le mesure pas |

<details>
<summary>Relancer le test</summary>

Le back doit tourner (voir [`README.md`](README.md)) ; k6 tourne dans Docker, l'image est
téléchargée au premier lancement. Depuis la racine du dépôt :

```bash
mkdir -p ../perf-reports
docker run --rm \
  -v "$PWD/perf:/scripts:ro" \
  -v "$PWD/../perf-reports:/results" \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_EXPORT=/results/upload-report.html \
  grafana/k6@sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34 \
  run /scripts/upload.js
```

| Option | Rôle |
|---|---|
| `perf:/scripts:ro` | le script, en lecture seule |
| `../perf-reports` | rapport HTML (graphiques), écrit **hors du dépôt** : il se régénère à chaque lancement |
| `@sha256:…` | l'image exacte de k6 2.3.0, jamais une version plus récente prise d'office |

Vérification rapide avant la vraie charge (1 utilisateur, 3 envois) : ajouter
`--vus 1 --iterations 3` entre `run` et `/scripts/upload.js`.

Résultat : résumé dans le terminal, section `THRESHOLDS` en tête ; un seuil dépassé donne
un code de sortie non nul, ce qui ferait échouer un pipeline CI.

</details>

## Budget de performance front

Avant d'afficher une page, le navigateur télécharge l'application (JavaScript, styles,
police) puis l'exécute. Le **budget de performance** est une limite de poids fixée à
l'avance : chaque build vérifie qu'on reste en dessous, pour que l'application ne
s'alourdisse pas sans que personne ne s'en aperçoive.

| | Question | Outil |
|---|---|---|
| **Le poids** | combien envoie-t-on au navigateur ? | le build Angular et son budget |
| **L'attente** | combien de temps attend un visiteur, sur téléphone ? | Lighthouse, intégré à Chrome |

### Le poids : le bundle

Le *bundle* est ce que produit `npm run build` dans `front/dist/` : le code compacté et
regroupé que télécharge le navigateur.

![Sortie de npm run build : tailles des fichiers initiaux](docs/captures/perf-bundle.png)

**Résultat** (2026-10-16, Angular 22.2) :

| Fichier | Sur le disque (`Raw size`) | Sur le réseau (`Estimated transfer size`) |
|---|---|---|
| JavaScript (`main-….js`) | 343 kB | 90 kB |
| Styles (`styles-….css`) | 6 kB | 1 kB |
| **Total initial** | **348 kB** | **91 kB** |
| Police DM Sans (hors tableau Angular) | 28 kB | 28 kB |

- **91 kB, c'est environ 0,5 s** de téléchargement en 4G lente (environ 180 kB/s).
- **Un seul fichier JavaScript** : Angular et les 5 pages arrivent ensemble.
- **La police** : sur les 8 fichiers de `dist/media/`, le navigateur n'en télécharge que 2
  (normal et gras, alphabet latin).

**Les seuils** (`front/angular.json`, budget `initial`, taille sur le disque) :

| Seuil | Valeur | Au build |
|---|---|---|
| Avertissement | **420 kB** (taille mesurée + 20 %) : une évolution normale, on vérifie | le build passe, avec un message `exceeded maximum budget` |
| Erreur | **520 kB** (taille mesurée + 50 %) : presque toujours une grosse librairie ajoutée sans y penser | le build **échoue** |

Les valeurs par défaut d'Angular (500 kB et 1 MB) auraient laissé l'application tripler de
poids sans alerte.

<details>
<summary>Si le budget saute : trouver ce qui pèse</summary>

Depuis `front/` :

```bash
npm run build -- --stats-json
```

Puis déposer `dist/datashare/stats.json` sur
[esbuild.github.io/analyze](https://esbuild.github.io/analyze/) : chaque librairie
apparaît comme un rectangle proportionnel à son poids.

</details>

### L'attente : Lighthouse

Lighthouse charge une page en se faisant passer pour un visiteur, chronomètre chaque étape
et donne une note sur 100.

| Réglage | Choix | Pourquoi |
|---|---|---|
| Profil | **mobile** : 4G lente simulée, processeur ralenti 4 fois | le pire cas : rapide ici, rapide sur ordinateur |
| Pages | `/login` et `/download/:id` | la porte d'entrée de tout utilisateur ; la page d'un destinataire qui n'a jamais vu le site |
| Catégories | Performance, Accessibilité | SEO écarté : on entre dans DataShare par un compte ou un lien, pas par Google |
| Serveur | le build, servi par nginx | on mesure ce qu'on livrerait (voir plus bas) |

**Résultats** (2026-10-16, Lighthouse 13.4, Chrome, navigation privée) :

| Mesure | Ce qu'elle dit | `/login` | `/download/:id` | « Bon » selon Google |
|---|---|---|---|---|
| **Score Performance** | synthèse des mesures ci-dessous | **98** | **99** | ≥ 90 |
| First Contentful Paint | l'écran n'est plus blanc | 1,8 s | 1,7 s | ≤ 1,8 s |
| Largest Contentful Paint | le contenu principal est affiché | 2,0 s | 1,9 s | ≤ 2,5 s |
| Total Blocking Time | la page est « gelée » | 0 ms | 10 ms | ≤ 200 ms |
| Cumulative Layout Shift | des éléments bougent pendant le chargement | 0 | 0,039 | ≤ 0,1 |
| Poids téléchargé | tout compris (HTML, JS, CSS, police) | 151 kB | 151 kB | — |

![Lighthouse sur /login : Performance 98, Accessibilité 100](docs/captures/perf-lighthouse-login.png)

![Lighthouse sur /download : Performance 99, Accessibilité 100](docs/captures/perf-lighthouse-download.png)

**Lecture** :
- Sur un téléphone lent en 4G médiocre, la page s'affiche **en moins de 2 s**, ne se fige
  jamais, et rien ne saute à l'écran.
- Le léger décalage sur `/download` (0,039) : la carte du fichier n'apparaît qu'une fois
  que l'API a répondu, et elle pousse un peu la mise en page.
- 151 kB et non 91 kB : nginx compresse au niveau le plus rapide, et la police s'ajoute.
- Accessibilité : **100** sur les deux pages.

**Limites** : 4G et téléphone simulés (ordres de grandeur) ; mesure manuelle sur deux pages,
à refaire après une évolution du front ; le score peut varier de quelques points d'un
lancement à l'autre.

<details>
<summary>Pourquoi mesurer le build et pas le serveur de dev</summary>

La première mesure, faite sur `ng serve`, donnait un score de **55** et **12 s** avant le
premier affichage. Ce serveur est conçu pour le développement : code lisible, ni compacté
ni compressé, plus son outil de rechargement automatique.

| Même page `/login` | Serveur de dev (`ng serve`) | Build servi par nginx |
|---|---|---|
| Poids téléchargé | 2 100 kB | **151 kB** |
| Premier affichage | 11,9 s | **1,8 s** |
| Score | 55 | **98** |

Même code, seul le serveur change. On mesure donc ce qu'on livrerait : `front/dist/` servi
par nginx dans Docker ([`perf/nginx.conf`](perf/nginx.conf)), relié au vrai back.

```
Navigateur ──► nginx (Docker, http://localhost:4300)
                ├─ /main-….js, /styles-….css  → fichiers de front/dist/, compressés
                ├─ /login, /download/…        → index.html : Angular affiche la bonne page
                └─ /api/…                     → back Spring Boot (port 8080) → PostgreSQL
```

</details>

<details>
<summary>Relancer la mesure Lighthouse</summary>

Le back doit tourner (voir [`README.md`](README.md)), et `ng serve` doit être arrêté.

1. Build, depuis `front/` : `npm run build`.
2. nginx, depuis la racine du dépôt :

   ```bash
   docker run --rm -p 4300:80 \
     -v "$PWD/perf/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
     -v "$PWD/front/dist/datashare/browser:/usr/share/nginx/html:ro" \
     nginx:1.30.6-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5
   ```

   | Option | Rôle |
   |---|---|
   | `-p 4300:80` | le site répond sur `http://localhost:4300` |
   | `nginx.conf` | notre configuration, en lecture seule (`:ro`) |
   | `dist/datashare/browser` | les fichiers du build, en lecture seule |
   | `@sha256:…` | l'image exacte de nginx 1.30.6, jamais une version plus récente prise d'office |

3. Chrome, **fenêtre de navigation privée** (les extensions faussent la mesure), page
   `http://localhost:4300/login`, puis le lien de partage d'un fichier uploadé.
4. Outils de développement (`Cmd + Option + I`) → onglet **Lighthouse** → Mode
   *Navigation*, Device *Mobile*, catégories *Performance* et *Accessibility* →
   **Analyze page load**.
5. Enregistrer le rapport (menu `⋮` → *Save as HTML*) **hors du dépôt**, dans
   `../perf-reports/`.

</details>

## Logs structurés et suivi des métriques

**Le but** : garder une trace exploitable de ce que fait l'application quand personne ne
regarde, pour répondre après coup à des questions chiffrées (« l'upload est lent depuis
hier », « quel volume transitez-vous ? »). Les tests prouvent que l'application marche
avant la livraison ; les logs disent comment elle se comporte en service.

Chaque information est un **champ nommé** dans une ligne JSON (format ECS), et non une
phrase à découper :

| Question | Répondue grâce à | Écrit par |
|---|---|---|
| Combien de temps prend un upload ? Lequel est le plus lent ? | `durationMs` de chaque requête | `RequestLoggingFilter` |
| Combien de 401, de 500 aujourd'hui ? | `status` de chaque requête | `RequestLoggingFilter` |
| Quel volume uploadé, téléchargé ? Quelle taille moyenne ? | `sizeBytes` de chaque événement fichier | `FileService` |
| Qu'est-il arrivé au fichier `3f2a…` ? | `fileId` de chaque événement fichier | `FileService` |

Ce qui n'est **jamais** journalisé : [`SECURITY.md`](SECURITY.md#journalisation).

<details>
<summary>Comment ça marche : du code au fichier de log</summary>

```
Requête HTTP ──► RequestLoggingFilter ──► Controller ──► FileService
                 1 ligne par requête                     1 ligne par upload, download, delete
                 method, path, status, durationMs        action, fileId, sizeBytes, accountId
                        │                                       │
                        └───────────────┬───────────────────────┘
                                        ▼
                             Logback (fourni par Spring Boot)
                  console : texte lisible       back/logs/datashare.log : JSON (format ECS)
```

| Qui | Rôle |
|---|---|
| **notre code** (filtre, `FileService`) | crée l'événement et le remplit : `log.atInfo().addKeyValue("durationMs", …)` |
| **SLF4J** | le guichet : reçoit l'événement, sans savoir où il ira |
| **Logback** | l'imprimeur : l'écrit |
| **`application.properties`** | dit à Logback comment et où : console en texte, fichier en JSON |

**Le code dit quoi journaliser, la configuration dit comment et où.** Changer de format ou
de destination ne touche pas au code.

Deux lignes réelles du fichier (champs ECS techniques retirés) :

```json
{"@timestamp":"2026-10-17T15:30:55.040Z","log":{"level":"INFO"},"message":"File 0fb4e931-…: upload (1048576 bytes)","action":"upload","fileId":"0fb4e931-…","sizeBytes":1048576,"accountId":28}
{"@timestamp":"2026-10-17T15:30:55.045Z","log":{"level":"INFO"},"message":"POST /api/files 201 44 ms","method":"POST","path":"/api/files","status":201,"durationMs":44}
```

| Champ | Contenu |
|---|---|
| `durationMs` | temps passé **dans le serveur**, de l'arrivée de la requête à la réponse, en millisecondes entières |
| `path` | chemin sans les paramètres d'URL (qui peuvent contenir une donnée sensible) |
| `action` | `upload`, `download` ou `delete` : stable, contrairement au message |
| `sizeBytes` | taille du fichier, en octets |
| `accountId` | propriétaire du fichier, y compris pour un téléchargement (le destinataire est anonyme) |

Exemple de question en une commande :

```bash
# temps moyen de l'upload
jq -s 'map(select(.path=="/api/files" and .method=="POST") | .durationMs) | add/length' back/logs/datashare.log
```

</details>

### La mesure

k6 mesure **depuis l'extérieur**, comme un chronomètre au bord de la piste ; les logs sont
la **boîte noire** : l'application note elle-même chaque requête. Pour vérifier la boîte
noire, on a fait rouler la voiture : k6 pour le **volume** (400 uploads et 400
suppressions), les 3 scénarios Cypress pour la **variété** (inscription, connexion ratée,
téléchargement, mauvais mot de passe), puis [`perf/analyze-logs.sh`](perf/analyze-logs.sh)
pour ramener les 1 654 lignes à quelques tableaux.

**Les logs sont fiables** : 400 uploads envoyés par k6, 400 dans les logs (plus 3 de
Cypress) ; 0 erreur pour k6, aucun `5xx` ; les seuls `401` et `403` sont ceux que Cypress
provoque exprès.

### Résultats

Mesure du 2026-10-17, poste de développement, k6 et Cypress lancés en même temps.

**Temps de réponse côté serveur** (ms)

| Endpoint | Requêtes | Médiane | 95 % | Max |
|---|---|---|---|---|
| `POST /api/files` (upload 1 Mo) | 403 | 18 | **30** | 97 |
| `DELETE /api/files/{id}` | 401 | 1 | 3 | 30 |
| `POST /api/auth/login` | 5 | 74 | — | 108 |
| `POST /api/auth/register` | 4 | 93 | — | 333 |
| `GET /api/files` | 3 | 26 | — | 32 |
| `POST /api/download/{id}` (fichier protégé) | 2 | 75 et 93 | — | — |
| `GET /api/download/{id}` (informations du fichier) | 1 | 8 | — | — |

Pas de 95 % sous une dizaine de requêtes : le chiffre ne voudrait rien dire.

**Statuts** : `200` × 9 · `201` × 407 · `204` × 401 · `401` × 1 · `403` × 1 · aucun `5xx`.

**Taille des fichiers**

| Action | Nombre | Volume total | Taille moyenne |
|---|---|---|---|
| upload | 403 | **400 Mo** | 1 Mo (400 × 1 Mo par k6, 3 × 24 octets par Cypress) |
| delete | 401 | 400 Mo | 1 Mo |
| download | 1 | 24 octets | fichier de test Cypress |

**Le chronomètre et la boîte noire, sur le même upload**

| Upload 1 Mo | Médiane | 95 % | Max |
|---|---|---|---|
| vu par k6 (client) | 22 ms | 36 ms | 102 ms |
| vu par le filtre (serveur) | 18 ms | 30 ms | 97 ms |
| écart = trajet réseau | ~4 ms | ~6 ms | ~5 ms |

**Lecture** :
1. **L'upload reste rapide sous charge** : 30 ms pour 95 % des envois.
2. **Les opérations les plus lentes hachent un mot de passe** (75 à 100 ms) : connexion,
   inscription, téléchargement protégé. C'est voulu : BCrypt est lent pour freiner les
   attaques par force brute.
3. **Les uploads les plus lents** (97 et 80 ms) tombent pendant les inscriptions de
   Cypress, qui se partageaient le processeur avec BCrypt : concordance, pas preuve.
4. **La première requête** (333 ms) est lente parce que le serveur vient de démarrer.
5. **En cas de lenteur signalée**, comparer chronomètre et boîte noire dit où chercher :
   serveur rapide → réseau ; serveur lent → code, disque ou base.

**Limites** : un seul téléchargement mesuré ; réseau local (en vrai, l'envoi de 1 Mo dure
bien plus que les 30 ms du serveur) ; millisecondes entières ; k6 et Cypress se gênent un
peu ; le script relit tout le fichier, ce qui convient à un prototype, pas à des millions de
lignes. En production, les logs partent vers un outil de collecte (Grafana Loki, Elastic)
qui garde l'historique, trace les tableaux de bord et déclenche les alertes ; le format ECS
y est lu sans configuration ([`perspectives.md`](docs/perspectives.md)).

<details>
<summary>Relancer l'analyse des logs</summary>

Depuis la racine du dépôt (`jq` requis, installé d'office sur macOS récent) :

```bash
./perf/analyze-logs.sh                      # back/logs/datashare.log par défaut
./perf/analyze-logs.sh autre-fichier.log    # un autre log, ex. celui des tests
```

Pour une mesure propre :

1. Vider le log, **back lancé** : `: > back/logs/datashare.log` (jamais `rm`, voir
   [`MAINTENANCE.md`](MAINTENANCE.md#logs)).
2. Générer du trafic : k6 ([Relancer le test](#test-de-charge-de-lupload-k6)), puis
   `npm run e2e` depuis `front/` (front lancé).
3. Lancer le script.

Les tests automatisés (`./mvnw verify`) écrivent dans `back/target/test-logs/`, jamais dans
le log de l'application.

</details>

## Pistes d'optimisation

Aucune n'est mise en place : les mesures sont déjà largement sous les objectifs. En
conditions réelles, le goulot sera le réseau de l'utilisateur, pas le serveur : les pistes
utiles portent sur le **trajet des fichiers**, pas sur le code.

| Constat mesuré | Piste | Gain | Quand |
|---|---|---|---|
| Fichier uploadé écrit deux fois sur le disque, et traversant l'API | upload direct vers un stockage objet (URL signée) | l'API ne porte plus les octets | gros fichiers, uploads nombreux |
| Fichier téléchargé entier en mémoire du navigateur | URL de téléchargement signée : le navigateur écrit directement sur le disque | mémoire, mobile | gros fichiers |
| BCrypt : 75 à 100 ms, l'opération la plus coûteuse | **ne pas** baisser son coût (c'est la protection) ; limiter le débit de `/api/auth` au reverse proxy | les uploads gardent le processeur | toute mise en ligne |
| Première requête lente (333 ms) | n'envoyer le trafic qu'une fois le serveur prêt (sonde de santé d'Actuator) | — | déploiement |
| Code des pages non visitées chargé à l'arrivée (environ 50 kB) | chargement des pages à la demande (*lazy loading*) | environ 0,25 s en 4G lente | quand l'application grossit : le budget l'annoncera |
| Fichiers du front retéléchargés à chaque visite | cache navigateur, configuré sur le serveur | 2e visite quasi instantanée | au déploiement |
| nginx compresse au plus rapide | compression plus forte (gzip renforcé ou Brotli) | environ 30 kB | au déploiement |
