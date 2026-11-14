# `src/features/`

Une fonctionnalité par dossier (startup, catalog, prices, printing-browser, printing-detail, collection, wishlist, settings, backup, binder) : composants et hooks d'écran. `printing-browser` est la grille commune (spec § 2.1 : recherche, filtres, tri, pagination), que les onglets Catalogue, Collection et Souhaits configurent ; elle reçoit ses actions (✓, ♡) par ses props. Les routes de `src/app/` assemblent ces fonctionnalités.
