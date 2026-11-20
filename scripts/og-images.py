#!/usr/bin/env python3
"""Visuels Open Graph de l'agence — 1200×630, un par article et par commune.

POURQUOI CE SCRIPT EXISTE

Les aperçus de partage des articles pointaient sur `images.unsplash.com` :
des photos de banque, servies par un tiers, sans rapport avec l'agence et
susceptibles de disparaître. Un lien partagé sur un réseau affichait donc une
image qui n'était ni celle de l'article, ni celle du site.

Ceux-ci sont composés aux couleurs et à la typographie du site — Ink Navy,
Brass, Fraunces pour le titre, IBM Plex Mono pour le surtitre — et ne
contiennent QUE ce que la page porte déjà : son titre, sa commune, le nom de
l'agence. Aucune accroche inventée, aucun chiffre.

POURQUOI PYTHON ET NON LE SCRIPT DE PRÉRENDU

Composer une image demande un moteur de rendu. Le projet n'a ni `sharp` ni
`canvas`, et en ajouter un pour quatre cents lignes de dessin serait une
dépendance binaire de plus à faire vivre. Pillow est là, les polices sont
celles du site, et les images produites sont versionnées : le déploiement n'a
donc aucune dépendance Python.

À RELANCER QUAND UN ARTICLE PARAÎT : `npm run og`. Le prérendu retombe sur
l'ancien visuel tant que le fichier n'existe pas, donc un oubli dégrade sans
casser.
"""

import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

RACINE = pathlib.Path(__file__).resolve().parent.parent
ARTICLES = RACINE / "src" / "data" / "articles"
POLICES = RACINE / "public" / "fonts"
SORTIE = RACINE / "public" / "og"

LARGEUR, HAUTEUR = 1200, 630

# Les jetons de `tailwind.config.js`, à la valeur près.
INK = (16, 20, 28)
STONE = (237, 234, 227)
BRASS = (176, 141, 87)


def police(nom, taille, poids=None):
    """Charge une police du site, convertie en TTF à la volée.

    Pillow ne lit pas le woff2 ; `fontTools` le déballe sans rien recompresser,
    donc sans perte. Le fichier intermédiaire vit le temps du script.
    """
    from fontTools.ttLib import TTFont

    source = POLICES / f"{nom}.woff2"
    cible = pathlib.Path(tempfile.gettempdir()) / f"immovia-og-{nom}.ttf"
    if not cible.exists():
        f = TTFont(source)
        f.flavor = None
        f.save(cible)

    fonte = ImageFont.truetype(str(cible), taille)
    if poids is not None:
        try:
            fonte.set_variation_by_axes([poids])
        except OSError:
            # Police statique : la graisse est déjà celle du fichier.
            pass
    return fonte


def coupe(texte, fonte, largeur_max, lignes_max):
    """Découpe un titre en lignes, au mot, et abrège s'il déborde."""
    mots, lignes, courante = texte.split(), [], ""
    jauge = ImageDraw.Draw(Image.new("RGB", (1, 1)))

    for mot in mots:
        essai = f"{courante} {mot}".strip()
        if jauge.textlength(essai, font=fonte) <= largeur_max:
            courante = essai
            continue
        if courante:
            lignes.append(courante)
        courante = mot
        if len(lignes) == lignes_max:
            break

    if courante and len(lignes) < lignes_max:
        lignes.append(courante)

    if len(lignes) == lignes_max and len(" ".join(lignes).split()) < len(mots):
        derniere = lignes[-1]
        while derniere and jauge.textlength(derniere + " …", font=fonte) > largeur_max:
            derniere = derniere.rsplit(" ", 1)[0]
        lignes[-1] = derniere + " …"

    return lignes


def compose(surtitre, titre, chemin):
    """Une image : fond Ink, cadre Brass, surtitre, titre, marque."""
    img = Image.new("RGB", (LARGEUR, HAUTEUR), INK)
    d = ImageDraw.Draw(img)

    # Équerres d'angle — la signature graphique du site (`PlanFrame`).
    m, b = 48, 56
    for x, y, dx, dy in ((m, m, 1, 1), (LARGEUR - m, m, -1, 1),
                         (m, HAUTEUR - m, 1, -1), (LARGEUR - m, HAUTEUR - m, -1, -1)):
        d.line([(x, y), (x + dx * b, y)], fill=BRASS, width=2)
        d.line([(x, y), (x, y + dy * b)], fill=BRASS, width=2)

    f_sur = police("ibm-plex-mono-500-latin", 22)
    f_titre = police("fraunces-400-600-latin", 62, 600)
    f_marque = police("fraunces-400-600-latin", 34, 600)

    gauche, y = 104, 150

    if surtitre:
        # Espacement des lettres fait à la main. Une espace fine U+2009 serait
        # plus juste typographiquement, mais le sous-ensemble latin d'IBM Plex
        # Mono ne la contient pas : chaque lettre sortait suivie d'un tofu.
        espace = " ".join(surtitre.upper())
        d.text((gauche, y), espace, font=f_sur, fill=BRASS)
        y += 56

    for ligne in coupe(titre, f_titre, LARGEUR - 2 * gauche, 4):
        d.text((gauche, y), ligne, font=f_titre, fill=STONE)
        y += 78

    # Filet et marque, en pied.
    d.line([(gauche, HAUTEUR - 120), (gauche + 64, HAUTEUR - 120)], fill=BRASS, width=2)
    d.text((gauche, HAUTEUR - 100), "IMMOVIA", font=f_marque, fill=STONE)

    chemin.parent.mkdir(parents=True, exist_ok=True)
    img.save(chemin, "PNG", optimize=True)
    return chemin


def communes_traitees(articles):
    """Les communes qui ont une page, c'est-à-dire celles dont on a parlé."""
    sortie = subprocess.run(
        ["node", "--input-type=module", "-e",
         "const m = await import('./api/_lib/articleTexte.js');"
         "const a = JSON.parse(process.argv[1]);"
         "console.log(JSON.stringify(m.communesAvecPage([], a)))",
         json.dumps(articles)],
        cwd=RACINE, capture_output=True, text=True, check=True,
    )
    return json.loads(sortie.stdout)


def main():
    articles = [json.loads(f.read_text()) for f in sorted(ARTICLES.glob("*.json"))]
    faits = 0

    for a in articles:
        chemin = SORTIE / f"blog-{a['slug']}.png"
        compose(a.get("ville") or "Moselle-Est", a["titre"], chemin)
        faits += 1

    for c in communes_traitees(articles):
        chemin = SORTIE / f"commune-{c['slug']}.png"
        compose("Agence immobilière", c["nom"], chemin)
        faits += 1

    poids = sum(f.stat().st_size for f in SORTIE.glob("*.png"))
    print(f"  ✓ {faits} visuels Open Graph — {poids / 1024:.0f} Ko au total")


if __name__ == "__main__":
    sys.exit(main())
