# `src/features/`

Une fonctionnalité par dossier (startup, catalog, prices, printing-browser, printing-detail, collection, wishlist, settings, backup, binder, notifications) : composants et hooks d'écran. `printing-browser` est la grille commune (spec § 2.1 : recherche, filtres, tri, pagination), que les onglets Catalogue, Collection et Souhaits configurent ; elle reçoit ses actions (✓, ♡) par ses props. Les routes de `src/app/` assemblent ces fonctionnalités.

`startup` est la racine de composition : `appSync.ts` crée la base (une seule connexion, partagée avec la tâche en arrière-plan), `fetch` et l'horloge. `notifications` annonce les nouvelles Extensions : message en haut de l'app si elle est ouverte, notification Android sinon ; un toucher sur l'un ou l'autre ouvre le Catalogue filtré. Le bandeau et les notifications ouvrent le Catalogue grâce au navigateur des onglets, que reçoit la prop `layout` de `Tabs`.
