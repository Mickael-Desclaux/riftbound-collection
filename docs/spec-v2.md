# Spécification v2 — Riftbound Collection (Android)

> Ce document rassemble les décisions prises sur la [carte du projet](https://github.com/Mickael-Desclaux/riftbound-collection/issues/1). Il ne décide rien de nouveau : pour chaque section, le ticket lié contient le détail et le raisonnement. Le vocabulaire est celui de [`GLOSSARY.md`](../GLOSSARY.md) ; les choix structurants sont dans [`docs/adr/`](adr/).
>
> État au 2026-11-07. Prochaine étape : découper ce document en tickets d'implémentation.

## 1. Cadre

- **Usage** : personnel (l'utilisateur et un ami), APK Android installé à la main, sans Play Store. Interface **en français uniquement**.
- **Remplace** la v1 (`legacy/index.html`). Pas d'import des données de la v1.
- **Stack** : Expo SDK 58 (React Native, New Architecture), TypeScript strict, SQLite (expo-sqlite + Drizzle).
- **Périmètre du Catalogue** : toutes les Versions de toutes les Extensions, **en anglais uniquement**. Les Extensions promo (OPP, PR, JDG, OGS, SGN, RWB) sont présentes mais **masquées par défaut**.
- **Hors périmètre** : Play Store et iOS, interface multilingue, serveur ou synchronisation cloud, fusion à l'import d'une Sauvegarde, import du HTML de la v1.

## 2. Écrans

Barre d'onglets : **Catalogue · Collection · Souhaits · Réglages**. La **fiche** d'une Version s'ouvre depuis n'importe quelle grille.

### 2.1 Grille commune (Catalogue, Collection, Souhaits)
Source : [Prototype de la grille Catalogue](https://github.com/Mickael-Desclaux/riftbound-collection/issues/10) (variante A).

- **En-tête fixe** :
  - recherche par nom ou Code de version ;
  - **rangée de puces d'Extension** (un toucher = un filtre) ;
  - bouton « Filtres (n) », menu de tri, compteur « N versions » ;
  - puces des filtres actifs, retirables d'un toucher.
- **Grille 2 colonnes** : image, nom, Code de version, prix (Source de prix et Devise d'affichage choisies), badge « ×n » si possédée.
- **Actions sur la carte** :
  - **✓** bascule « possédée ×1 » / « non possédée » ; la quantité exacte se règle sur la fiche ;
  - sur une Version possédée en plusieurs exemplaires, ✓ remet la quantité à 0, avec le toast « Retirée de la collection (×n) · Annuler » ;
  - **♡** ajoute à la Liste de souhaits ou l'en retire.
- **Feuille de filtres** (monte du bas) :
  - critères : Extension, « Afficher les extensions promo », rareté, version (normale / alternative / overnumbered / signée / metal), type, domaine, possédées / manquantes, fourchette de prix ;
  - boutons « Réinitialiser », **« Voir N versions »** et **« Ajouter les N résultats au classeur »**.
- **Tris** : numéro, nom, prix ↑ / ↓, Variation de prix 7 j / 30 j. Les Versions sans assez d'historique sont classées en dernier.
- **Pagination** : numérotée (‹ 1 … 4 5 6 … ›), 24 cartes par page, retour en haut à chaque changement de page.
- **Mémoire** : filtres, tri et page sont conservés au retour de la fiche.
- **Résultat vide** : message et bouton « Effacer les filtres ».

### 2.2 Fiche d'une Version
Source : [Prototype de la fiche carte](https://github.com/Mickael-Desclaux/riftbound-collection/issues/11) (mise en page A).

- **Transition** :
  - **zoom partagé** : l'image vole de la grille jusqu'à la fiche, et le retour fait le trajet inverse à la même position de défilement ;
  - repli **« agrandissement puis fondu »** si les shared element transitions de Reanimated sont instables sur Android. Ce choix se fait une fois pour toutes à l'implémentation.
- **Contenu, de haut en bas** :
  1. Barre : ← retour ; ↗ ouvre la page produit sur la Source de prix affichée (TCGplayer via `tcgId`, Cardmarket via `idProduct`).
  2. Grande image.
  3. Nom, Code de version, rareté, version ; gros prix.
  4. Si la Version est en souhait : « Dans tes souhaits depuis le JJ/MM : ±x % depuis l'ajout ».
  5. **Graphique d'évolution** :
     - variation sur la période et pointeur tactile (date + prix) ;
     - périodes 7 j / 30 j / 90 j / 1 an / Tout / Dates… : 30 j au premier usage, puis **la dernière période choisie est retenue** ;
     - option « Comparer avec l'autre source » (pointillés, décochée par défaut) ;
     - messages « Historique en cours de constitution » et « Pas de prix … ».
  6. **Prix** : une case par Source de prix × Finition existante (prix converti + prix d'origine). Toucher une case change le graphique et le gros prix **de cette fiche seulement**. Dessous : date du relevé, date du taux, mention Cardmarket « toutes langues et tous états confondus ».
  7. **Autres versions** de la même Carte (bande horizontale).
  8. **Détails** : Extension, numéro, rareté, version, type, domaines, finitions, artiste.
  9. **Barre d'actions fixe** : quantité − n +, ♡, « + Classeur » / « Dans le classeur ».

### 2.3 Collection
Source : [Écran Collection](https://github.com/Mickael-Desclaux/riftbound-collection/issues/13).

1. Bouton **« Classeur »** en haut.
2. **En-tête de valeur** :
   - Valeur de la collection, avec « N versions · M cartes · K sans prix » et la variation sur 30 j ;
   - toucher l'en-tête déplie le **graphique de la valeur des cartes actuellement possédées**, avec la mention « pas l'historique de tes achats ».
3. **Complétion par Extension** (repliable) : « ORIGINS — 54 / 352 · 15 % ». Toucher une ligne ouvre le Catalogue filtré sur cette Extension et sur « Manquantes ».
4. **Grille commune** limitée aux Versions possédées, triée par défaut par **« Valeur » (quantité × prix)**.
- **Collection vide** : message et bouton vers le Catalogue.
- **Version inconnue** (Code de version absent du Catalogue) : en fin de liste, cadre gris, exclue de la valeur, jamais supprimée.

### 2.4 Souhaits
Source : [Écran Liste de souhaits et alertes de prix](https://github.com/Mickael-Desclaux/riftbound-collection/issues/14).

- **En-tête** : « N cartes · coût total X » ; les cartes sans prix sont comptées à part.
- **Grille commune** limitée aux souhaits, avec la variation depuis l'ajout. Tri par défaut : **plus forte baisse depuis l'ajout**.
- Une Version qui passe de 0 à au moins 1 exemplaire est **retirée automatiquement** des souhaits, **depuis n'importe quel écran** (grille, fiche, Catalogue), avec le toast « Retirée des souhaits · Annuler ».

### 2.5 Classeur
Source : [Le classeur PDF en v2](https://github.com/Mickael-Desclaux/riftbound-collection/issues/12).

- **Ajout** : depuis la fiche, ou en masse depuis les filtres du Catalogue. La Sélection du classeur démarre vide.
- **Écran Classeur** (depuis l'onglet Collection) : cartes dans l'ordre d'impression, toucher pour retirer, résumé « N cartes · P pages A4 », bouton **Exporter en PDF**.
- **Ordre** : par Extension (ordre de sortie), puis par numéro. **Chaque Extension commence sur une nouvelle page**, sans trou dans une page. Pas de tri manuel.
- **Mise en page** (comme la v1) : A4, 3 × 3, marges de 5 mm, en-tête « EXTENSION · page x/y », image ≈ 83 mm. Chaque case contient l'image, le nom, le Code de version et la version.
- **Options d'export**, cochées par défaut :
  - « Afficher les prix » : prix du jour, avec la date en pied de page ;
  - « Marquer les cartes possédées » : bordure verte.
- **Export** :
  - les grandes images manquantes sont téléchargées d'abord, avec une barre de progression ;
  - une image indisponible est remplacée par un cadre, avec un avertissement avant l'export ;
  - le PDF est généré par expo-print (595 × 842) et part dans la fenêtre de partage Android.

### 2.6 Réglages
Rassemblés à partir des tickets ci-dessus.

- **Devise d'affichage** : CAD / USD / EUR.
- **Source de prix** : TCGplayer / Cardmarket, avec la mention « toutes langues et tous états » sous Cardmarket.
- **Thème** : Système (par défaut) / Clair / Sombre ; le sombre reprend les couleurs des prototypes.
- **Notifications** :
  - « Nouvelles extensions » (interrupteur) ;
  - « Alertes de prix des souhaits » (interrupteur et seuil en %, 15 % par défaut).
- **Données** :
  - « Exporter une sauvegarde », « Restaurer une sauvegarde », « Annuler la dernière restauration » ;
  - « Reconstruire le catalogue » ;
  - « Tout resynchroniser ».
- **État des sources** : pour RiftHunt, Cardmarket, OpenRift et les taux de change, la dernière réussite et la dernière erreur.
- **Version de l'app**, avec le bandeau « Nouvelle version disponible » quand il y en a une.

## 3. Règles de prix
Source : [Règles de prix](https://github.com/Mickael-Desclaux/riftbound-collection/issues/7).

1. **Indicateur de référence** : TCGplayer `market` (USD), Cardmarket `trend` (EUR).
2. **Finition de référence** : normale si elle existe, sinon foil. La grille l'affiche ; la fiche montre les deux Finitions. Pour Cardmarket, on lit les champs `-foil` selon la Finition réelle de la Version.
3. **Prix absent** dans la Source de prix choisie : « — ». On ne se replie jamais sur l'autre source ni sur un autre indicateur.
4. **Conversion** :
   - prix du jour : au dernier taux connu ;
   - point d'historique : au **taux de sa date** (dernier taux à une date ≤ D).
5. **Variation de prix** : en %, sur 7 j ou 30 j, calculée **en devise d'origine**.
6. **Valeur de la collection** : quantité × prix de la Finition de référence ; les Versions sans prix sont exclues et comptées à part.
7. **Format des montants** : français, devise toujours explicite (« 12,40 $ CA », « 12,40 $ US », « 12,40 € »).
8. **Prix daté** : la fiche donne le détail (source, date du relevé, date du taux) ; un **bandeau global** apparaît si les prix ont plus de 48 h.
9. **Liste de souhaits** : variation depuis la date d'ajout, lue dans l'historique pour la source affichée (premier relevé qui suit la date d'ajout s'il n'y en a pas ce jour-là).
10. **Alerte de prix** :
    - baisse d'au moins le seuil global depuis l'ajout, ou depuis le prix de la dernière alerte ;
    - une seule notification groupée ; pastille sur l'onglet Souhaits si l'app est ouverte ;
    - basée sur la Source de prix choisie, en devise d'origine.

## 4. Données

Principe : [ADR 0001 — Données de référence et données précieuses](adr/0001-donnees-de-reference-et-donnees-precieuses.md). Source : [Modèle de données](https://github.com/Mickael-Desclaux/riftbound-collection/issues/6), complété par les tickets Règles de prix et Souhaits.

### 4.1 Code de version
`{EXTENSION}-{collector_number}` (ex. `OGN-030a`, `OGN-303s`). Un suffixe d'édition s'ajoute **seulement** quand deux Versions partagent un numéro : c'est le cas de 24 paires promo OPP (`OPP-017-metal`, `-top8`, `-champion`, d'après la mention entre parenthèses du nom). Cette règle est critique : elle doit être déterministe et testée, et la changer impose une migration.

### 4.2 Tables
Les noms de tables suivent les noms de code du glossaire (code en anglais). Les noms proposés ici sont à confirmer à l'implémentation.

**Données de référence** (reconstructibles) :

| Table | Contenu |
|---|---|
| `expansion` | code, nom, date de sortie, `isPromo`, nombre de Versions (`card_count`) |
| `card` | `oracle_id` RiftHunt, nom, type, sous-type, domaines, texte |
| `printing` | Code de version (clé), carte, extension, numéro, rareté, variante, finitions existantes, images (small / normal / large), artiste, `tcgId`, `printing_id` RiftHunt, `idProduct` Cardmarket |
| `current_price` | Version × source × Finition : tous les indicateurs du jour, devise d'origine, date de publication de la source |
| `exchange_rate` | date, devise de départ, devise d'arrivée, taux, source (Frankfurter / Banque du Canada) |

**Données précieuses** (jamais effacées ; elles référencent le Code de version, sans clé étrangère vers le Catalogue) :

| Table | Contenu |
|---|---|
| `price_record` | Code de version × source × Finition × date → valeur de l'Indicateur de référence, **enregistrée seulement quand elle change** |
| `collection_entry` | Code de version → quantité |
| `wishlist_entry` | Code de version → date d'ajout, prix et date de la dernière Alerte de prix |
| `binder_entry` | Codes de version de la Sélection du classeur |
| `setting` | clé → valeur (devise, source, thème, période du graphique, notifications, seuil d'alerte…) |

**Volume attendu** : 1 725 Versions au 2026-11-07, deux sources, deux Finitions. Comme on n'enregistre que les changements, l'historique reste bien en dessous de 1,5 million de lignes par an.

### 4.3 Sauvegarde
- **Contenu** : fichier `.json` avec en-tête `format` + `version` + date d'export ; réglages, Collection, Liste de souhaits (avec la dernière alerte) et Sélection du classeur, désignés par leur Code de version ; historique des Relevés de prix sous forme compacte (une série de points par Version × source × Finition). Le Catalogue n'en fait pas partie.
- **Import** :
  - validation complète avant toute modification ;
  - Sauvegarde de sécurité automatique juste avant ;
  - remplacement **atomique**, et annulable avec « Annuler la dernière restauration » ;
  - une Sauvegarde d'un format plus ancien est convertie automatiquement.
- **Sauvegardes de sécurité** : même format, dans le dossier privé de l'app ; on garde la dernière de chaque type (restauration, migration). Elles ne sont pas incluses dans la Sauvegarde.

### 4.4 Migrations
Migrations Drizzle. Les tables de référence peuvent être recréées. Les tables précieuses ne changent que par une migration qui conserve leurs données, exécutée en transaction et précédée d'une Sauvegarde de sécurité. En cas d'échec, rien n'est modifié et un écran propose d'exporter la Sauvegarde de sécurité.

## 5. Sources externes et synchronisation
Sources : [Synchronisation](https://github.com/Mickael-Desclaux/riftbound-collection/issues/8) et les recherches [RiftHunt](https://github.com/Mickael-Desclaux/riftbound-collection/issues/2), [Cardmarket](https://github.com/Mickael-Desclaux/riftbound-collection/issues/3), [taux de change](https://github.com/Mickael-Desclaux/riftbound-collection/issues/4).

| Source | URL | Rôle | Fréquence |
|---|---|---|---|
| RiftHunt — Extensions | `https://api.rifthunt.com/sets` | détecter les changements de catalogue | chaque jour |
| RiftHunt — Catalogue | `https://api.rifthunt.com/cards/search?q=lang:en&unique=prints&page=N` (10 pages de 175) | Catalogue complet | si `/sets` change, sinon chaque semaine |
| RiftHunt — Prix | `https://api.rifthunt.com/bulk/prices` (0,9 Mo) | prix TCGplayer (USD) | si > 6 h |
| Cardmarket — Price guide | `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json` (0,4 Mo) | prix Cardmarket (EUR) | si > 6 h |
| OpenRift — Liens | `https://openrift.app/api/v1/prices/links` (2,8 Mo) | `tcgId` → `idProduct` Cardmarket (1 517 / 1 688 Versions) | avec le Catalogue |
| Frankfurter | `https://api.frankfurter.dev/v1/…` (données BCE) | taux USD / EUR / CAD et historique | une fois par jour |
| Banque du Canada Valet | `FXUSDCAD`, `FXEURCAD` | taux de secours | si Frankfurter échoue |
| GitHub Releases | API publique du dépôt | nouvelle version de l'app | une fois par jour |

**Règles** :
- **Déclenchement** : à l'ouverture et au retour dans l'app, une source dont le dernier succès date de plus de 6 h est retéléchargée. Le tirer-pour-rafraîchir force la mise à jour. Une tâche en arrière-plan (expo-background-task, environ 2 fois par jour, au mieux) applique la même logique.
- **Fichiers inchangés** : ETag et Last-Modified évitent de les retélécharger.
- **Les deux sources de prix sont toujours téléchargées**, quelle que soit la source affichée.
- **Relevés de prix** : datés par la **date de publication de la source** (`updatedAt` TCGplayer, `createdAt` Cardmarket) ; un même fichier ne crée jamais deux relevés.
- **Pannes** : chaque source est **indépendante** ; en cas d'échec, on garde le dernier état connu et on réessaie au prochain retour dans l'app. Correspondance OpenRift indisponible : on garde la dernière connue.
- **Validation** : chaque réponse est validée strictement (Zod). Un format inattendu fait échouer **cette source seulement**, avec un message clair.
- **User-Agent** identifiant le projet sur tous les appels (demande de RiftHunt).
- **Nouvelle Extension** : message dans l'app si elle est ouverte ; **notification Android** si la détection a lieu en arrière-plan.
- **Notifications** : une seule permission, demandée à la fin de la première synchronisation.

## 6. Premier lancement, hors-ligne et erreurs
Source : [Premier lancement, hors-ligne et erreurs](https://github.com/Mickael-Desclaux/riftbound-collection/issues/15).

- **Premier lancement** :
  - environ 6 Mo téléchargés, avec un écran de progression ;
  - seul le Catalogue est bloquant ; sans réseau, l'écran « Connexion nécessaire » propose Réessayer et reprend automatiquement au retour du réseau ;
  - les prix, liens ou taux manquants s'affichent « — » puis sont réessayés.
- **Images** : chargées au fil de l'affichage (cache disque expo-image), avec la page suivante préchargée. Image indisponible : cadre avec le nom et le code, nouvelle tentative automatique, un toucher relance.
- **Messages** : phrases courtes en français, toujours avec une action, et un repli « Détails » pour le diagnostic.

## 7. Architecture et qualité
Principe : [ADR 0002 — Noyau pur et adaptateurs](adr/0002-architecture-noyau-pur-et-adaptateurs.md). Sources : [Architecture](https://github.com/Mickael-Desclaux/riftbound-collection/issues/9) et [Briques techniques Expo](https://github.com/Mickael-Desclaux/riftbound-collection/issues/5).

```
src/
  app/        routes expo-router (onglets + Stack par onglet pour la fiche), écrans très fins
  domain/     TS pur : PrintingCode, règles de prix, filtres et tri, Backup (format + migrations)
  sources/    rifthunt, cardmarket, openrift, frankfurter, bank-of-canada, github-releases
  data/       schéma Drizzle, migrations, requêtes
  sync/       seul module qui fait du réseau
  features/   catalog, printing-detail, collection, wishlist, settings, backup, binder
  ui/         composants partagés, thème, formatage des montants
```

- **Code en anglais** ; un seul nom de code par terme du glossaire (`Printing`, `Expansion`, `PriceRecord`, `PreciousData`…).
- **Lecture des données** : l'interface lit SQLite par `useLiveQuery`, sans état global ni cache réseau, et ne fait **jamais** d'appel réseau.
- **Dépendances injectées** : `fetch`, la base (expo-sqlite dans l'app, better-sqlite3 dans les tests, mêmes migrations) et l'horloge.
- **Briques** :
  - expo-router, expo-sqlite + drizzle-orm 0.45, react-native-gifted-charts, expo-image ;
  - Reanimated 4.7 (flag `ENABLE_SHARED_ELEMENT_TRANSITIONS`) ;
  - expo-print, expo-file-system, expo-sharing, expo-document-picker ;
  - expo-background-task, expo-notifications, Zod.
- **Tests** :
  - `domain` : tests unitaires en TDD ;
  - `data` et `sync` : tests d'intégration sur SQLite en mémoire, avec de vrais fichiers enregistrés ;
  - interface : quelques tests ciblés (jest-expo, Jest 30, Testing Library).
- **Outillage** :
  - pnpm (`node-linker=hoisted` si besoin), TS `strict` + `noUncheckedIndexedAccess`, ESLint (`eslint-config-expo`) et Prettier ;
  - CI GitHub Actions sur chaque push et PR : `tsc`, lint, tests, `expo install --check`.
- **Git** : une branche et une PR par ticket d'implémentation, fusionnées par l'utilisateur.
- **Documentation** : README, GLOSSARY, ADR, et un `AGENTS.md` de conventions créé à l'amorçage.

## 8. Distribution
Source : [Distribution de l'APK et mises à jour](https://github.com/Mickael-Desclaux/riftbound-collection/issues/16).

- **Build** : EAS Build cloud (offre gratuite), `buildType: "apk"`. En secours : `eas build --local` sous Linux.
- **Profils** : `development` (expo-dev-client) et `release`.
- **Clé de signature** : gérée par EAS, avec une **copie de secours** chez l'utilisateur (`eas credentials`, gestionnaire de mots de passe). La procédure est dans le README.
- **Publication** : un tag `vX.Y.Z` sur `main` déclenche une GitHub Action, qui lance le build EAS (secret `EXPO_TOKEN`) et publie une GitHub Release avec l'APK et les notes tirées des PR. `versionCode` incrémenté automatiquement.
- **Mises à jour** : par APK uniquement ; bandeau « Nouvelle version disponible » dans l'app. Les mises à jour à distance (expo-updates) sont une évolution possible.
- **Installation chez un ami** : lien de la Release, puis « Installer des applis inconnues ». Les données sont conservées d'une version à l'autre. Un guide est dans le README.

## 9. Points tranchés à l'assemblage

Trois trous entre décisions sont apparus à l'assemblage. L'utilisateur les a tranchés le 2026-11-07, et les sections concernées ont été mises à jour :

1. **✓ sur une Version possédée en plusieurs exemplaires** : la quantité revient à 0, avec un toast « Annuler » (§ 2.1).
2. **Retrait automatique des souhaits** : il s'applique à tout passage de 0 à au moins 1 exemplaire, quel que soit l'écran (§ 2.4).
3. **Thème** : Système (par défaut) / Clair / Sombre (§ 2.6).

## 10. Écarts de nommage par rapport aux tickets

- Le ticket « Modèle de données » nommait les tables en français (`reglage`, `souhait`…). Le ticket « Architecture » a ensuite choisi le code en anglais : la section 4.2 applique donc les noms de code du glossaire.
- Les Réglages de la carte mentionnaient l'export PDF du classeur. Le classeur s'ouvre finalement **depuis l'onglet Collection** (ticket du classeur).
- La recherche Expo suggérait des cases à la taille réelle (63 × 88 mm). Le ticket du classeur garde **l'image d'environ 83 mm de la v1**, pour laisser la place à la légende.
