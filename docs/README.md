# Documentation DataShare

Chaque fichier s'ouvre sur un bloc **« L'essentiel »** : le premier écran suffit pour une
première lecture. Le détail suit, et ce qui ne sert qu'à reprendre le code est replié.

## Tu veux savoir…

| … | Lis |
|---|---|
| ce que fait l'application, et ce qu'elle ne fait pas | [`conception/use-cases.md`](conception/use-cases.md) |
| comment elle est construite | [`conception/architecture.md`](conception/architecture.md) |
| comment circulent les données, user story par user story | [`conception/flux.md`](conception/flux.md) |
| ce qui est stocké en base | [`conception/modele-donnees.md`](conception/modele-donnees.md) |
| quelles routes expose l'API | [`conception/contrat-interface.md`](conception/contrat-interface.md) (détail : [`openapi.yaml`](conception/openapi.yaml)) |
| pourquoi ces technologies | [`conception/choix-techno.md`](conception/choix-techno.md) |
| pourquoi tel ou tel choix | [`decisions.md`](decisions.md) : les décisions clés en tête, puis le journal complet |
| comment l'installer et le lancer | [`../README.md`](../README.md) |
| comment c'est testé | [`../TESTING.md`](../TESTING.md) |
| comment c'est sécurisé | [`../SECURITY.md`](../SECURITY.md) |
| si c'est rapide | [`../PERF.md`](../PERF.md) |
| comment le maintenir | [`../MAINTENANCE.md`](../MAINTENANCE.md) |
| ce qu'il faudrait changer pour une mise en production | [`perspectives.md`](perspectives.md) |

**Ordre de lecture conseillé** pour découvrir le projet : `use-cases.md` →
`architecture.md` → `modele-donnees.md` → `contrat-interface.md`, puis `flux.md` pour le
détail.

Énoncé et spécifications d'origine : [`brief/`](brief/). Captures d'écran citées par la
documentation : [`captures/`](captures/).
