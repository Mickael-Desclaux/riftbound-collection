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

**Carte** :
Une carte au sens du jeu (son nom, ses règles), indépendamment de ses impressions. Ex. « Jinx ».
_À éviter_ : oracle

**Version** :
Une impression précise d'une carte dans une extension, identifiée par son numéro (ex. `OGN-042a`) : normale, Showcase, SP, overnumbered, signée… C'est l'unité de la collection, de la liste de souhaits, de la sélection du classeur et du prix.
_À éviter_ : printing, variante, carte (quand on parle d'une impression précise)

**Finition** :
Le traitement physique d'une version : normale ou foil. Elle ne distingue que des prix.
_À éviter_ : foil/non-foil comme version

### Prix

**Source de prix** :
La place de marché d'où provient un prix : TCGplayer (Amérique) ou Cardmarket (Europe).
_À éviter_ : marché, fournisseur

**Devise d'affichage** :
La devise dans laquelle l'utilisateur choisit de voir les prix : CAD, USD ou EUR. Indépendante de la source de prix.
_À éviter_ : monnaie

### Données personnelles

**Collection** :
Les cartes que l'utilisateur possède, chacune avec une quantité.
_À éviter_ : inventaire, « cartes cochées »

**Liste de souhaits** :
Les cartes que l'utilisateur veut acquérir et dont il surveille le prix.
_À éviter_ : wishlist, favoris

**Sélection du classeur** :
Les cartes que l'utilisateur veut voir figurer dans son classeur imprimé (export PDF A4, 3 × 3).
_À éviter_ : cartes retirées, cartes à imprimer

**Sauvegarde** :
Un fichier JSON contenant les données personnelles de l'utilisateur, exportable puis importable sur un autre appareil.
_À éviter_ : backup, classeur actualisé
