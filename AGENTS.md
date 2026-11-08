# Conventions du projet

Application Android **Riftbound Collection** (Expo + TypeScript + SQLite). Avant toute modification, lis la [spécification](docs/spec-v2.md), le [glossaire](GLOSSARY.md) et les [ADR](docs/adr/).

## Langue

- Échanges, documentation, commentaires et textes d'interface : **français**.
- Code (identifiants, fichiers, tables) : **anglais**, avec **un seul nom par terme du glossaire** (section « Noms dans le code »). Par exemple une Version est un `Printing`, jamais un `Version` ni une `Card`.

## Structure

```
src/
  app/        routes expo-router uniquement : écrans très fins qui assemblent les features
  domain/     TypeScript pur, aucun import React / React Native / SQLite / réseau
  sources/    un adaptateur par site externe ; validation Zod stricte de chaque réponse
  data/       schéma Drizzle, migrations, requêtes
  sync/       seul module qui fait du réseau
  features/   une fonctionnalité par dossier
  ui/         composants partagés, thème, formatage
```

- L'interface lit SQLite par requêtes réactives et ne fait **jamais** d'appel réseau.
- `fetch`, la base de données et l'horloge sont **injectés**, jamais créés dans le code métier. Ils ne sont créés qu'à la racine de composition, `src/features/startup/` (`AppDatabaseProvider`, `AppCatalogGate`).
- Données de référence (reconstructibles) et Données précieuses (jamais effacées) sont séparées ; les Données précieuses désignent les Versions par leur Code de version (ADR 0001).
- On ne « devine » jamais le format d'une réponse externe : un format inattendu fait échouer cette source avec un message clair.
- Import avec l'alias `@/` (ex. `import { colors } from '@/ui/theme'`).

## Tests

- `domain/` : TDD, tests unitaires à côté du fichier (`*.test.ts`).
- `data/` et `sync/` : tests d'intégration sur SQLite en mémoire (`createTestDatabase()` de `src/data/testing/`, better-sqlite3, mêmes migrations), avec de vrais fichiers de réponse enregistrés comme fixtures.
- Jest a deux projets : `node` (Node pur, pour `domain/`, `sources/`, `data/`, `sync/`) et `app` (jest-expo, pour l'interface). better-sqlite3 ne fonctionne pas sous jest-expo.
- Interface : quelques tests ciblés avec Testing Library.

## Commandes

```bash
pnpm install
pnpm start              # serveur de développement (app de développement sur le téléphone)
pnpm check              # types + lint + formatage + tests : à faire passer avant chaque PR
pnpm db:generate        # crée la migration après une modification de src/data/schema.ts
pnpm expo install <pkg> # TOUJOURS pour ajouter une dépendance : choisit la version compatible avec le SDK
pnpm dlx expo-doctor    # diagnostic de la configuration Expo
```

## Expo évolue vite : ne te fie pas à ta mémoire

Le projet utilise **Expo SDK 58**. Avant d'écrire du code qui touche une API Expo, EAS ou React Native, lis la documentation de cette version : https://docs.expo.dev/versions/v58.0.0/ (index pour agents : https://docs.expo.dev/llms.txt, ajouter `.md` à une URL de doc pour l'obtenir en Markdown).

- Les dossiers `android/` et `ios/` sont générés : ne jamais les créer ni les modifier à la main, tout passe par `app.json` et les config plugins.
- Une bibliothèque avec du code natif impose de reconstruire l'app de développement (`eas build --profile development`).

## Git

- Une **branche et une PR par ticket** (`feat/<n°>-<sujet>`), liée au ticket par « Closes #n ». L'utilisateur fusionne lui-même.
- `pnpm check` doit passer et la CI doit être verte avant de demander une relecture.
- Messages de commit en français, à l'impératif.
