# Performance

Mesures de performance du prototype. Raison de chaque choix :
[`decisions.md`](docs/decisions.md).

**Sommaire** : [Test de charge de l'upload](#test-de-charge-de-lupload-k6) ·
[Limites](#limites-de-la-mesure) · [Relancer le test](#relancer-le-test) ·
[Budget de performance front](#budget-de-performance-front) · suivi des métriques : à venir

## Test de charge de l'upload (k6)

### Ce qu'on teste

`POST /api/files`, l'upload : l'endpoint le plus coûteux de l'application. Chaque requête
vérifie le JWT, reçoit le fichier, l'écrit sur le disque et enregistre sa fiche en base.

| | |
|---|---|
| Script | [`perf/upload.js`](perf/upload.js) |
| Fichier envoyé | 1 Mo, le même à chaque requête |
| Charge | montée de 0 à 10 utilisateurs simultanés en 10 s, 30 s à 10, descente en 10 s |
| Un utilisateur virtuel | envoie un fichier, attend 1 s, recommence |
| Préparation et nettoyage | un compte neuf par exécution ; ses fichiers sont supprimés à la fin |
| Seuils (le test échoue au-delà) | 95 % des uploads en moins de **1 s** · moins de **1 %** d'erreurs |

Repère pour le seuil de 1 s : en dessous, l'utilisateur garde le fil de ce qu'il fait
(Jakob Nielsen, *Response Times: The 3 Important Limits* : 0,1 s paraît instantané,
1 s ne rompt pas le fil, 10 s fait décrocher).

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

### Lecture

- **Request Rate** : la charge envoyée par k6. Elle monte, reste stable à environ
  10 requêtes par seconde, puis redescend, comme prévu par le script.
- **Request Duration** : le temps de réponse. Il reste entre 20 et 35 ms pendant tout le
  plateau à 10 utilisateurs. Le pic de 90 ms au début correspond aux premières requêtes :
  création du compte de test (BCrypt est volontairement lent) et serveur qui vient de
  démarrer.
- **Request Failed Rate** : 0 % du début à la fin.
- **Request Waiting** : presque identique au temps de réponse. Le temps passé l'est
  côté serveur, le réseau ne compte presque pas (tout tourne sur la même machine).

**Conclusion** : à 10 utilisateurs simultanés, un upload de 1 Mo prend environ 30 ms,
sans erreur, et la charge ne ralentit pas le serveur. Le temps de réponse est 30 fois
sous le seuil.

## Limites de la mesure

| Limite | Conséquence |
|---|---|
| k6, le back et PostgreSQL tournent sur la même machine | ils se partagent processeur et disque : chiffres à lire comme des ordres de grandeur |
| Le serveur n'a pas été poussé à bout | chaque utilisateur passe 98 % de son temps à attendre (1 s de pause pour 20 ms d'envoi) : le débit est fixé par cette pause, pas par le serveur. La capacité maximale n'est **pas** mesurée |
| Fichiers de 1 Mo seulement, alors que la limite est de 1 Go | le comportement avec de gros fichiers n'est pas mesuré ; chaque fichier est écrit deux fois sur le disque (fichier temporaire de Tomcat, puis copie), ce qui pèsera sur les gros envois |
| Pas de réseau réel | sur une connexion à 10 Mbit/s en envoi, ce fichier de 1 Mo met 0,8 s à partir : en conditions réelles, c'est le réseau de l'utilisateur qui fixe la durée, pas le serveur |
| Téléchargement non testé | côté navigateur, le fichier téléchargé tient entier en mémoire avant d'être enregistré (jusqu'à 1 Go) ; k6 n'est pas un navigateur et ne le mesure pas |

Tests prévus pour une mise en production : [`perspectives.md`](docs/perspectives.md).

## Relancer le test

Aucun prérequis de plus que pour lancer l'application : k6 tourne dans Docker, l'image
est téléchargée au premier lancement. Le back doit tourner (voir [`README.md`](README.md)).

Depuis la racine du dépôt :

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

Résultat : résumé dans le terminal, section `THRESHOLDS` en tête ; un seuil dépassé
donne un code de sortie non nul, ce qui ferait échouer un pipeline CI.

## Budget de performance front

### Le but

Avant d'afficher une page, le navigateur télécharge l'application (code JavaScript, styles,
police), puis l'exécute. Plus ce paquet est lourd, plus le visiteur attend, surtout sur un
téléphone en 4G.

Le **budget de performance** est une limite de poids fixée à l'avance pour ce paquet.
Chaque build vérifie qu'on reste en dessous. L'application grossit à chaque nouvelle
fonctionnalité : le budget empêche qu'elle s'alourdisse sans que personne ne s'en
aperçoive.

On vérifie deux choses :

| | Question | Outil |
|---|---|---|
| **Le poids** | combien envoie-t-on au navigateur ? | le build Angular et son budget |
| **L'attente** | combien de temps attend un visiteur, sur téléphone ? | Lighthouse, intégré à Chrome |

### Le poids : le bundle

Le *bundle* est ce que produit `npm run build` dans `front/dist/` : notre code TypeScript
traduit en JavaScript, compacté et regroupé en quelques fichiers. C'est ce que le
navigateur télécharge.

![Sortie de npm run build : tailles des fichiers initiaux](docs/captures/perf-bundle.png)

**Lire le tableau** :
- `Initial total` : ce qu'il faut télécharger avant le premier affichage ;
- `Raw size` : la taille sur le disque, celle que surveille le budget ;
- `Estimated transfer size` : la taille compressée, celle qui passe vraiment par le
  réseau.

**Résultat** (2026-10-16, Angular 22.2) :

| Fichier | Sur le disque | Sur le réseau |
|---|---|---|
| JavaScript (`main-….js`) | 343 kB | 90 kB |
| Styles (`styles-….css`) | 6 kB | 1 kB |
| **Total initial** | **348 kB** | **91 kB** |
| Police DM Sans (hors tableau Angular) | 28 kB | 28 kB |

- **91 kB, c'est environ 0,5 s** de téléchargement sur une 4G lente (environ 180 kB/s).
- **Un seul fichier JavaScript** : Angular et nos 5 pages arrivent ensemble dès la
  première page.
- **La police** : `dist/media/` contient 8 fichiers de police, mais le navigateur n'en
  télécharge que 2 (normal et gras, alphabet latin) ; les autres sont des versions de
  secours.

**Les seuils** (`front/angular.json`, budget `initial`) :

| Seuil | Valeur | Ce qui se passe au build |
|---|---|---|
| Avertissement | **420 kB** (taille mesurée + 20 %) | le build passe, avec un message jaune `exceeded maximum budget` |
| Erreur | **520 kB** (taille mesurée + 50 %) | le build **échoue** |

Les valeurs par défaut d'Angular (500 kB et 1 MB) sont prévues pour n'importe quelle
application : la nôtre aurait pu tripler de poids sans aucune alerte.
- **+20 %** correspond à une évolution normale (quelques écrans de plus) : on vérifie.
- **+50 %** signale presque toujours une grosse librairie ajoutée sans y penser : on
  bloque.

**Si le budget saute**, pour trouver ce qui pèse (depuis `front/`) :

```bash
npm run build -- --stats-json
```

Puis on dépose `dist/datashare/stats.json` sur
[esbuild.github.io/analyze](https://esbuild.github.io/analyze/) : chaque librairie
apparaît comme un rectangle proportionnel à son poids.

### L'attente : Lighthouse

Lighthouse charge une page en se faisant passer pour un visiteur, chronomètre chaque
étape et donne une note sur 100.

| Réglage | Choix | Pourquoi |
|---|---|---|
| Profil | **mobile** : 4G lente simulée (environ 1,6 Mbit/s), processeur ralenti 4 fois | le pire cas : si la page est rapide ici, elle l'est sur ordinateur |
| Pages | `/login` | la porte d'entrée de tout utilisateur |
| | `/download/:id` | le destinataire d'un lien : il n'a jamais vu le site, rien n'est en cache |
| Catégories | Performance, Accessibilité | SEO écarté : on entre dans DataShare par un compte ou un lien, pas par Google |
| Serveur | le build, servi par nginx | voir [Mesurer le build](#mesurer-le-build-pas-le-serveur-de-dev) |

**Résultats** (2026-10-16, Lighthouse 13.4, Chrome, navigation privée) :

| Mesure | Ce qu'elle dit | `/login` | `/download/:id` | « Bon » selon Google |
|---|---|---|---|---|
| **Score Performance** | synthèse des mesures ci-dessous | **98** | **99** | ≥ 90 |
| First Contentful Paint (FCP) | le premier élément apparaît, l'écran n'est plus blanc | 1,8 s | 1,7 s | ≤ 1,8 s |
| Largest Contentful Paint (LCP) | le contenu principal est affiché | 2,0 s | 1,9 s | ≤ 2,5 s |
| Total Blocking Time (TBT) | la page est « gelée » : on clique et rien ne répond | 0 ms | 10 ms | ≤ 200 ms |
| Cumulative Layout Shift (CLS) | des éléments bougent pendant le chargement | 0 | 0,039 | ≤ 0,1 |
| Poids téléchargé | tout compris (HTML, JS, CSS, police) | 151 kB | 151 kB | — |

![Lighthouse sur /login : Performance 98, Accessibilité 100](docs/captures/perf-lighthouse-login.png)

![Lighthouse sur /download : Performance 99, Accessibilité 100](docs/captures/perf-lighthouse-download.png)

**Lecture** :
- Sur un téléphone lent en 4G médiocre, la page s'affiche **en moins de 2 s**, elle ne
  se fige jamais, et rien ne saute à l'écran.
- Le léger décalage (CLS 0,039) sur `/download` : la carte du fichier n'apparaît qu'une
  fois que l'API a répondu (nom, taille), et elle pousse un peu la mise en page.
- 151 kB téléchargés et non 91 kB : nginx compresse au niveau le plus rapide (réglage par
  défaut), donc un peu moins fort que l'estimation d'Angular, et la police s'ajoute.

### Mesurer le build, pas le serveur de dev

La première mesure, faite sur `ng serve` (le serveur de développement), donnait un score
de **55** et **12 s** avant le premier affichage. Ce serveur est conçu pour le
développement : il envoie le code lisible, ni compacté ni compressé, et il ajoute son
outil de rechargement automatique.

| Même page `/login` | Serveur de dev (`ng serve`) | Build servi par nginx |
|---|---|---|
| Poids téléchargé | 2 100 kB | **151 kB** |
| Premier affichage | 11,9 s | **1,8 s** |
| Score | 55 | **98** |

C'est le même code : seul le serveur change. On mesure donc **ce qu'on livrerait** : le
contenu de `front/dist/`, servi par nginx comme le ferait un hébergement. nginx tourne
dans Docker, avec une configuration de mesure d'une dizaine de lignes,
[`perf/nginx.conf`](perf/nginx.conf).

```
Navigateur ──► nginx (Docker, http://localhost:4300)
                ├─ /main-….js, /styles-….css  → fichiers de front/dist/, compressés
                ├─ /login, /download/…        → index.html : Angular affiche la bonne page
                └─ /api/…                     → back Spring Boot (port 8080) → PostgreSQL
```

C'est bien l'application complète, reliée au vrai back et à la vraie base : la page
`/download` affiche un vrai fichier, lu par l'API.

### Pistes d'optimisation

Lighthouse en suggère deux, et le rapport en révèle une troisième. Aucune n'est mise en
place : le score est déjà de 98-99.

| Piste | Le problème | Gain estimé | Quand la mettre en place |
|---|---|---|---|
| **Chargement à la demande** des pages (*lazy loading*) | le visiteur reçoit le code des pages qu'il ne visite pas (environ 50 kB inutilisés à l'arrivée) | environ 0,25 s en 4G lente | quand l'application grossit : le budget l'annoncera |
| **Cache navigateur** | le serveur ne dit pas au navigateur de garder les fichiers : chaque visite retélécharge tout | 2e visite quasi instantanée | au déploiement, dans la configuration du serveur |
| **Compression plus forte** (gzip renforcé ou Brotli) | nginx compresse au plus rapide | environ 30 kB | au déploiement, dans la configuration du serveur |

### Limites de la mesure

| Limite | Conséquence |
|---|---|
| 4G et téléphone **simulés** sur le poste de dev | ordres de grandeur, pas l'expérience exacte d'un vrai téléphone |
| Mesure faite à la main, deux pages | à refaire après une évolution du front ; automatisation dans [`perspectives.md`](docs/perspectives.md) |
| Le score d'un même lancement peut varier de quelques points | deux mesures de `/login` ont donné le même résultat (98) |

### Relancer la mesure

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
