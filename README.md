# Photo augmentée

Une exposition photo en réalité augmentée, sans application à installer.
Le visiteur ouvre un lien sur son téléphone et vise une photo avec sa caméra. Il voit alors apparaître sur son écran l'histoire de la photo, des effets lumineux, une vidéo ou la voix de l'artiste.

Le site a deux espaces :

| Espace | Adresse | Pour qui |
|---|---|---|
| **Visiteurs** | `https://<votre-compte>.github.io/<nom-du-projet>/` | Le public : c'est le lien du QR code |
| **Artiste** | `https://<votre-compte>.github.io/<nom-du-projet>/artiste/` | L'artiste : préparer et tester les œuvres |

Démonstration : https://luzdiva.github.io/photo-augmentee/ (espace artiste : https://dianeandz.github.io/photo-augmentee/artiste/)

---

## Installer votre propre exposition (une seule fois, 5 minutes)

1. Créez un compte gratuit sur [github.com](https://github.com) si vous n'en avez pas.
2. En haut de cette page, cliquez sur le bouton vert **« Use this template »**, puis **« Create a new repository »**.
   Donnez un nom au projet (par exemple `mon-expo`), laissez-le en **Public**, puis validez.
3. Dans votre nouveau projet, ouvrez **Settings**, puis **Pages** dans le menu de gauche.
   Sous « Branch », choisissez **main** et **/ (root)**, puis cliquez sur **Save**.
4. Patientez 1 à 2 minutes. Votre site est en ligne à l'adresse `https://<votre-compte>.github.io/mon-expo/`.

## Préparer les œuvres

Ouvrez l'espace artiste (`.../mon-expo/artiste/`), de préférence sur un ordinateur.

1. Donnez un nom à l'exposition.
2. Ajoutez chaque photo avec son titre, son lieu et sa date, son texte, et si vous le souhaitez une vidéo et un son.
3. Testez avec le bouton **« Tester »** : affichez la photo en grand à l'écran (ou utilisez le tirage) et visez-la avec la caméra.

Les œuvres sont gardées dans le navigateur de l'appareil utilisé, pas encore en ligne.

## Mettre en ligne

1. Dans l'espace artiste, cliquez sur **« Préparer le dossier »**. Un fichier `exposition.zip` est téléchargé.
2. Décompressez-le : vous obtenez un dossier `expo`.
3. Cliquez sur **« Ouvrir la page de dépôt GitHub »**, glissez le dossier `expo` dans la page, puis cliquez sur **« Commit changes »**.
4. Après 1 à 2 minutes, l'exposition est visible sur le lien des visiteurs.

À chaque modification, recommencez ces 4 étapes : le nouveau dossier remplace l'ancien.

## Bon à savoir

- **Photos sous verre** : les reflets gênent la reconnaissance. Préférez un verre antireflet ou pas de verre.
- **Photos très épurées** (grand ciel uni, brouillard) : elles sont moins bien reconnues que les photos riches en détails.
- **Vidéos et sons** : 25 Mo maximum par fichier. Une vidéo courte (10 à 20 secondes) dans le même format que la photo donne le meilleur rendu.
- **Réseau** : vérifiez que la 4G passe bien dans le lieu d'exposition, ou proposez un wifi aux visiteurs.
- **Confidentialité** : le projet est public. Tout ce qui est mis en ligne (photos réduites, textes, vidéos, sons) est consultable par n'importe qui ayant l'adresse.

## Technique

Site statique hébergé sur GitHub Pages. La reconnaissance d'image utilise [MindAR](https://github.com/hiukim/mind-ar-js) (licence MIT) et les effets 3D utilisent [three.js](https://threejs.org).

- `index.html` : espace visiteurs
- `artiste/index.html` : espace artiste
- `shared/ar.js` : moteur commun (reconnaissance et effets)
- `expo/` : l'exposition en ligne (`exposition.json`, `cibles.mind`, photos et médias), créée par l'espace artiste
