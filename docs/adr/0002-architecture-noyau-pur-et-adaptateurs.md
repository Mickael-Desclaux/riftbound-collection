# Architecture : noyau métier pur, adaptateurs de sources, interface sans réseau

Le code est organisé autour d'un noyau `domain/` en TypeScript pur (sans React, sans SQLite, sans réseau) qui porte toutes les règles métier : Code de version, règles de prix, filtres et tri, format de la Sauvegarde. Autour de lui :

- `sources/` contient un adaptateur par site externe, qui valide strictement chaque réponse (Zod) et la traduit en types du domaine ;
- `data/` contient le schéma Drizzle, les migrations et les requêtes ;
- `sync/` est le **seul** module qui fait du réseau ;
- `features/` contient une fonctionnalité par dossier ;
- `app/` contient des routes expo-router très fines.

L'interface lit SQLite par requêtes réactives (`useLiveQuery`), sans bibliothèque d'état global ni cache réseau. Trois dépendances sont injectées, jamais créées dans le code : `fetch`, la base SQLite (expo-sqlite dans l'app, better-sqlite3 dans les tests, mêmes migrations) et l'horloge.

Nous l'avons choisi pour la maintenabilité : un changement de format chez une source ne touche qu'un adaptateur, et toute la logique importante se teste sans téléphone. C'est l'inverse de la v1, où parsing tolérant, état et DOM étaient mêlés dans un seul fichier.

## Conséquences

- Le code est en anglais ; chaque terme du glossaire a un seul nom de code (voir « Noms dans le code » dans `GLOSSARY.md`).
- Un format externe inattendu fait échouer **cette source seulement**, avec un message clair. On ne « devine » jamais un format.
- Une source de données externe supplémentaire = un nouvel adaptateur dans `sources/`, sans modifier `domain/`.
