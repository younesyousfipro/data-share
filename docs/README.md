# Documentation DataShare

| Fichier | Contenu |
|---|---|
| [`decisions.md`](decisions.md) | journal des décisions : choix, options écartées, raisons |
| [`conception/use-cases.md`](conception/use-cases.md) | user stories retenues (US01 à US06, US10 partielle) |
| [`conception/modele-donnees.md`](conception/modele-donnees.md) | modèle de données : MCD, MLD, rôle de chaque champ |
| [`conception/architecture.md`](conception/architecture.md) | briques techniques et flux principaux |
| [`conception/contrat-interface.md`](conception/contrat-interface.md) | endpoints de l'API (détail dans `openapi.yaml`) |
| [`conception/choix-techno.md`](conception/choix-techno.md) | justification de la stack |
| [`perspectives.md`](perspectives.md) | évolutions prévues pour une mise en production |
| [`../SECURITY.md`](../SECURITY.md) | politique de sécurité, limites connues, scans des dépendances et du code (SonarQube) |
| [`../PERF.md`](../PERF.md) | test de charge de l'upload (k6) : résultats, limites ; budget de performance front (bundle, Lighthouse) ; logs structurés et suivi des métriques |
| [`../MAINTENANCE.md`](../MAINTENANCE.md) | mise à jour des dépendances : procédure, fréquence, risques ; qualité du code (SonarQube) ; exploitation des logs |
| [`brief/`](brief/) | énoncé et spécifications d'origine |

**Ordre de lecture conseillé** : `use-cases.md` → `modele-donnees.md` →
`architecture.md` → `contrat-interface.md`. `decisions.md` explique le pourquoi de
chaque choix.
