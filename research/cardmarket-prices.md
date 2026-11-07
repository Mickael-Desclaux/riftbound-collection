# Où obtenir les prix Cardmarket des cartes Riftbound

Recherche pour l'issue #3. J'ai vérifié tout ce qui suit le 2026-11-07, sur les fichiers et API réels (curl + jq). Les exemples de prix datent de ce jour.

## Résumé

- **RiftHunt n'expose aucun prix Cardmarket.** Il ne fournit que TCGplayer, en USD. Pour Cardmarket, il donne seulement un lien de *recherche par nom* (`purchase_uris.cardmarket`), sans identifiant produit.
- **Cardmarket publie gratuitement un fichier JSON de prix quotidien pour Riftbound** (`idGame = 22`). Le fichier donne `avg`, `low`, `trend`, `avg1`, `avg7` et `avg30`, en normal et en foil. Le fichier catalogue associé, lui, **n'a ni code d'extension, ni numéro de collection, ni variante** : le nom seul ne permet pas de retrouver une Version.
- **L'API officielle Cardmarket est fermée** aux nouvelles demandes.
- **OpenRift** (open source, sans clé) relie chaque Version (code `OGN-030a` + Finition) à son `idProduct` Cardmarket, son id TCGplayer, etc. Il expose aussi un prix Cardmarket (`low` uniquement) avec environ 30 jours d'historique.
- **Recommandation** : télécharger directement le *price guide* officiel de Cardmarket et s'appuyer sur la correspondance de `/api/v1/prices/links` d'OpenRift pour relier `idProduct` → Version. Côté TCGplayer, garder RiftHunt (ou passer par tcgcsv). Détails à la fin.

## 1. RiftHunt (source de la v1)

Doc : <https://rifthunt.com/api/>

- `/bulk/prices` : « TCGplayer market, low, mid and high per printing and finish. Refreshed daily. » Le fichier contient 1688 lignes, `"source": "tcgplayer"`, `"currency": "USD"`.
- Sur une carte, le lien Cardmarket n'est qu'une recherche par nom :

```json
"cardmarket": "https://www.cardmarket.com/en/Riftbound/Products/Search?searchString=Jinx%2C%20Demolitionist%20(Alternate%20Art)"
```

- `/bulk/cards` ne contient aucun champ Cardmarket : je n'y ai trouvé aucun id.
- Points utiles quand même : `collector_number`, `variant`, `finishes`, `tcg_id`. RiftHunt prévient : « The 52 "(Metal)" promos share an id with their base printing » (`riftbound_id` n'est pas unique).

**Conclusion : RiftHunt ne peut pas servir de source de prix Cardmarket.**

## 2. Fichiers publics Cardmarket (price guide + catalogue)

Cardmarket a rendu ces fichiers « available to all users on the website » sur deux pages, *Data/Price-Guide* et *Data/Product-List* ([annonce du 28.10.2024](https://news.cardmarket.com/en/FoW/adding-non-singles-and-accessories-to-the-price-guide)). Les pages web elles-mêmes renvoient une 403 à un client automatique (Cloudflare), mais les fichiers sont directement accessibles sur S3/CloudFront :

| Fichier | URL | Taille |
|---|---|---|
| Price guide | `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json` | ~400 Ko, 1994 produits |
| Catalogue des singles | `https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_22.json` | ~320 Ko, 1873 produits |
| Catalogue du scellé | `…/productList/products_nonsingles_22.json` | 121 produits |

J'ai trouvé `22` en parcourant les ids de jeu : `products_singles_22.json` contient `"categoryName": "Riftbound Single"`.

**Fréquence** : le fichier est régénéré chaque nuit. Ce jour-là, il avait `"createdAt": "2026-11-07T02:46:10+0100"` et l'en-tête `last-modified: Sat, 07 Nov 2026 01:46:11 GMT`.

**Champs du price guide** (en EUR, toutes langues et tous états confondus) :

```json
{"idProduct":847147,"idCategory":1655,"avg":null,"low":1.2,"trend":2.64,"avg1":1.4,"avg7":4,"avg30":4.12,
 "avg-foil":3.53,"low-foil":1.2,"trend-foil":3.56,"avg1-foil":3.48,"avg7-foil":3.49,"avg30-foil":3.53}
```

- `trend` est le prix de référence affiché par Cardmarket. `avg1`, `avg7` et `avg30` sont des moyennes de ventes sur 1, 7 et 30 jours. Elles donnent une **pseudo-histoire** (une tendance), mais pas de série temporelle. Pour avoir un vrai historique, l'app doit enregistrer elle-même une valeur par jour.
- **Piège Finition** : pour une Version qui n'existe qu'en foil, les champs « normaux » sont quand même remplis (`low` = `low-foil` ci-dessus). Il faut lire les champs `-foil` selon la Finition réelle de la Version, que RiftHunt (`finishes`) ou OpenRift (`finish`) fournissent.

**Catalogue : le vrai problème, c'est la correspondance.**

```json
{"idProduct":845712,"name":"Blazing Scorcher","idCategory":1655,"categoryName":"Riftbound Single",
 "idExpansion":6286,"idMetacard":453329,"dateAdded":"2025-08-28 14:10:58"}
```

Le fichier n'a ni numéro de collection ni variante, et il n'associe aucun nom aux `idExpansion` (16 valeurs numériques). Par exemple, « Jinx, Demolitionist » correspond à 4 produits (847146 et 847147 dans l'extension 6286, plus 898122 et 900480), tous avec le même nom. Pour distinguer `OGN-030` de `OGN-030a`, une table de correspondance maintenue par quelqu'un est indispensable.

**Conditions** : je n'ai trouvé aucune licence propre à ces fichiers. Leur publication volontaire et ouverte à tous les utilisateurs semble raisonnablement compatible avec un usage personnel non redistribué. Le fichier n'envoie pas d'en-tête CORS, ce qui ne gêne pas `fetch` en React Native.

## 3. API officielle Cardmarket

<https://help.cardmarket.com/en/cardmarket-api> : « Currently, we are not accepting applications for access to the Cardmarket API. » Dans l'API 2.0, la ressource *Price Guide* est de toute façon réservée aux apps « Widget, 3rd party et Dedicated apps of powersellers and professionals » ([doc](https://api.cardmarket.com/ws/documentation/API_2.0:PriceGuide)). **Ce n'est donc pas une option.**

## 4. Agrégateurs tiers

### OpenRift (Cardmarket + TCGplayer + CardTrader + CardNexus)

Doc : <https://openrift.app/developers>. Code : [openriftapp/openrift](https://github.com/openriftapp/openrift) (AGPL-3.0, actif : dernier push le 2026-11-06).

- Pas de clé. CORS ouvert (`access-control-allow-origin: *`). `cache-control: max-age=3600` et ETag. « no fixed rate limit, but please keep your traffic light ».
- `/api/v1/catalog` (7 Mo) : 9051 printings, **une par Version × Finition × langue** (EN, FR, KR, SC, TC), avec `shortCode` (`OGN-030a`), `finish`, `artVariant`, `isOvernumbered` et `isSigned`.
- `/api/v1/prices/links` (2,8 Mo) : pour chaque printing, le `productId` de chaque marketplace. Il y a 1674 `idProduct` Cardmarket distincts. Exemple vérifié :

| shortCode | finish | Cardmarket `idProduct` | TCGplayer id |
|---|---|---|---|
| OGN-030 | foil | 847146 | 652802 |
| OGN-030a (altart) | foil | 847147 | 652803 |
| VEN-168 (overnumbered) | foil | 898122 | 706047 |

- `/api/v1/prices` : un prix par marketplace, **en centimes** (`"currencies": {"tcgplayer":"USD","cardmarket":"EUR",…}`). Pour Cardmarket, c'est **uniquement le `low`**, que la doc décrit comme mélangeant toutes les langues (« pools all languages into one price »). Exemple : OGN-030a vaut `cardmarket: 120` (1,20 €), alors que le `trend` officiel est de 3,56 €.
- `/api/v1/prices/{printingId}` : environ 30 snapshots quotidiens (`{date, market, low}`) par marketplace. Il faut un appel par Version, ce qui ne convient pas pour récupérer toute la base.
- OpenRift lit lui-même `downloads.s3.cardmarket.com/productCatalog` (voir `apps/api/src/modules/marketplace/services/price-refresh/cardmarket.ts`) : c'est la même donnée de base, appauvrie.
- Risque : c'est un projet communautaire récent. La correspondance est faite à la main par son équipe, et les ids de printing sont propres à OpenRift.

### tcgcsv.com (TCGplayer uniquement)

<https://tcgcsv.com/faq> : un miroir quotidien de l'API TCGplayer (« ~24 hours old »), où Riftbound est la catégorie `89`, avec 14 groupes (OGN = 24344, etc.). Les produits portent `extendedData.Number` (`"030/298"`), et les prix sont donnés par `subTypeName` (`Normal`/`Foil`). Il propose des **archives quotidiennes depuis le 2024-02-08** (`/archive/tcgplayer/prices-YYYY-MM-DD.ppmd.7z`, format 7z, peu pratique sur mobile). Permission « implicit », sans licence formelle. **Il n'a aucune donnée Cardmarket.**

### Autres (écartés)

- **tcgapi.dev**, **Scrydex** : API commerciales avec clé et quotas (tcgapi : 100 requêtes/jour en gratuit, historique en Pro). Leur documentation ne parle pas de Cardmarket.
- **riftbound.gg / DotGG** : je n'ai trouvé aucune API publique documentée.
- **Scrapers Apify** : du scraping payant, contraire à l'esprit des CGU de Cardmarket. Écartés.

## Comparatif

| Source | Cardmarket (EUR) | TCGplayer (USD) | Champs de prix | Historique | Fréquence | Correspondance Version | Accès / conditions | Fiabilité |
|---|---|---|---|---|---|---|---|---|
| RiftHunt | ✗ (lien de recherche) | ✓ | low/mid/high/market × finition | ✗ | quotidienne | ✓ `collector_number` + `finishes` | sans clé, fair use | bonne (source de la v1) |
| Price guide Cardmarket (S3) | ✓ officiel | ✗ | avg, low, trend, avg1/7/30 × foil | pseudo (avg7/avg30) | quotidienne (~02h CET) | ✗ (nom + `idExpansion` seulement) | public, sans licence explicite | très bonne (source primaire) |
| API Cardmarket | ✓ | ✗ | idem | ✗ | — | ✗ | **fermée** | — |
| OpenRift | ✓ (`low` seul) | ✓ (market) | 1 prix par marketplace | ~30 j par Version | quotidienne | ✓ `shortCode` + `finish` → `idProduct` | sans clé, AGPL, trafic léger | moyenne (communautaire, récent) |
| tcgcsv | ✗ | ✓ | low/mid/high/market/directLow | archives depuis 2024 (7z) | quotidienne | ✓ `Number` + `subTypeName` | sans clé, permission implicite | bonne |

## Recommandation

1. **Pour la Source de prix Cardmarket**, télécharger une fois par jour `price_guide_22.json` (400 Ko) directement depuis le S3 de Cardmarket. Utiliser `trend` / `trend-foil` comme prix affiché, selon la Finition, et éventuellement `avg30` pour la tendance. C'est la donnée officielle, la plus complète et la plus fraîche.
2. **Pour faire correspondre `idProduct` et Version**, utiliser `https://openrift.app/api/v1/prices/links` + `/api/v1/catalog` (printings `language == "EN"`). On peut le faire à la mise à jour du catalogue, ou figer le résultat dans une table `version → idProduct` stockée en SQLite et embarquée dans l'APK. Une jointure par `shortCode` (`OGN-030a`) ↔ `set` + `collector_number` de RiftHunt suffit. Les Versions sans correspondance n'auront simplement pas de prix Cardmarket.
3. **Pour la Source de prix TCGplayer**, garder RiftHunt `/bulk/prices` comme en v1. tcgcsv reste une solution de secours.
4. **Pour l'historique**, quelle que soit la source, il faut le construire localement : un snapshot quotidien en SQLite.

Variante plus simple, mais moins bonne : prendre le prix Cardmarket directement dans `/api/v1/prices` d'OpenRift (un seul fichier, déjà relié aux Versions). Mais ce prix n'est que le `low`, toutes langues confondues, et on dépend entièrement d'OpenRift.

À trancher : la v2 vise-t-elle seulement les Versions anglaises ? Cardmarket mélange les langues dans son price guide, alors qu'OpenRift distingue les printings FR, KR, etc.
