# Parfumerie des Princes — Application boutique

Application mobile web pour la boutique Parfumerie des Princes à Bouaké, Côte d'Ivoire.

## Fonctionnalités

- Catalogue produits par catégorie (Parfums, Sacs, Chaînes, Porte-monnaie)
- Recherche en temps réel
- Filtres par prix à l'intérieur de chaque catégorie
- Favoris sauvegardés dans le navigateur
- Panier avec quantités ajustables
- Commande directe via WhatsApp
- Page contact avec horaires
- Panneau d'administration (numéro WhatsApp, nom boutique, adresse)

## Structure

```
pdp-boutique/
├── index.html      # Structure de l'application
├── style.css       # Design bleu marine & or
├── products.js     # Catalogue produits (à remplacer par Google Sheets)
├── app.js          # Logique navigation, panier, favoris, recherche
└── README.md
```

## Déploiement GitHub Pages

```bash
git init
git add .
git commit -m "init Parfumerie des Princes boutique"
git remote add origin https://github.com/automatisation70-maker/pdp-boutique.git
git push -u origin master
```

Puis : Settings → Pages → Deploy from branch → master → Save

URL : `https://automatisation70-maker.github.io/pdp-boutique/`

## Configuration admin

Sur le site, cliquer sur l'icône ⚙ en haut à droite pour configurer :
- Numéro WhatsApp de la boutique
- Nom de la boutique
- Adresse

## Mise à jour des produits

Modifier `products.js` — chaque produit a cette structure :

```js
{ id:'PARF-001', name:'Oud Royal', cat:'Parfum', price:35000, emoji:'🌹', badge:'NOUVEAU', bg:'#f5f0ea', desc:'Description du produit.' }
```

Catégories disponibles : `Parfum` | `Sac` | `Chaine` | `Porte-monnaie`
