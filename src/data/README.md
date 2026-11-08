# `src/data/`

Schéma Drizzle, migrations et requêtes SQLite. Voir ADR 0001 pour la séparation entre Données de référence et Données précieuses.

- `schema.ts` : toutes les tables. Les Données précieuses n'ont **aucune** clé étrangère vers le Catalogue (un test le vérifie).
- `migrations/` : généré par `pnpm db:generate`, ne pas modifier à la main. La CI échoue si le schéma a changé sans migration.
- La base est **injectée** : `AppDatabaseProvider` l'ouvre (expo-sqlite) et applique les migrations au démarrage, puis les écrans la lisent avec `useDatabase()`. Les fonctions de ce dossier la reçoivent en paramètre (`AppDatabase`).
- Tests : `createTestDatabase()` (`testing/`) donne une base better-sqlite3 en mémoire, migrée avec le même paquet de migrations que l'app.
- Réglages : `getSetting` / `setSetting` (`settings.ts`), et `useSetting` pour une lecture réactive dans l'interface.
