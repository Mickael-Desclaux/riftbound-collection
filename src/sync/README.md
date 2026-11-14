# `src/sync/`

Décide quoi télécharger et quand, puis enregistre. C'est le **seul** module qui fait du réseau. L'horloge est injectée.

Les grandes images du classeur (`binderImages.ts`) passent aussi par ici : `fetch` et le stockage des fichiers sont injectés depuis `AppCatalogGate`, l'écran Classeur ne fait que demander leur téléchargement (`useSync().downloadBinderImages`).
