# Secret Santa

Tirage au sort de Secret Santa sur un seul téléphone qu'on se passe.
Voir [CADRAGE.md](CADRAGE.md) pour le besoin détaillé.

## Utilisation
Ouvrir `index.html` dans un navigateur (aucune installation, aucun serveur, fonctionne hors ligne).

1. Saisir l'événement (nom, budget, date), les participants et les exclusions.
2. Lancer le tirage.
3. Passer le téléphone : chacun touche son prénom, confirme, ouvre son paquet cadeau pour découvrir son destinataire, puis le cache.

De temps en temps, un clic déclenche une surprise (prout, Père Noël en traîneau, boule de neige, renne…).
L'ouverture du paquet joue un petit jingle (bouton cloche en haut à droite pour couper le son).

## Tests
```bash
node secret-santa/draw.test.cjs
```
