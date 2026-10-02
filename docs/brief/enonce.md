Vous êtes expert en développement logiciel chez DataShare dans le rôle de référent technique senior.

 

 

 

DataShare est une jeune entreprise numérique qui souhaite lancer un prototype de plateforme de transfert sécurisé de fichiers. Cette application sera destinée aux freelances et aux petites entreprises.

 

Lisa, la responsable produit, vous confie le pilotage complet de la conception et le développement du prototype de cette application. Ce MVP (Minimum Viable Product) devra être prêt dans 4 semaines afin d’être présenté à des investisseurs.

 

En tant que référent technique senior, vous devez livrer non seulement un prototype fonctionnel, mais aussi montrer aux investisseurs votre capacité à tester, analyser et maintenir la solution dans une logique professionnelle.

 

Lisa vous envoie un mail avec tous les détails du projet.

 

De : Lisa

À : Moi

Objet : Développement du prototype de transfert de fichiers

Bonjour,


Dans le cadre de notre développement produit, nous allons lancer un prototype de la plateforme de transfert.

 

Ton objectif est clair : développer une application web simple mais robuste, avec authentification sécurisée, téléversement de fichiers, et génération de liens de téléchargement.

 

Ce prototype doit être fonctionnel et prêt dans quatre semaines, pour une démonstration convaincante devant des investisseurs. Les “fonctionnalités avancées” dans les spécifications jointes au mail ne sont pas attendues pour le prototype, mais tu es libre de les implémenter si tu le veux.


Afin de mener à bien ce projet, tu seras responsable de : 

Concevoir l’architecture et le modèle de données. 

Piloter l’implémentation des fonctionnalités clés ; tu dois assigner des tâches de code à un copilote IA, puis superviser et revoir ce code.

Assurer la qualité et la maintenabilité du code avec des tests, du débogage et de la documentation.

 

Tu disposes en pièce jointe des spécifications fonctionnelles et techniques, d’un modèle de documentation technique, et des maquettes Figma réalisées par notre UX Designer. Il est attendu que tu respectes ces maquettes pour garantir une expérience utilisateur optimale.

 

Pour garantir la qualité du prototype, tu dois aussi formaliser un plan de tests et documenter les points clés de sécurité, de performance et de maintenance.

 

J’attends ces livrables :

La documentation technique concise
l’architecture de l'application en diagramme simple
une justification de tes choix technologiques (1-2 pages)
le modèle de données
la documentation des endpoints principaux (OpenAPI ou équivalent)
des explications brèves : 
de la sécurité et de la gestion des accès
de la qualité, des tests et de la maintenance
du processus d’installation et d’exécution
de l’utilisation de l’IA dans le développement
Le repo Git du code de l’application
le code source complet de l’application et l’historique de commits structuré (le respect de la norme “conventional commit” est un plus)
README détaillé avec instructions d'installation et utilisation
les scripts de déploiement pour installer et configuration la BDD
le suivi de qualité et maintenance réparti en plusieurs fichiers (TESTING.md, SECURITY.md, PERF.md, MAINTENANCE.md)
Un support de présentation (slide deck) qui te permet une démonstration fonctionnelle.
Nous ferons un point ensemble avant la présentation à nos investisseurs.

 

Bon courage pour ce défi, je compte sur toi !


Lisa

Responsable produit


Vous avez du pain sur la planche – c’est parti !

 

Cette mission est partiellement guidée.

 

Vous pouvez suivre les étapes ci-dessous ou vous pouvez faire un autre découpage si vous vous sentez plus autonome.


ETAPE 1: -Concevez l'architecture technique
Définissez l’architecture de votre solution sous la forme d’un schéma afin de visualiser chacune des briques techniques qui vont la composer.

 

Modélisez aussi la structure de votre base de données en fonction des spécifications et des maquettes fournies. Vous pouvez utiliser des outils comme UML ou Merise pour vous aider.

 

Enfin, prenez le temps de construire le contrat d’interface entre le front-end et le back-end de votre solution logicielle. Cela vous permet de définir les routes, les structures de données, les paramètres utilisés pour communiquer entre le client et le serveur.

 

Prérequis

Avoir lu le brief projet

Avoir défini le stack technique

Résultat attendu

Un schéma d’architecture de la solution logicielle

Un schéma de la structure de la base de données de type MCD

Un contrat d’interface (au format que vous voulez, ex: Excel, Markdown, OpenAPI Specification) 

Recommandations

Avant de démarrer la conception, définissez votre stack technique.

Choisissez les technologies pour le front, le back, la base de données et le stockage.

Vous devez sélectionner parmi les options dans la section ‘Contraintes Techniques’ dans le document des spécifications pour l’application.

Vous pouvez choisir les solutions technologiques pour d’autres fonctionnalités, comme l’authentification, le testing, le suivi de qualité, etc.

Utilisez les maquettes fournies pour déduire le MCD et le contrat d’interface
Produisez un diagramme simple dès le début

Points de vigilance

Assurez-vous de vous familiariser avec les outils de votre stack technique.

Suivez les conseils dans la section ‘Remise à niveau (optionnelle) – pilotage de développement complet’ et discutez avec votre mentor pour choisir les bons cours OpenClassrooms de suivre.

Lisez également les documentations officielles des outils.

Outils

Outil de diagramme/schéma comme Lucidchart, draw.io, Whimsical, ArchiMate ou autre

Outil bureautique comme MSOffice, LibreOffice, Google Docs ou Markdown

ETAPE 2: - Initialisez les applications

Pour commencer, mettez en place le socle technique de votre application en vous aidant de la documentation officielle de votre stack technique. N’oubliez pas de mettre en place git et d’exposer votre code sur un site d’hébergement git : soit Gitlab, soit GitHub.

 

Vous êtes libre de partir sur les langages et frameworks de votre choix dans la liste fournie dans les spécifications fonctionnelles.

 

Prérequis

Avoir lu le brief projet

Avoir défini le stack technique

Résultat attendu

Un dépôt de code hebergé sur GitHub ou sur GitLab avec l’initialisation des applications 

Recommandations

Pensez dès maintenant aux interactions front/back

Utilisez la documentation officielle (en général, la section “getting started”) de votre stack technique pour vous aider à mettre en place le projet

Outils

Votre EDI préféré (ex. VS Code, IntelliJ, Eclipse, ou autre)

DevTools dans votre navigateur

Git et repo pour gestion de versionnage, soit sur GitHub, soit sur GitLab

Outils de votre stack technique, comme Angular CLI, Spring, PostgreSQL, etc.

ETAPE 3: Implémentez votre première user story

Mettez en place la gestion des utilisateurs en implémentant les US03 et US04. Même si l’US01 paraît plus simple à mettre en place, la gestion utilisateur est un pilier central pour beaucoup d'applications professionnelles.

 

En commençant par ces fonctionnalités vous pourrez traiter une partie essentielle de l’application de manière indépendante.

 

Prérequis

Avoir initialisé l'environnement de développement
Résultat attendu

Un système d’authentification fonctionnel

Recommandations

Utilisez la documentation de votre stack technique pour trouver la meilleure manière d'implémenter l’authentification sur votre application.

Pensez dès maintenant à identifier vos fonctionnalités critiques et à prévoir vos premiers tests unitaires.

Points de vigilance

La gestion utilisateur est primordiale ; alors si vous rencontrez trop de problèmes lors des US03 et US04, cherchez sur des forums comme StackOverflow ou à l’aide de l’IA comment fonctionne une gestion utilisateur (création de compte, authentification etc.)

Ces “solutions rapides” aident vous d’éviter des gros blocages afin que vous puissiez avancer assez vite vers les autres US.

Outils

Outil d’authentification (pour les tokens JWT)

Outils de votre stack technique, comme Angular CLI, Spring, PostgreSQL, etc.

ETAPE 4 - Développez les autres fonctionnalités

Après avoir mis en place l’authentification, vous pouvez maintenant vous concentrer sur les fonctionnalités principales du projet : le téléversement, la gestion et le partage des fichiers.

 

Inspirez-vous des spécifications fonctionnelles et des maquettes pour guider votre développement. Assurez-vous également que chaque fonctionnalité soit bien intégrée dans le parcours utilisateur global.

 

En plus, vous devrez vous servir de l'IA générative uniquement pour développer une seule User Story (US) du projet uniquement. Le reste devra être codé par vous-même.

 

Pour cette US, vous assignerez des tâches ou des fonctionnalités spécifiques à un copilote IA, puis vous relirez le code qu’il aura écrit et/ou reverrez les tâches qu’il aura effectuées.

 

Prérequis

Avoir un système d’authentification fonctionnel

Avoir analysé les US restantes à développer

Résultat attendu

Une application web fonctionnelle permettant à un utilisateur de téléverser, consulter, supprimer des fichiers et partager un lien de téléchargement

Pour une seule US : Des tâches clairement assignées à l’IA et tracées dans l’historique Git

Une section de votre documentation expliquant :

quelles tâches ont été confiées à l’IA ;
quel a été votre rôle de supervision ;
quels correctifs ou ajustements vous avez faits.
Recommandations

Implémentez une fonctionnalité à la fois en vous appuyant sur une User Story précise

Travaillez avec des composants réutilisables et un code structuré pour faciliter la maintenance

Vérifiez que les règles de sécurité sont respectées, notamment pour l’accès aux fichiers

Pensez à versionner vos commits selon la convention "conventional commit" si ce n’est pas encore fait

Points de vigilance

Définissez des tâches claires pour l’IA, par exemple :

“Implémente un service pour gérer le stockage des fichiers en local”

“Écris un composant React pour afficher la liste des fichiers avec un bouton de suppression”
Supervisez activement : relisez le code produit, vérifiez la sécurité (gestion des autorisations), la maintenabilité et la conformité aux standards

Versionnez méthodiquement : isolez les contributions de l’IA dans des commits clairs, par exemple :

 

feat(ai): implémentation initiale du service de fichiers (IA)fix: corrections sur le service de fichiers (revue humaine)

Consignez vos décisions dans la section de la documentation “Utilisation de l’IA dans le développement”
Outils

Outil(s) de copilote IA, comme Copilot, …

Outils de votre stack technique, comme Angular CLI, Spring, PostgreSQL, etc.

ETAPE 5 - Testez, révisez et optimisez le code

Avant de clôturer votre projet, prenez le temps de tester l’ensemble de l’application. Corrigez les éventuels bugs, optimisez les parties critiques du code et améliorez l’expérience utilisateur (ergonomie, messages d’erreurs, feedback visuel...).

 

Cette étape vous permet de livrer une application plus stable, plus propre et plus agréable à présenter.

 

Prérequis

Toutes les fonctionnalités principales doivent être implémentées

Résultat attendu

Une application robuste, sans bugs bloquants, avec une interface soignée

Un suivi de qualité et de maintenance, y compris les 4 fichiers suivants :
TESTING.md :
Un plan de tests documenté et des résultats exploitables
Des tests exécutables (unitaires, intégration et end-to-end) sur les fonctionnalités critiques
Un rapport de couverture de code atteignant un seuil de 70% ou plus
SECURITY.md : un scan de sécurité (ex. `npm audit`, `trivy`) et un compte rendu documenté
PERF.md : 
Un test de performance sur au moins un endpoint critique (upload, download) avec analyse des résultats
Mise en place de logs structurés et analyse des métriques clés
MAINTENANCE.md : Documentation claire sur les procédures de maintenance et de correction
Recommandations

Rédigez un plan de tests simple (1 page, format tableau) listant vos fonctionnalités critiques, le type de test associé, et les critères d’acceptation.

Testez votre application de bout en bout : création de compte, téléversement, téléchargement de fichiers

Implémentez des tests unitaires sur les parties critiques de l’application (téléversement de fichier, téléchargement de fichier)

Générez un rapport de couverture de code (coverage). Fixez-vous un seuil indicatif de 70 % et ajoutez une capture d’écran du rapport.

Réalisez un scan de sécurité basique (ex. npm audit ou équivalent). Documentez les résultats en expliquant quelles vulnérabilités vous avez corrigées, acceptées ou ignorées, et pourquoi.

Exécutez un test de performance rapide sur un endpoint critique (ex. upload de fichier) avec un outil comme k6 et analysez les résultats.

Vérifiez les performances en effectuant un test de performance sur un endpoint critique (ex. upload de fichier) avec un outil comme k6 et analysez les résultats.
Points de vigilance

Si vous avez assez de temps, demandez à une personne extérieure (autre étudiant, mentor) de tester votre application et de vous faire des retours.

Corrigez les incohérences UI/UX et améliorez les messages d’erreurs.

Outils

Outil(s) de tests (ex. Cypress, JUnit, Jest …)

Outil de performance (ex. k6)


ETAPE 6: Rédigez la documentation et préparez votre soutenance

Une fois votre prototype terminé et stabilisé, il vous reste à produire les livrables attendus. Cela inclut la documentation technique, le README d’installation, ainsi qu’un support de présentation synthétique pour votre soutenance.

 

Ces éléments sont essentiels pour valoriser votre travail auprès des évaluateurs ou d’un public non technique.

 

Prérequis

Application finalisée, testée et stable

Résultat attendu

Le repository GitLab ou GitHub, dont le lien dans un fichier TXT ou PDF à déposer dans la plateforme, le repo contenant : 
Tout le code et l’historique de commits
Un README clair pour installer et utiliser l’application
Les scripts de déploiement (pour l’installation et la configuration BDD)
Des documentations du plan de suivi de qualité et maintenance : 
TESTING.md
SECURITY.md
PERF.md
Budget de performance côté front (bundle, performance du navigateur)
Suivi des métriques clés : temps de réponse, taille de fichiers
MAINTENANCE.md
Procédures de mise à jour des dépendances, leur fréquence, leurs risques
La documentation technique complète et claire
Un support de présentation synthétique pour votre soutenance
Recommandations

Utilisez le modèle de documentation fourni pour structurer vos livrables

Expliquez vos choix techniques et montrez que vous avez pensé à la maintenabilité

Établissez un budget de performance front : analysez le poids du bundle et les métriques de performance du navigateur (ex. Lighthouse).

Pour le back, appuyez-vous sur le test de performance déjà réalisé.

Journalisez vos métriques clés (ex. temps de réponse, taille des fichiers transférés).

Ajoutez ensuite un paragraphe d’analyse sur les actions d’optimisation possibles.

Préparez une procédure de maintenance minimale : comment mettre à jour les dépendances, avec quelle fréquence, et quels risques surveiller.

Finalisez la documentation dans votre repo GitHub ou GitLab

Ajoutez ou mettez à jour les documentations de testing et de maintenance : TESTING.md, SECURITY.md, PERF.md et MAINTENANCE.md

Dans votre README, facilitez la prise en main : prérequis, étapes d’installation, lancement de l’application

Pour la soutenance, structurez vos slides autour de l’architecture, des choix techniques, des difficultés rencontrées et des solutions apportées.

Points de vigilance

Prenez de temps d'harmoniser tout ce que vous avez fait. Notamment, assurez-vous de la cohérence entre : 
Le code et la documentation dans votre repository GitHub ou GitLab
La documentation dans votre repository (Readme, testing, maintenance) et la documentation technique rédigée à part
La documentation technique et la présentation
Outils

Suite Office / Google Docs / Markdown


