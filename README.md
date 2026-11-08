# Riftbound Collection

Application Android (Expo + SQLite) pour consulter le catalogue Riftbound, suivre le prix des cartes (TCGplayer / Cardmarket) et gérer sa collection.

Statut : **spécification v2 terminée** ([`docs/spec-v2.md`](docs/spec-v2.md)). La feuille de route vit dans l'issue GitHub labellisée `wayfinder:map`.

- `legacy/index.html` : la v1 (page HTML autonome), conservée comme référence.
- `GLOSSARY.md` : vocabulaire du domaine.

## Développer

Prérequis : Node 24 (voir `.nvmrc`), pnpm 10, un téléphone Android et un compte [Expo](https://expo.dev).

```bash
pnpm install
pnpm check                                   # types, lint, formatage, tests
npx eas-cli@latest build --profile development --platform android   # app de développement, à installer une fois sur le téléphone
pnpm start                                   # puis ouvrir le projet depuis l'app de développement
```

Les conventions de code sont dans [`AGENTS.md`](AGENTS.md).
