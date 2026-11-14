# `src/sync/`

Décide quoi télécharger et quand, puis enregistre. C'est le **seul** module qui fait du réseau. L'horloge est injectée.

Les grandes images du classeur (`binderImages.ts`) passent aussi par ici : `fetch` et le stockage des fichiers sont injectés depuis `AppCatalogGate`, l'écran Classeur ne fait que demander leur téléchargement (`useSync().downloadBinderImages`).

`syncAll` enchaîne toutes les sources selon un mode : `auto` (ouverture et retour dans l'app, chaque source selon sa fréquence), `refresh` (tirer-pour-rafraîchir), `resync` (« Tout resynchroniser » : `Last-Modified` oublié, tout est retéléchargé) et `rebuild` (« Reconstruire le catalogue » : comme `resync`, et le Catalogue de l'appareil est effacé puis remplacé d'un bloc, une fois le nouveau téléchargé ; la correspondance OpenRift et les prix du jour sont gardés jusqu'à leur nouveau téléchargement). Chaque échec est noté dans `source_state` (message et diagnostic), qu'affiche Réglages → « État des sources ».
