# Performance

Mesures de performance du prototype. Raison de chaque choix :
[`decisions.md`](docs/decisions.md).

**Sommaire** : [Test de charge de l'upload](#test-de-charge-de-lupload-k6) ·
[Limites](#limites-de-la-mesure) · [Relancer le test](#relancer-le-test) ·
budget front et suivi des métriques : à venir

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
