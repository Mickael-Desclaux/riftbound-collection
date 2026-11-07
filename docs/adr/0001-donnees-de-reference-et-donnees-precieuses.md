# Données de référence et données précieuses, reliées par le Code de version

La base SQLite est séparée en deux familles. Les **Données de référence** (Catalogue, prix du jour, taux de change) sont téléchargées et peuvent être effacées puis reconstruites à tout moment, par exemple lors d'une migration de schéma. Les **Données précieuses** (Collection, Liste de souhaits, Sélection du classeur, réglages, historique des Relevés de prix) ne sont jamais effacées. Elles désignent les Versions par leur **Code de version** lisible (`OGN-030a`, `OPP-017-metal` pour les éditions promo qui partagent un numéro), et non par une clé étrangère vers le Catalogue ni par l'identifiant d'une source (`printing_id` RiftHunt, `tcgId`, `idProduct` Cardmarket).

Nous l'avons choisi pour qu'une Sauvegarde reste lisible et valable même si une source disparaît ou renumérote ses identifiants, et pour pouvoir reconstruire le Catalogue sans toucher aux données de l'utilisateur.

## Conséquences

- Pas d'intégrité référentielle entre les deux familles. Une ligne de Collection peut viser un Code de version absent du Catalogue : l'interface l'affiche comme « version inconnue », elle ne la supprime pas.
- Le calcul du Code de version (préfixe d'Extension, numéro avec suffixe, suffixe d'édition `metal` / `top8` / `champion`) est une règle métier critique. Elle doit être déterministe et testée : la changer impose une migration des Données précieuses.
