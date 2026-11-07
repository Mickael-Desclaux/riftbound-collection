# Ce que l'API RiftHunt fournit réellement

> Recherche pour l'issue #2. Sources primaires : la [documentation de l'API](https://rifthunt.com/api/), le [guide de syntaxe](https://rifthunt.com/syntax/), les [conditions d'utilisation](https://rifthunt.com/terms/), et des appels réels à `https://api.rifthunt.com` effectués le **2026-11-07** (extraits JSON ci‑dessous). Les chiffres (nombre de Versions, etc.) évoluent à chaque Extension.

## En bref

- API publique, **gratuite, sans clé, sans inscription, sans quota dur**, CORS ouvert, GET + JSON uniquement. Usage commercial autorisé.
- Une seule **Source de prix : TCGplayer**, en **USD**, rafraîchie **une fois par jour**. Indicateurs `market`, `low`, `mid`, `high`, `directLow`, séparés par **Finition** (`normal` / `foil`).
- **Aucun prix Cardmarket** : seulement un lien de recherche Cardmarket par nom (pas d'identifiant produit Cardmarket).
- **Aucun historique des prix** : uniquement un instantané courant par Version. L'historique devra être construit par l'app (un relevé par jour).
- Le catalogue couvre tous les filtres prévus : Extension, numéro, rareté, type (+ supertype), domaine(s), variante, artiste, images, Finitions.
- Identifiants stables : `printing_id` (UUID par Version), `oracle_id` (UUID par Carte), `tcgId` (id produit TCGplayer, 1:1 avec les lignes de prix). `riftboundId` (id Riot) **n'est pas unique**.

## Endpoints

D'après la [doc](https://rifthunt.com/api/#endpoints) :

| Requête | Rôle |
|---|---|
| `GET /sets`, `/sets/:code` | Extensions avec nombre de Versions |
| `GET /bulk-data` | Index des exports massifs |
| `GET /bulk/cards` | Tout le catalogue (toutes les Versions) |
| `GET /bulk/prices` | Prix TCGplayer de toutes les Versions ayant un produit TCGplayer |
| `GET /prices/:riftboundId` | Prix d'une Version |
| `GET /cards/search?q=…` | Recherche (même syntaxe que le site), `unique=cards\|prints\|art`, `order=`, `dir=`, paginée (175 par page, `next_page`) |
| `GET /cards/named?exact=…`, `/cards/:id` | Une Version par nom exact / UUID |
| `GET /cards/:id/rulings`, `/bulk/rulings` | Rulings (Riftbound FAQ, CC BY‑SA 4.0) |
| `GET /tags…`, `/cards/:id/tags`, `/bulk/tags` | Tags communautaires |
| `GET /health` | `{"status":"ok"}` |

Mesures réelles (2026-11-07) :

| Endpoint | Taille | `cache-control` | Fraîcheur |
|---|---|---|---|
| `/sets` | 2 Ko, 11 Extensions | `max-age=3600, s-maxage=86400` | — |
| `/bulk/cards` | **1,56 Mo**, 1725 Versions | `max-age=3600, s-maxage=86400, swr=604800` | `fetched: 2026-10-29` |
| `/bulk/prices` | **0,86 Mo**, 1688 lignes | `max-age=300, s-maxage=900, swr=86400` | `updatedAt: 2026-11-06T17:01Z` sur toutes les lignes |

La doc demande de ne pas télécharger `/bulk/cards` plus d'une fois par jour (« card data only changes when a set does »).

Extensions présentes (`/sets`) : `sgn`, `rwb`, `ogn`, `ogs`, `opp`, `pr`, `jdg`, `sfd`, `unl`, `ven`, `rad` — dont plusieurs Extensions de promos (`opp` = 221 Versions).

```json
{"object":"set","id":"a9f1b442-…","code":"ogn","name":"Origins","names":{"en":"Origins"},"release_date":"2025-10-31T00:00:00.000Z","card_count":352}
```

## Champs par Version

Deux formes coexistent : l'**objet carte** (`/cards/*`, snake_case, documenté) et la **ligne de `/bulk/cards`** (camelCase, « in the shape the site builds from »).

### `/bulk/cards` (forme réelle observée)

Enveloppe : `{ "cards": [...], "sets": [...], "fetched": "...", "source": "riotgames.com" }`.

```json
{
  "id": "ogn-001-298", "riftboundId": "ogn-001-298",
  "name": "Blazing Scorcher", "cleanName": "Blazing Scorcher", "num": 1,
  "energy": 5, "might": 5, "power": null,
  "type": "Unit", "supertype": null, "rarity": "Common", "domains": ["Fury"],
  "text": "…", "rich": "<p>…</p>", "flavour": null,
  "set": "OGN", "setName": "Origins", "tags": ["Dragon","Noxus"], "artist": "Envar Studio",
  "tcgId": "652771",
  "imgUrl": "https://cmsassets.rgpub.io/…-744x1039.png?accountingTag=RB",
  "img": "cards/ogn-001-298.png", "orientation": "portrait",
  "alt": false, "sig": false, "over": false, "imgHash": "8de89b4b8fb3"
}
```

Valeurs observées sur les 1725 Versions :

- `rarity` : Common 371, Uncommon 311, Rare 313, Epic 181, Showcase 323, Promo 226.
- `type` : Unit 885, Spell 293, Legend 210, Gear 161, Rune 96, Battlefield 80. `supertype` : Champion, Basic, Signature, Token ou `null`.
- `domains` : Fury, Calm, Mind, Body, Chaos, Order, Colorless (tableau, plusieurs possibles).
- Variantes : booléens `alt` (127), `over` (107), `sig` (60). Les promos **Metal** ne sont signalées que par le suffixe du nom (`(Metal)`).
- `orientation` : `portrait` / `landscape` (les 80 Battlefields).
- `num` est un **nombre** : le suffixe du numéro (`007a`, `303s`) est perdu ; il reste dans `riftboundId` (`ogn-007a-298`, `ogn-303*-298`).

⚠️ **Écart avec la doc** : la doc affirme que `/bulk/cards` porte `printing_id`, `oracle_id` et `finishes` ; la réponse réelle n'en contient **aucun** (et `id` vaut parfois `dotgg:RAD-015-P`, la doc annonce d'ailleurs que `id` est déprécié). La v1 ne doit donc pas compter dessus ; pour les Finitions, voir plus bas.

### Objet carte (`/cards/search?…&unique=prints`)

```json
{
  "object": "card",
  "id": "ffada028-…", "printing_id": "ffada028-…", "oracle_id": "ca7c49d5-…",
  "lang": "en", "name": "Annie, Dark Child", "oracle_name": "Annie, Dark Child",
  "type": "Legend", "domains": ["fury","chaos"], "keywords": [], "tags": ["annie"],
  "set": "opp", "set_name": "…", "collector_number": "017", "rarity": "promo",
  "artist": "Six More Vodka", "variant": null, "riftbound_id": "opp-017-024",
  "images": {"small": "https://images.rifthunt.com/cards/small/front/opp/017/annie-dark-child.webp?v=82890abab27c",
             "normal": "…", "large": "…"},
  "tcg_id": "680247", "finishes": ["foil"],
  "purchase_uris": {"tcgplayer": "https://tcgplayer.pxf.io/…",
                    "cardmarket": "https://www.cardmarket.com/en/Riftbound/Products/Search?searchString=Annie%2C%20Dark%20Child"},
  "prices": {"currency": "USD", "source": "tcgplayer", "updated_at": "2026-11-06T17:01:38.634Z",
             "foil": {"low": 22, "mid": 30.69, "high": 75, "market": 28.9, "direct_low": null},
             "normal": {"low": null, "mid": null, "high": null, "market": null, "direct_low": null}}
}
```

- `collector_number` est une chaîne avec suffixe (`"017"`, `"303s"`) — c'est le bon champ pour le numéro de Version.
- `variant` : `alternate`, `overnumbered`, `signature` ou `null` (Metal → seulement dans le nom).
- `images` : WebP `small` (200 px), `normal` (480 px), `large` (744×1039) sur `images.rifthunt.com`, immuables (le `?v=` change si l'image change), plus `back` pour les jetons recto‑verso.
- `finishes` : `["normal","foil"]`, `["foil"]`, `["normal"]` ou `null` (pas de produit TCGplayer).
- Langue : `"en"` uniquement.

### Couverture des filtres prévus

| Filtre | Champ | Filtre côté API (`/cards/search`) |
|---|---|---|
| Extension | `set` | `s:ogn`, `set:vendetta` |
| Numéro | `collector_number` | `num:120` |
| Rareté | `rarity` | `r:epic` |
| Type | `type` / `supertype` | `t:unit`, `t:champion` |
| Domaine(s) | `domains` | `d:fury`, `d=fury,calm`, `d<=fury,calm` |
| Variante | `variant` (+ nom pour Metal) | `is:alternate`, `is:overnumbered`, `is:signature`, `is:special`, `is:variant` |
| Finitions | `finishes` | pas de filtre dédié ; `usd>=…` (normal) / `usdfoil` |
| Images | `images` | — |
| Autres | `energy`, `power`, `might`, `artist`, `keywords`, `tags` | `e:`, `p:`, `m:`, `a:`, `kw:`, `tag:`, `f:standard`, `banned:` |

Source : [guide de syntaxe](https://rifthunt.com/syntax/). Pour l'app (filtres locaux sur SQLite), tout est présent dans les données ; la recherche API n'est utile que si l'on ne stocke pas le catalogue.

## Prix

`/bulk/prices` — enveloppe `{ "currency": "USD", "source": "tcgplayer", "fetched": "…", "prices": [...] }` :

```json
{
  "printing_id": "3ca56a38-…", "riftboundId": "jdg-059-221", "collector": "059",
  "slug": "svellsongur", "tcgId": "692372",
  "purchaseUri": "https://tcgplayer.pxf.io/…/product/692372",
  "updatedAt": "2026-11-06T17:01:38.634Z",
  "finishes": {
    "foil":   {"low": 254.46, "mid": 270, "high": 399.99, "market": 194.45, "directLow": null},
    "normal": {"low": null, "mid": null, "high": null, "market": null, "directLow": null}
  }
}
```

- **Source** : TCGplayer uniquement (`source: "tcgplayer"`). Le pied de page du site : « Card prices are daily estimates from TCGplayer ».
- **Devise** : USD uniquement. La conversion vers CAD/EUR (Devise d'affichage) est à la charge de l'app.
- **Indicateurs** : `market`, `low`, `mid`, `high`, `directLow` (ce dernier `null` sur les 1688 lignes observées).
- **Finitions** : chaque ligne porte **toujours** `normal` et `foil`, même si la Version n'existe pas dans cette Finition. Selon la doc, une Finition absente de `finishes` (objet carte) n'existe pas ; présente mais à `null` = existe sans offre. Comme `/bulk/cards` n'a pas `finishes`, il faut soit l'objet carte, soit traiter « tout `null` » comme « pas de prix ».
- **Couverture** : 1688 lignes (Versions avec produit TCGplayer) sur 1725 ; 24 lignes entièrement `null`. 37 Versions sans `tcgId` → jamais de prix.
- **Fréquence** : quotidienne ; toutes les lignes avaient le même `updatedAt` (2026-11-06 17:01 UTC).
- `/prices/:riftboundId` renvoie la même chose pour une Version (`fetched_at`, clés snake_case) — mais `riftboundId` n'est pas unique, préférer le bulk.

### Cardmarket

Aucun prix Cardmarket dans l'API. Le seul élément est `purchase_uris.cardmarket`, une **URL de recherche par nom** (pas d'id produit Cardmarket). La Source de prix Cardmarket devra venir d'ailleurs (voir une autre recherche).

### Historique des prix

**Inexistant.** Aucun endpoint d'historique dans la doc ; les essais `/prices/:id/history`, `/prices/history`, `/bulk/prices/history`, `/cards/:id/prices` renvoient 404, et `?history=true` est ignoré (même instantané). La doc parle de « price snapshots » : un seul instantané courant. Pour une courbe de prix, l'app doit **stocker elle‑même un relevé par jour** (le bulk de 0,86 Mo est fait pour ça).

## Conditions, débit, clé

D'après la [doc](https://rifthunt.com/api/) et les [CGU](https://rifthunt.com/terms/) :

- Pas de clé, pas de compte (sauf pour *ajouter* des tags), usage commercial autorisé.
- Pas de limite imposée, mais : rester sous ~10 requêtes/s, temporiser les boucles, utiliser les exports bulk au‑delà de quelques centaines de cartes, envoyer un **User‑Agent identifiant le projet**. Sinon : bridage ou blocage possible.
- Ne pas présenter l'app comme officielle Riot / approuvée par Riot ou TCGplayer. Les noms, textes et images restent la propriété de Riot (politique « Legal Jibber Jabber »). Lien retour apprécié, pas obligatoire.
- Les liens TCGplayer (`purchaseUri`, `purchase_uris.tcgplayer`) sont des liens d'affiliation RiftHunt ; on peut les garder ou construire les siens avec `tcgId`.
- Rulings : CC BY‑SA 4.0, attribution à conserver si republiés.

## Identifiants stables pour l'appariement

| Identifiant | Portée | Où | Remarques |
|---|---|---|---|
| `printing_id` (= `id` de l'objet carte) | Version | objet carte, `/bulk/prices` | UUID « permanent » selon la doc ; **absent** de `/bulk/cards` en pratique |
| `oracle_id` | Carte | objet carte | UUID permanent partagé par toutes les Versions |
| `tcgId` / `tcg_id` | Version | partout | Id produit TCGplayer ; **1:1** entre `/bulk/cards` et `/bulk/prices` (1688/1688, aucun doublon). Meilleure clé vers TCGplayer. `null` pour 37 Versions |
| `riftboundId` | ~Version | partout | Id Riot (`ogn-025-298`). **Pas unique** : 24 groupes / 48 Versions partagés (promos Metal/Top 8…) |
| `set` + `collector_number` | Version | objet carte | Lisible, correspond au numéro de Version du glossaire (`OGN-042a`) |
| `slug` | Version | `/bulk/prices`, `rifthunt_uri` | Spécifique à RiftHunt |
| Cardmarket | — | — | **Aucun id produit** ; appariement Cardmarket à faire par nom + Extension + numéro |

Conséquences pour la v2 :

- Joindre catalogue et prix sur **`tcgId`** (la v1 joint sur `riftboundId` + `collector` + `slug`, comme recommandé par la doc, mais `tcgId` est plus simple et vérifié 1:1).
- Clé interne de Version : `set` + `collector_number`, avec `printing_id` en identifiant RiftHunt si l'on utilise l'objet carte (recherche paginée `unique=prints`, ~10 pages pour tout le catalogue) plutôt que `/bulk/cards`.
