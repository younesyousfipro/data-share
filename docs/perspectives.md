# Perspectives d'évolution

Ce que le prototype simplifie volontairement, et ce qu'il faudrait changer pour une
mise en production. Chaque ligne renvoie à la décision qui en donne le contexte dans
[`decisions.md`](decisions.md).

| Évolution | Quand elle devient nécessaire | Aujourd'hui | Décision d'origine |
|---|---|---|---|
| **Reverse proxy** : HTTPS, front et API sous un même domaine | toute mise en ligne | proxy de dev Angular, HTTP | Dev : proxy Angular plutôt que CORS |
| **Stockage objet** (S3, Azure Blob) : nouvelle implémentation de `FileStorage` | plusieurs instances du back, besoin de redondance | dossier local du poste | Stockage des fichiers |
| **Upload direct vers le stockage objet** (URL d'envoi signée) : le navigateur envoie le fichier au stockage, l'API ne reçoit que la demande | fichiers lourds, nombreux uploads simultanés | chaque fichier traverse l'API (mémoire, disque, bande passante) | Stockage des fichiers |
| **Volume Docker** pour les fichiers | back livré en conteneur | back hors Docker | Stockage des fichiers |
| **Purge sortie de l'API** : règle de cycle de vie du stockage objet, ou tâche planifiée indépendante | plusieurs instances du back, ou stockage objet | `@Scheduled` dans le back | US10 partielle |
| **Rétention des métadonnées** : effacer la fiche après une durée fixée | volume de fiches expirées en hausse | fiches conservées sans limite | US10 partielle |
| **Purge des orphelins** : effacer les fichiers du disque sans fiche en base | échecs de suppression constatés dans les logs | orphelins journalisés, non effacés | Cohérence disque / base |
| **Jeton de partage** distinct du fichier : révoquer, régénérer ou multiplier les liens | besoin de couper un accès sans supprimer le fichier | lien = UUID du fichier ; la spec ne prévoit pas de révocation, seule la suppression (US06) coupe l'accès | Lien de partage = identifiant du fichier |
| **Progression et reprise de l'upload** : barre de progression (`reportProgress`), puis envoi par morceaux reprenable après une coupure (protocole tus, *multipart upload* de S3) | fichiers lourds, connexions instables | un seul envoi, sans indication d'avancement ; une coupure oblige à tout renvoyer | Upload : pas de barre de progression |
| **Progression du téléchargement** : `reportProgress` + `observe: 'events'` dans `DownloadService`, élément `<progress>` sur la page ; le back envoie déjà `Content-Length`. Inutile si l'URL signée (ligne suivante) est adoptée : le navigateur affiche alors sa propre progression | fichiers lourds, connexions lentes | « Téléchargement en cours… » sans avancement : reçu en `Blob`, le fichier n'apparaît dans les téléchargements du navigateur qu'une fois complet | Téléchargement : pas de barre de progression |
| **URL de téléchargement signée** à courte durée : le navigateur télécharge seul, directement sur disque | fichiers lourds, usage mobile | fichier entier en mémoire du navigateur (`HttpClient`) | Téléchargement reçu par HttpClient |
| **Migrations sorties du démarrage** : étape dédiée du déploiement (job de CI, conteneur Flyway), lancée avec un compte autorisé à modifier le schéma ; l'application garde un compte limité aux données (moindre privilège) | toute mise en ligne | Flyway lancé par le back à son démarrage, un seul compte de base | Schéma de base géré par Flyway |
| **Modale de confirmation** au style du design system (`<dialog>` avec `showModal()`) | identité visuelle soignée | boîte native du navigateur (`window.confirm`) | Suppression : confirmation par la boîte native du navigateur |
| **Mots de passe longs** (≥ 64 caractères, recommandation OWASP / NIST) : compter les octets (`@MaxBytes`) ou passer à Argon2, sans limite de longueur | toute mise en ligne | 18 caractères maximum, pour rester sous la limite de 72 octets de BCrypt | Mot de passe du compte |
| **Clé de signature JWT** dans un gestionnaire de secrets | toute mise en ligne | clé dans la configuration locale | Back : Spring Boot (voir `conception/choix-techno.md`) |
| **Tests E2E dans le pipeline CI** : base jetable, back et front démarrés par le pipeline avant `cypress run` | dès qu'un pipeline CI existe | lancés à la main, sur la base de dev | Tests E2E : sur la vraie application, sans API simulée |
| **Mises à jour et scan automatisés** : Dependabot ou Renovate proposent les mises à jour en PR, Trivy tourne dans le pipeline à chaque PR | dès qu'un pipeline CI existe | scan et mises à jour lancés à la main, chaque semaine (`MAINTENANCE.md`) | Scan des dépendances : Trivy, version figée |
| **Tests de charge poussés** sur une machine dédiée, distincte du serveur : montée jusqu'à saturation (capacité maximale), gros fichiers (100 Mo à 1 Go), téléchargement ; k6 dans le pipeline CI | avant toute mise en ligne | un test de 50 s sur le poste de dev, fichiers de 1 Mo, upload seul (`PERF.md`) | Test de charge : k6 sur l'upload, lancé par Docker |
