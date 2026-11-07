# `src/sources/`

Un adaptateur par site externe (rifthunt, cardmarket, openrift, frankfurter, bank-of-canada, github-releases). Chaque adaptateur télécharge, valide strictement la réponse avec Zod, puis la traduit en types de `domain/`. `fetch` est injecté.
