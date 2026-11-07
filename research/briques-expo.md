# Briques techniques Expo pour la v2

> Recherche pour l'issue #5, faite le 7 novembre 2026. Les versions viennent du registre npm à cette date (`npm view`) et du `bundledNativeModules.json` de `expo@58.0.23`, c'est-à-dire les versions validées par le SDK. Cible : APK Android installé à la main, usage perso, TypeScript strict.

## Socle

- **Expo SDK 58** (`expo@58.0.23`), sorti le 15/10/2026. Il embarque **React Native 0.88.1** et **React 19.3.0**. Expo demande Node 22.13+ ou 24.3+ (les versions impaires ne sont pas supportées). Sources : [changelog SDK 58](https://expo.dev/changelog/sdk-58), [index des changelogs](https://expo.dev/changelog).
- **La New Architecture est obligatoire** depuis le SDK 55 : « SDK 55 and later run entirely on the New Architecture ». Il n'y a donc rien à arbitrer, mais chaque bibliothèque native choisie doit la supporter. Source : [guide New Architecture](https://docs.expo.dev/guides/new-architecture/).
- Versions natives que le SDK 58 fixe (à installer avec `npx expo install`) : `react-native-reanimated` 4.7.1, `react-native-worklets` 0.13.0, `react-native-gesture-handler` ~3.3.0, `react-native-screens` ~4.30.1, `react-native-svg` 15.16.0, `@shopify/react-native-skia` 2.14.0.

## Tableau de recommandations

| Besoin | Choix recommandé (version) | Maturité | Alternatives écartées |
|---|---|---|---|
| Base locale | `expo-sqlite` ~58.0.15 + `drizzle-orm` 0.45.4 / `drizzle-kit` 0.31.11 (driver `expo`) | Stable, maintenu (Expo et Drizzle publient tous les mois) | SQL brut typé à la main (plus de code à écrire), Drizzle 1.0 RC (pas encore stable) |
| Migrations | `drizzle-kit generate` + `useMigrations` (fichiers `.sql` inclus via `babel-plugin-inline-import` 3.0.0) | Stable | `PRAGMA user_version` géré à la main |
| Requêtes réactives | `useLiveQuery` (Drizzle) + `openDatabaseSync(..., { enableChangeListener: true })` | Stable | TanStack Query sur SQLite (une couche de plus) |
| Navigation | `expo-router` ~58.0.30, `NativeTabs` (`expo-router/native-tabs`) + `Stack` imbriquée par onglet | Native tabs stables en SDK 58 | Tabs JS (`Tabs` de React Navigation) |
| Zoom carte → fiche | Reanimated 4.7 Shared Element Transitions **derrière un flag**, avec repli fondu/échelle | **Expérimental** | `Link.AppleZoom` (iOS seulement) |
| Graphique de prix | `react-native-gifted-charts` 1.4.81 (`LineChart` + `pointerConfig`) sur `react-native-svg` | Maintenu (release 10/2026), JS pur | `victory-native` 43 (Skia, voir le conflit de versions plus bas) |
| Images | `expo-image` ~58.0.18, `cachePolicy="disk"` (valeur par défaut) + `Image.prefetch` | Stable | — |
| Rafraîchissement des prix | Au lancement et au retour au premier plan (`AppState`) ; en option `expo-background-task` ~58.0.12 | Stable, exécution non garantie | `expo-background-fetch` (remplacé) |
| PDF classeur A4 3×3 | `expo-print` ~58.0.8, `printToFileAsync({ html, width: 595, height: 842 })` | Stable | Générer le PDF en JS (pdf-lib) |
| Sauvegarde JSON | `expo-file-system` ~58.0.13 (API `File`/`Paths`) + `expo-sharing` ~58.0.22 (export) + `expo-document-picker` ~58.0.4 (import) | Stable | `File.pickFileAsync` (doc incohérente selon la plateforme) |
| Tests | `jest-expo` ~58.0.14 + Jest 30 + `@testing-library/react-native` 14.1 ; couche SQLite testée sous Node avec `drizzle-orm/better-sqlite3` | Stable | `expo-sqlite-mock` 4.0.0 (attend Jest ~29) |
| CI | GitHub Actions : `tsc --noEmit`, lint, `jest` ; `expo/expo-github-action` 9.0.2 si besoin | Stable | — |
| APK | Profil EAS `buildType: "apk"`, build cloud (offre gratuite) **ou** `eas build --local` sous Linux | Stable | `expo prebuild` + Gradle à la main |

## Détail par sujet

### 1. SQLite + Drizzle

- La doc Drizzle Expo ([connect-expo-sqlite](https://orm.drizzle.team/docs/connect-expo-sqlite)) donne la marche à suivre :
  - `drizzle.config.ts` avec `dialect: 'sqlite'` et `driver: 'expo'` (« very important ») ;
  - `npx drizzle-kit generate` produit un `drizzle/migrations.js`, que `useMigrations(db, migrations)` (depuis `drizzle-orm/expo-sqlite/migrator`) applique au démarrage et qui renvoie `{ success, error }` ;
  - les fichiers `.sql` sont inclus dans le bundle via `babel-plugin-inline-import` (`extensions: ['.sql']`) et `config.resolver.sourceExts.push('sql')` dans `metro.config.js` ;
  - `useLiveQuery(query)` refait le rendu quand les données changent, à condition d'ouvrir la base avec `enableChangeListener: true`.
- Versions : la doc demande d'installer `drizzle-orm@rc`. Le tag `rc` est en `1.0.0-rc.5`, mais `latest` reste en **0.45.4** (publiée le 21/10/2026). **Recommandation : la 0.45.x stable**, puis passer à la 1.0 quand elle sortira en stable (`npm view drizzle-orm dist-tags`).
- Changement en SDK 58 : `expo-sqlite` retire le support libSQL (`syncLibSQL`, `libSQLOptions`), ce qui ne nous concerne pas. Source : [changelog SDK 58](https://expo.dev/changelog/sdk-58).
- Inspection en dev : `expo-drizzle-studio-plugin` 0.2.1. Sa dernière publication date d'octobre 2025, il est donc peu actif : à garder optionnel.

### 2. Navigation (expo-router)

- En SDK 58, on importe les native tabs depuis `expo-router/native-tabs`. L'ancien chemin `unstable-native-tabs` servait du SDK 54 au 57. Limites : 5 onglets au maximum sur Android, pas d'onglets dynamiques, personnalisation limitée. Source : [Native tabs](https://docs.expo.dev/router/advanced/native-tabs/).
- Pour pousser une fiche, la doc recommande d'imbriquer une `<Stack />` dans l'onglet, par exemple `app/catalogue/_layout.tsx` (Stack), puis `index.tsx` (grille) et `[id].tsx` (fiche).

### 3. Transition de zoom carte → fiche (point le plus risqué)

- `Link.AppleZoom` d'expo-router est **iOS seulement** (iOS 18+), en alpha (« The API is subject to breaking changes »). Il est donc inutile pour un APK Android. Source : [Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition/).
- **Reanimated Shared Element Transitions** :
  - Statut : « experimental feature available behind a feature flag, not recommended for production use yet ». La fonction marche sur Android et iOS, uniquement avec la **native stack** (« The Tab navigator is not supported yet »). Source : [doc SET](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/).
  - La [release 4.7.0](https://github.com/software-mansion/react-native-reanimated/releases/tag/4.7.0) (18/09/2026) corrige plusieurs bugs Android (gestes dans `SharedTransitionBoundary`, couleurs périmées) et « brings the feature closer to a stable release ». La fonction reste expérimentale, derrière le flag `ENABLE_SHARED_ELEMENT_TRANSITIONS`, et elle n'est pas compatible avec `USE_LEGACY_LAYOUT_ANIMATIONS_PROXY`.
- **Recommandation** :
  - Activer le flag SET et isoler l'animation dans un seul composant (par exemple `CarteZoomable`, avec un `sharedTransitionTag` sur l'image de la carte). La transition reste dans la Stack de l'onglet catalogue, ce qui correspond au cas supporté.
  - Prévoir un repli : animation `fade` de la Stack, ou overlay animé maison (on mesure la carte, puis on anime l'échelle et la position avec Reanimated). On bascule sur ce repli si le flag pose problème.
  - Ne pas faire dépendre la fonctionnalité de l'animation.

### 4. Graphique d'évolution des prix

- **`victory-native` 43.0.1** (Skia, très performant, gestes press/pan) : la [v43.0.0](https://github.com/FormidableLabs/victory-native-xl/releases/tag/victory-native%4043.0.0) passe de `@shopify/react-native-skia` au paquet **non scopé `react-native-skia` ≥ 2.15.1 <3** (dépôt [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia)). Or le SDK 58 fixe encore `@shopify/react-native-skia` 2.14.0. On sortirait donc de l'ensemble validé par Expo. Autre option : la v42.0.1, qui accepte `@shopify/react-native-skia` 2.14. Mais c'est la 43.0.1 qui ajoute le support de Gesture Handler 3, et le SDK 58 fixe RNGH ~3.3. On risque donc une friction dans les deux cas.
- **`react-native-gifted-charts` 1.4.81** (release du 05/10/2026, dépôt actif) : pas de code natif propre (peers : `react-native-svg`, `expo-linear-gradient`, tous deux dans le SDK). Le `LineChart` gère l'aire, le pointeur tactile qui suit le doigt (`pointerConfig`) et le défilement. Une série de prix sur quelques mois ou années, c'est quelques centaines de points : SVG suffit.
- **Recommandation : gifted-charts.** La sélection de plage de dates (7 j / 30 j / 90 j / 1 an / tout) se fait par des boutons qui filtrent la requête SQL. Pas besoin de pinch-zoom.

### 5. Images (expo-image)

- `cachePolicy` vaut `'disk'` par défaut. Sur Android, Glide garde **250 Mo** maximum, puis évince les images les moins récemment utilisées (LRU). Les images n'expirent pas, et les en-têtes `Cache-Control` sont ignorés. On a aussi `Image.prefetch(urls, 'disk')`, `Image.getCachePathAsync(key)` et `Image.clearDiskCache()`. `recyclingKey` évite d'afficher brièvement l'image précédente dans les listes. En SDK 58, `transition.skipOnCacheHit` supprime le fondu quand l'image vient du cache. Source : [doc expo-image](https://docs.expo.dev/versions/latest/sdk/image/).
- La limite de 250 Mo convient à un catalogue de quelques centaines de cartes. Si on veut un vrai hors-ligne garanti, il faudra télécharger les images dans `Paths.document` via `expo-file-system`, car le cache peut être évincé.

### 6. Rafraîchissement des prix (lancement / arrière-plan)

- `expo-background-task` repose sur **WorkManager** sous Android. L'intervalle par défaut est de 12 h, le **minimum de 15 min**. L'exécution n'est pas garantie : la tâche tourne « sometime after the interval has passed », seulement avec du réseau et assez de batterie. Si l'utilisateur tue l'application, les tâches s'arrêtent jusqu'au prochain lancement, et le comportement varie selon le constructeur. `triggerTaskWorkerForTestingAsync` ne marche qu'en dev. Toutes les tâches JS partagent un seul worker. Source : [doc expo-background-task](https://docs.expo.dev/versions/latest/sdk/background-task/).
- **Recommandation** : la source de vérité est le rafraîchissement **au lancement et au retour au premier plan**, s'il date de plus de N heures (date du dernier refresh stockée en SQLite). La tâche de fond quotidienne vient ensuite, en bonus, et appelle la même fonction.

### 7. PDF du classeur A4 3×3

- `printToFileAsync({ html, width, height, base64 })` renvoie `{ uri, numberOfPages }`. Le fichier est écrit dans le cache. Le format par défaut est US Letter (612×792), il faut donc passer **595×842** pour l'A4. Sur Android, l'option `margins` n'existe pas : les marges se règlent en CSS `@page { margin: … }`. La méthode documentée pour les images est de les inliner en **base64** (`data:`). Source : [doc expo-print](https://docs.expo.dev/versions/latest/sdk/print/).
- Plan :
  - une page HTML par feuille, en grille CSS 3×3 au format des cartes (63×88 mm) avec `page-break-after` ;
  - images lues depuis le cache ou le disque en base64 ;
  - PDF partagé ensuite avec `expo-sharing`.
- À tester tôt sur un vrai appareil : le rendu dépend du WebView Android.

### 8. Sauvegarde / restauration JSON

- `expo-file-system` (API objet `File` / `Directory` / `Paths`, l'ancienne API reste disponible sous `expo-file-system/legacy`) :
  - écriture : `new File(Paths.cache, 'riftbound-backup-2026-11-07.json')` puis `await file.write(json)`. **En SDK 58, `write()` devient asynchrone** (`writeSync` pour l'ancien comportement) ;
  - export : `Sharing.shareAsync(file.uri, { mimeType: 'application/json' })`, qui permet d'envoyer vers Drive, des mails, des fichiers, etc. ;
  - import : `DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })`, puis `new File(uri).text()`, puis validation du schéma (un validateur comme zod est conseillé) avant de remplacer les données dans une transaction.
- Sources : [doc expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/), [changelog SDK 58](https://expo.dev/changelog/sdk-58), [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/), [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/).

### 9. Tests et CI

- `jest-expo` (preset qui mocke la partie native du SDK) **exige Jest 30 à partir du SDK 58**. `@testing-library/react-native` remplace `react-test-renderer`, et la v14+ est nécessaire pour tester expo-router (dernière version : 14.1.0). Source : [Unit testing](https://docs.expo.dev/develop/unit-testing/).
- **Couche SQLite** :
  - `expo-sqlite` est natif, donc impossible à exécuter sous Jest. `expo-sqlite-mock` 4.0.0 déclare `jest: ~29` en peer : **il est incompatible avec le SDK 58**.
  - Recommandation : écrire les repositories contre le type commun `BaseSQLiteDatabase<'sync', unknown, typeof schema>` de Drizzle (vérifié dans drizzle-orm 0.45.4 : `ExpoSQLiteDatabase` et `BetterSQLite3Database` étendent tous deux `BaseSQLiteDatabase<'sync', …>`) (les drivers `expo-sqlite` et `better-sqlite3` sont tous deux synchrones), puis les tester sous Node avec `drizzle-orm/better-sqlite3` sur une base `:memory:` à laquelle on applique **les mêmes migrations** (`migrate()` de `drizzle-orm/better-sqlite3/migrator`, dossier `drizzle/`). Ce projet Jest tourne en `testEnvironment: 'node'`, séparé du projet `jest-expo` dédié aux composants.
- **CI GitHub Actions**, sur push et PR : `npm ci`, `npx tsc --noEmit`, `npx expo lint`, `npx jest --ci` et `npx expo install --check` (cohérence des versions avec le SDK). Le build APK en CI est optionnel : il passe par `expo/expo-github-action` (9.0.2) avec un secret `EXPO_TOKEN`.

### 10. Construire l'APK

- Profil `eas.json` : `"preview": { "android": { "buildType": "apk" } }`, puis `eas build -p android --profile preview`. Source : [Build APKs](https://docs.expo.dev/build-reference/apk/).
- `eas build --platform android --local` tourne sous Linux et macOS (pas Windows). Il demande quand même `eas login` ou `EXPO_TOKEN`, ainsi que l'Android SDK et le NDK installés localement. Pas de cache, et les variables « Secret » ne sont pas prises en charge. Source : [Local builds](https://docs.expo.dev/build-reference/local-builds/).
- Changements SDK 58 : R8 est activé par défaut en release, et les builds Android sont plus rapides grâce aux binaires précompilés d'`expo-modules-core`.
- Recommandation : le **build cloud EAS** (offre gratuite) pour ne pas installer le SDK et le NDK, et `--local` en secours. Garder le keystore géré par EAS : un APK installé à la main ne se met à jour que s'il est signé avec la même clé.

## Risques

1. **Zoom partagé** : fonction expérimentale chez Reanimated, sans solution officielle Expo sur Android. Prévoir le repli dès le départ.
2. **Graphiques Skia** : `victory-native` 43 n'est pas aligné sur la Skia fixée par le SDK 58 (renommage du paquet). C'est la raison du choix de gifted-charts.
3. **Arrière-plan** : WorkManager ne garantit rien (horaire, constructeurs, application tuée). Ne jamais en dépendre.
4. **Drizzle 1.0** : il est en RC et la doc Expo pointe déjà vers `@rc`. Une migration de l'API sera à prévoir quand la 1.0 passera en stable.
5. **PDF** : le rendu dépend du WebView et les images doivent être en base64. Le PDF peut devenir lourd avec beaucoup de pages, à mesurer.
