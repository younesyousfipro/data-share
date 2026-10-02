# Perspectives d'évolution

Ce que le prototype simplifie volontairement, et ce qu'il faudrait changer pour une
mise en production. Chaque ligne renvoie à la décision qui en donne le contexte dans
[`decisions.md`](decisions.md).

| Évolution | Quand elle devient nécessaire | Aujourd'hui | Décision d'origine |
|---|---|---|---|
| **Reverse proxy** : HTTPS, front et API sous un même domaine | toute mise en ligne | proxy de dev Angular, HTTP | Dev : proxy Angular plutôt que CORS |
| **Stockage objet** (S3, Azure Blob) : nouvelle implémentation de `FileStorage` | plusieurs instances du back, besoin de redondance | dossier local du poste | Stockage des fichiers |
| **Volume Docker** pour les fichiers | back livré en conteneur | back hors Docker | Stockage des fichiers |
| **Purge sortie de l'API** : règle de cycle de vie du stockage objet, ou tâche planifiée indépendante | plusieurs instances du back, ou stockage objet | `@Scheduled` dans le back | US10 partielle |
| **Rétention des métadonnées** : effacer la fiche après une durée fixée | volume de fiches expirées en hausse | fiches conservées sans limite | US10 partielle |
| **Purge des orphelins** : effacer les fichiers du disque sans fiche en base | échecs de suppression constatés dans les logs | orphelins journalisés, non effacés | Cohérence disque / base |
| **Jeton de partage** distinct du fichier : révoquer, régénérer ou multiplier les liens | besoin de couper un accès sans supprimer le fichier | lien = UUID du fichier ; la spec ne prévoit pas de révocation, seule la suppression (US06) coupe l'accès | Lien de partage = identifiant du fichier |
| **URL de téléchargement signée** à courte durée : le navigateur télécharge seul, directement sur disque | fichiers lourds, usage mobile | fichier entier en mémoire du navigateur (`HttpClient`) | Téléchargement reçu par HttpClient |
| **Clé de signature JWT** dans un gestionnaire de secrets | toute mise en ligne | clé dans la configuration locale | Back : Spring Boot (voir `conception/choix-techno.md`) |
