# Sécurité

Politique de sécurité du prototype (US01 à US06), mise en œuvre au fil des user
stories, puis résultats des scans. Détail technique :
[`architecture.md`](docs/conception/architecture.md) ; raison de chaque choix :
[`decisions.md`](docs/decisions.md).

## Politique de sécurité de l'application

### Authentification et accès

| Règle | Mise en œuvre |
|---|---|
| Routes publiques : inscription, connexion, téléchargement par lien | `/api/auth/**`, `/api/download/**` |
| Toutes les autres exigent un JWT | `Authorization: Bearer <jeton>` ; signature (HS256) et expiration vérifiées à chaque requête, sinon `401` |
| Le JWT porte l'identifiant du compte, valable 1 h | clé de signature dans `.env`, jamais versionnée ; l'API refuse de démarrer sans elle |
| L'identité est lue dans le JWT, jamais dans la requête | personne ne peut déposer, lister ou supprimer au nom d'un autre compte |
| Fichier d'un autre compte : `404`, comme un fichier inexistant | son existence n'est pas révélée |
| Lien de partage = UUID aléatoire (122 bits) | impossible à deviner ou à énumérer |

### Mots de passe

| | Compte | Fichier (optionnel) |
|---|---|---|
| Longueur | 8 à 18 caractères | 6 à 18 caractères |
| Stockage | empreinte BCrypt salée, jamais le mot de passe | idem |
| Transmission | corps d'un `POST` | corps d'un `POST` au téléchargement, jamais dans l'URL (qui finit dans les logs et l'historique) |

18 caractères au plus : BCrypt ne lit que 72 octets, et un caractère en occupe jusqu'à 4.
Un mot de passe de fichier faux donne `403`, pas `401` : le front traite `401` comme une
session expirée et déconnecterait l'utilisateur.

### Fichiers déposés

| Règle | Pourquoi |
|---|---|
| 1 Go maximum, sinon `413` | limite des spécifications |
| Extensions refusées : `exe`, `com`, `msi` (exécutables Windows) · `bat`, `cmd`, `ps1`, `vbs`, `sh` (scripts) · `jar` (programme Java) | vecteurs classiques de logiciels malveillants |
| Seule la dernière extension compte, casse ignorée | `facture.pdf.EXE` est refusé ; `archive.exe.zip` accepté |
| Nom obligatoire, 255 caractères au plus | taille de la colonne : une requête forgée finirait sinon en `500` |
| Sur le disque, le fichier porte son UUID, jamais son nom d'origine | un nom piégé (`../../config`) ne peut pas faire écrire hors du dossier de stockage (*path traversal*) |
| Expiration de 1 à 7 jours ; fichier expiré refusé (`410`), effacé du disque chaque nuit | un lien ne reste pas valable indéfiniment |
| Chaque règle est contrôlée par le front **et** par l'API | le front se contourne (`curl`) : seule l'API fait foi |

La spécification laisse la liste « à définir selon la politique de sécurité ». Elle
reprend le cœur de celle de Gmail, référence pour les pièces jointes, plus `sh` pour
Linux et macOS :

| | Types refusés | Contrôle dans les archives |
|---|---|---|
| WeTransfer | aucun | — |
| **DataShare** | 9 extensions : exécutables et scripts | non |
| Gmail | plus de 50 extensions | oui |

### Ce que l'API ne révèle pas

| Information | Protection |
|---|---|
| empreintes des mots de passe | jamais renvoyées : la fiche d'un fichier indique seulement s'il est protégé |
| emails inscrits, à la connexion | même message que l'email ou le mot de passe soit faux |
| valeurs saisies refusées | une erreur de validation cite le champ, jamais la valeur (ce peut être un mot de passe) |
| erreurs internes | `500` et message générique ; le détail reste dans les logs du serveur |

Côté navigateur : pas de CORS (front et API sous une même origine), CSRF désactivé car
le JWT voyage dans un en-tête et non dans un cookie, en-têtes de protection de Spring
Security conservés. Détail dans [`architecture.md`](docs/conception/architecture.md),
section « Sécurité : rôle de chaque couche ».

### Limites connues

| Limite | Conséquence | Piste d'évolution |
|---|---|---|
| Liste noire d'extensions | contournable par un renommage ou une archive | antivirus côté serveur |
| `409` à l'inscription | révèle qu'un email est déjà inscrit | confirmation par email, hors MVP |
| JWT dans `localStorage` | lisible par un script injecté dans la page (XSS) ; Angular échappe par défaut ce qu'il affiche | cookie `HttpOnly` (CSRF à réactiver) |
| Déconnexion côté front seulement | un jeton copié reste valable jusqu'à son expiration (1 h au plus) | liste de jetons révoqués |
| Mot de passe limité à 18 caractères | sous les 64 recommandés par l'OWASP et le NIST | compter les octets, ou Argon2 |
| HTTP en développement | aucun chiffrement | reverse proxy HTTPS ([`perspectives.md`](docs/perspectives.md)) |

## Scan de sécurité

*À venir* : `npm audit` (front) et `trivy` (dépendances back et front), avec les
résultats, leur analyse et les décisions prises.
