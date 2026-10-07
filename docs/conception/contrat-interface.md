# Contrat d'interface

Résumé du contrat complet [`openapi.yaml`](openapi.yaml), écrit avant le code
(design-first) et utilisé comme documentation. Pour le lire en mode navigable :
extension VS Code *OpenAPI (Swagger) Editor*, ou [editor.swagger.io](https://editor.swagger.io).

## Endpoints

| Méthode | Route | Accès | Entrée | Réponse | US |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | public | email, mot de passe | `201` | US03 |
| POST | `/api/auth/login` | public | email, mot de passe | `200` + JWT | US04 |
| POST | `/api/files` | JWT | multipart : fichier, mot de passe ?, durée ? | `201` + fiche | US01 |
| GET | `/api/files` | JWT | — | `200` + mes fichiers | US05 |
| DELETE | `/api/files/{id}` | JWT | — | `204` | US06 |
| GET | `/api/download/{id}` | public | — | `200` + métadonnées | US02 |
| POST | `/api/download/{id}` | public | mot de passe ? | `200` + fichier | US02 |

## Conventions

**Accès par préfixe** — `/api/auth/**` et `/api/download/**` sont publics,
`/api/files/**` exige `Authorization: Bearer <JWT>`. Le compte est toujours lu dans
le JWT (sujet = email), jamais dans un paramètre.

**Format des erreurs** — le même pour toutes les routes :

```json
{
  "timestamp": "2026-10-03T10:15:30",
  "message": "This file has expired",
  "details": "uri=/api/download/3f2b9c1e-…"
}
```

**Codes de retour**

| Code | Quand |
|---|---|
| `400` | validation échouée : extension interdite, mot de passe trop court, durée hors de 1-7 jours… |
| `401` | JWT absent ou expiré · identifiants refusés (même message si l'email ou le mot de passe est faux) |
| `403` | mot de passe de fichier absent ou faux — pas `401`, que l'intercepteur front traite comme une session expirée |
| `404` | fichier inconnu, **ou appartenant à un autre compte** (son existence n'est pas révélée) |
| `409` | email déjà utilisé |
| `410` | fichier expiré |
| `413` | fichier de plus de 1 Go |

## Règles de validation (client et serveur)

| Champ | Règle |
|---|---|
| email | format valide, 254 caractères maximum, unique, casse ignorée (enregistré en minuscules) |
| mot de passe du compte | 8 à 72 caractères (72 : limite de BCrypt) |
| fichier | 1 Go maximum · extensions refusées : `exe`, `bat`, `cmd`, `com`, `msi`, `sh`, `ps1`, `vbs`, `jar` (casse ignorée, dernière extension seule) |
| mot de passe du fichier | optionnel, 6 caractères minimum |
| `expirationDays` | entier de 1 à 7, défaut 7 |

## Structures de données

Noms des schémas OpenAPI. Côté Java, la classe porte le suffixe `DTO`
(`RegisterRequest` → `RegisterRequestDTO`).

| DTO | Champs | Utilisé par |
|---|---|---|
| `RegisterRequest`, `LoginRequest` | `email`, `password` | US03, US04 |
| `LoginResponse` | `token` | US04 |
| `FileResponse` | `id`, `originalName`, `sizeBytes`, `uploadedAt`, `expiresAt`, `status`, `passwordProtected` | upload, historique |
| `FileMetadataResponse` | `originalName`, `sizeBytes`, `expiresAt`, `passwordProtected` | page de téléchargement |
| `DownloadRequest` | `password` (optionnel) | téléchargement |
| `ErrorDetails` | `timestamp`, `message`, `details` | toutes les erreurs |

`status` vaut `ACTIVE`, `EXPIRING_SOON` (moins de 24 h restantes) ou `EXPIRED`. Il
est calculé à partir de `expiresAt`, jamais stocké.
