# Riftbound Collection

Application mobile personnelle pour consulter le catalogue des cartes Riftbound, suivre leur prix et gérer sa collection.

## Langage

### Catalogue

**Catalogue** :
L'ensemble de toutes les cartes Riftbound publiées, toutes extensions et versions confondues.
_À éviter_ : base, classeur (le classeur est autre chose)

**Extension** :
Un ensemble de cartes publié ensemble sous un nom et un code (ex. ORIGINS / OGN).
_À éviter_ : set, série

**Extension promo** :
Une Extension regroupant des cartes promotionnelles (OPP, PR, JDG, OGS…), par opposition aux Extensions principales. Masquée par défaut dans le Catalogue.
_À éviter_ : set auxiliaire

**Carte** :
Une carte au sens du jeu (son nom, ses règles), indépendamment de ses impressions. Ex. « Jinx ».
_À éviter_ : oracle

**Version** :
Une impression précise d'une carte dans une extension, identifiée par son numéro (ex. `OGN-042a`) : normale, Showcase, SP, overnumbered, signée… C'est l'unité de la collection, de la liste de souhaits, de la sélection du classeur et du prix.
_À éviter_ : printing, variante, carte (quand on parle d'une impression précise)

**Code de version** :
L'identifiant lisible et propre à l'app d'une Version : code d'Extension + numéro (`OGN-030a`), plus un suffixe d'édition quand deux Versions partagent un numéro (`OPP-017-metal`).
_À éviter_ : id, riftboundId, printing_id

**Finition** :
Le traitement physique d'une version : normale ou foil. Elle ne distingue que des prix.
_À éviter_ : foil/non-foil comme version

**Finition de référence** :
La Finition qui sert à valoriser une Version : normale si elle existe, sinon foil.

### Prix

**Source de prix** :
La place de marché d'où provient un prix : TCGplayer (Amérique) ou Cardmarket (Europe).
_À éviter_ : marché, fournisseur

**Devise d'affichage** :
La devise dans laquelle l'utilisateur choisit de voir les prix : CAD, USD ou EUR. Indépendante de la source de prix.
_À éviter_ : monnaie

**Indicateur de référence** :
L'indicateur de prix retenu pour une Source de prix : `market` pour TCGplayer, `trend` pour Cardmarket. C'est lui qu'on affiche et qu'on historise.
_À éviter_ : prix moyen, prix du marché (ambigus)

**Variation de prix** :
L'évolution en pourcentage de l'Indicateur de référence d'une Version sur une période (7 ou 30 jours), calculée dans la devise d'origine de la source.
_À éviter_ : tendance (le `trend` Cardmarket est autre chose)

**Valeur de la collection** :
La somme, sur la Collection, de la quantité × le prix de la Finition de référence, dans la Source de prix et la Devise d'affichage choisies. Les Versions sans prix en sont exclues et comptées à part.

**Relevé de prix** :
La valeur d'un prix pour une Version, une Source de prix et une Finition à une date donnée. L'ensemble des relevés forme l'historique.
_À éviter_ : snapshot, cotation

### Nature des données

**Données de référence** :
Ce que l'app télécharge et peut reconstruire à tout moment : Catalogue, prix du jour, taux de change.
_À éviter_ : cache

**Données précieuses** :
Ce qui ne peut pas être retéléchargé et ne doit jamais être perdu : Collection, Liste de souhaits, Sélection du classeur, réglages, historique des Relevés de prix.
_À éviter_ : données utilisateur (trop vague)

### Données personnelles

**Collection** :
Les cartes que l'utilisateur possède, chacune avec une quantité.
_À éviter_ : inventaire, « cartes cochées »

**Liste de souhaits** :
Les Versions que l'utilisateur veut acquérir et dont il surveille le prix depuis leur date d'ajout.
_À éviter_ : wishlist, favoris

**Sélection du classeur** :
Les cartes que l'utilisateur veut voir figurer dans son classeur imprimé (export PDF A4, 3 × 3).
_À éviter_ : cartes retirées, cartes à imprimer

**Sauvegarde** :
Un fichier JSON contenant les données personnelles de l'utilisateur, exportable puis importable sur un autre appareil.
_À éviter_ : backup, classeur actualisé

## Noms dans le code

Le code est écrit en anglais. Chaque terme du glossaire y porte un seul nom :

| Terme | Nom dans le code |
|---|---|
| Catalogue | `Catalog` |
| Extension | `Expansion` (jamais `Set`, type natif JavaScript) |
| Extension promo | `isPromo` sur `Expansion` |
| Carte | `Card` |
| Version | `Printing` (jamais `Version`, réservé aux versions de schéma, de sauvegarde, d'app) |
| Code de version | `PrintingCode` |
| Finition | `Finish` |
| Finition de référence | `referenceFinish` |
| Source de prix | `PriceSource` (`tcgplayer` / `cardmarket`) |
| Indicateur de référence | `referenceMetric` |
| Relevé de prix | `PriceRecord` |
| Variation de prix | `priceChange` |
| Devise d'affichage | `DisplayCurrency` |
| Collection | `Collection` |
| Valeur de la collection | `collectionValue` |
| Liste de souhaits | `Wishlist` |
| Sélection du classeur | `BinderSelection` |
| Sauvegarde | `Backup` |
| Données de référence | `ReferenceData` |
| Données précieuses | `PreciousData` |

En français, « printing » reste à éviter ; dans le code, `Printing` est le nom officiel.
