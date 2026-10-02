# Modèle de données

MCD Merise, source Mocodo : [`modele-donnees/datashare.mcd`](modele-donnees/datashare.mcd).
Déduit des US01 à US06 (+ US10 partielle) et des maquettes.

![MCD DataShare](modele-donnees/mcd.svg)

## En une phrase

Deux tables : **`account`**, les personnes inscrites, et **`shared_file`**, les
fichiers qu'elles ont déposés. Le contenu des fichiers n'est **pas** en base : il
est sur le disque du serveur. La base ne garde que leur fiche descriptive.

**Lecture du schéma** — en Merise, la cardinalité s'écrit à côté de l'entité
qu'elle décrit (à l'inverse d'UML) :

| Côté | Signifie | Pourquoi |
|---|---|---|
| `ACCOUNT` **0,N** | un compte possède 0 à N fichiers | un compte tout juste créé n'a encore rien déposé |
| `SHARED_FILE` **1,1** | un fichier a exactement 1 propriétaire | pas d'upload anonyme (US07 écartée) ; sinon ce serait 0,1 |

Côté tables, cela donne une colonne `account_id` **non nulle** dans `shared_file` :
la clé étrangère qui pointe vers son propriétaire. OWNS ne devient pas une table de
liaison : une association avec un côté à 1 se traduit par une clé étrangère ; seule
une association N-N donnerait une table de liaison (cas de co-propriété).

**MLD** (clé primaire soulignée, clé étrangère précédée de `#`) :

![MLD DataShare](modele-donnees/mld.svg)

- **account** (<u>account_id</u>, email, password_hash)
- **shared_file** (<u>file_id</u>, #account_id, original_name, size_bytes, password_hash,
  uploaded_at, expires_at)

Chaque identifiant porte le nom de sa table (`account_id`, `file_id`) : la clé
étrangère reprend ainsi le même nom que la clé qu'elle référence, du MCD au SQL.

Le MPD (types et contraintes SQL) sera le script Flyway `V1__init.sql`.

## `account` — un utilisateur inscrit

| Champ | Exemple | À quoi il sert |
|---|---|---|
| `account_id` | `42` | numéro interne, attribué par la base. Sert à relier un fichier à son propriétaire. |
| `email` | `marie@mail.fr` | identifiant de connexion (US04). **Unique** : deux comptes ne peuvent pas partager un email (US03). |
| `password_hash` | `$2a$10$N9qo8u…` | **empreinte** du mot de passe, jamais le mot de passe lui-même. À la connexion, on recalcule l'empreinte de ce qui est saisi et on compare. Si la base fuit, les mots de passe restent inconnus. |

## `shared_file` — un fichier déposé

| Champ | Exemple | À quoi il sert |
|---|---|---|
| `file_id` | `3f2b9c1e-…-a7d4` | **UUID** : identifiant aléatoire de 128 bits, impossible à deviner. Il sert trois fois : clé de la ligne, **lien de partage** (`/d/3f2b9c1e-…`, US02) et **nom du fichier sur le disque**. |
| `account_id` | `42` | propriétaire (clé étrangère vers `account`). Filtre l'historique (US05) et contrôle le droit de supprimer (US06). |
| `original_name` | `vacances.mp4` | nom affiché à l'écran et proposé au téléchargement. Jamais utilisé sur le disque. Son extension donne le **type** affiché (icône, US02). |
| `size_bytes` | `2726297` | taille affichée (« 2,6 Mo »). Contrôlée à l'envoi : ≤ 1 Go. |
| `password_hash` | `NULL` ou `$2a$10$…` | **vide** si le fichier n'est pas protégé. Sinon, empreinte du mot de passe exigé au téléchargement (US01, US02). |
| `uploaded_at` | `2026-10-02 14:00` | date d'envoi, affichée dans l'historique (US05). |
| `expires_at` | `2026-10-09 14:00` | date limite : envoi + 1 à 7 jours (défaut 7). Tout ce qui touche à l'expiration se déduit d'elle. |

## Qui utilise quoi

| Fonctionnalité | Lit | Écrit |
|---|---|---|
| Inscription (US03) | `email` (déjà pris ?) | une ligne `account` |
| Connexion (US04) | `email`, `password_hash` | — |
| Envoi (US01) | — | une ligne `shared_file` + le fichier sur disque, nommé par le `file_id` |
| Téléchargement (US02) | `file_id` du lien, `expires_at`, `password_hash` | — |
| Historique (US05) | les fichiers dont `account_id` = moi | — |
| Suppression (US06) | `account_id` (est-ce le mien ?) | supprime la ligne + le fichier disque |
| Purge quotidienne (US10 partielle) | `expires_at` dépassée | supprime le fichier disque, **garde la ligne** |

## Ce qui n'est pas stocké, et pourquoi

| Donnée | Comment on l'obtient | Pourquoi pas une colonne |
|---|---|---|
| statut actif · expire bientôt · expiré | comparaison `expires_at` / maintenant | elle changerait toute seule avec le temps : une colonne serait vite fausse |
| fichier protégé (cadenas) | `password_hash` non vide | l'information est déjà là |
| type de fichier | extension de `original_name` | idem |

## Ce qu'on a volontairement laissé de côté

| Écarté | Raison |
|---|---|
| un token de lien distinct du `file_id` | un UUID aléatoire est déjà non prédictible ; un second identifiant n'apporte rien au MVP |
| un nom de stockage distinct | le `file_id` sert de nom de fichier : unique, sans caractère dangereux (`../`) |
| le type MIME envoyé par le navigateur | non fiable (déclaré par le client) ; le téléchargement est servi en binaire générique, ce qui force l'enregistrement au lieu de l'ouverture dans le navigateur |
| table des tags, upload anonyme, nom d'utilisateur | hors périmètre (US07, US08) ou absent d'US03 |
| noms `USER` / `FILE` | `user` est réservé en PostgreSQL ; `File` et `User` existent déjà en Java et Spring Security |
