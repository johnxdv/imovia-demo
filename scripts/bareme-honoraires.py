#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère `public/documents/bareme-honoraires-immovia.pdf`.

Le contenu — tranches, pourcentages, montants, mentions — reprend mot pour mot
le barème officiel transmis par l'agence. Rien n'y est calculé, arrondi ni
reformulé : les chaînes ci-dessous SONT le document. Toute correction du barème
se fait ici, puis on régénère :

    python3 scripts/bareme-honoraires.py

La mise en forme, elle, reprend l'identité du PDF qui occupait déjà cette place
sur le site : Ink Navy, Warm Stone, filet laiton, grotesque neutre, pavé d'adresse en
pied de page.
"""

import os
from pathlib import Path

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# Police embarquée.
#
# Les Helvetica « base 14 » du PDF ne portent pas de vrai glyphe €, et le signe
# que les lecteurs y substituent déborde de la chasse déclarée : « 60 001€ à »
# s'affichait « 60 001€à », espace avalée. Une TrueType embarquée règle la
# question — la police voyage dans le fichier, les métriques sont les siennes,
# et le rendu est le même d'un lecteur à l'autre. On prend la Bitstream Vera
# livrée avec ReportLab : grotesque neutre dans l'esprit de l'Helvetica du
# document d'origine, couverture complète (€, ², °, apostrophe courbe), et
# aucune dépendance à installer.
_FONTS = os.path.join(os.path.dirname(reportlab.__file__), 'fonts')
REGULIER, GRAS = 'Bareme', 'BaremeGras'
pdfmetrics.registerFont(TTFont(REGULIER, os.path.join(_FONTS, 'Vera.ttf')))
pdfmetrics.registerFont(TTFont(GRAS, os.path.join(_FONTS, 'VeraBd.ttf')))
pdfmetrics.registerFontFamily(REGULIER, normal=REGULIER, bold=GRAS)

# Palette du site (tailwind.config.js) — ne pas improviser d'autres teintes.
INK = colors.HexColor('#10141C')
STONE = colors.HexColor('#EDEAE3')
BRASS = colors.HexColor('#B08D57')
FILET = colors.HexColor('#CFC9BC')
GRIS = colors.HexColor('#6B6B6B')

MARGE = 24.13 * mm
LARGEUR_UTILE = A4[0] - 2 * MARGE

PIED = (
    'IMMOVIA — 41A rue Principale, 57980 Diebling — '
    '03 72 29 43 76 — contact@immo-via.com'
)

# --------------------------------------------------------------------------
# Contenu du barème — source de vérité, recopié tel quel.
# --------------------------------------------------------------------------

TRANCHES_VENTE = [
    ('MONTANT DE LA TRANSACTION', 'HONORAIRES (TTC)'),
    ('0 à 60 000€', '10%'),
    ('60 001€ à 100 000€', '8%'),
    ('100 001€ à 150 000€', '7%'),
    ('150 001€ à 200 000€', '6%'),
    ('200 001€ à 500 000€', '5%'),
    ('Au-delà de 500 000€', '4%'),
]

MENTIONS_VENTE = [
    'Les honoraires sont à la charge du vendeur (sauf convention contraire)',
    'Honoraires minimum : 5000€ TTC',
]

HABITATION_CHAPEAU = (
    'Pour les baux d’habitation nus ou meublés soumis aux dispositions '
    'de la loi n°89-462 du 6 juillet 1989, les honoraires de location sont '
    'appliqués conformément à la réglementation en vigueur :'
)

HABITATION_LIGNES = [
    'Honoraires de visite, constitution du dossier et rédaction du bail : '
    '8€/m²',
    'Honoraires de réalisation de l’état des lieux : 3 €/m²',
    '(plafond applicable hors zone tendue)',
]

COMMERCIAUX_LIGNES = [
    '20% TTC du loyer annuel HT',
    'Honoraires à la charge du preneur',
    '(sauf convention contraire)',
]

# --------------------------------------------------------------------------
# Styles
# --------------------------------------------------------------------------

def _style(nom, **kw):
    base = dict(
        name=nom,
        fontName=REGULIER,
        fontSize=10,
        leading=14,
        textColor=INK,
        alignment=TA_LEFT,
    )
    base.update(kw)
    return ParagraphStyle(**base)


MARQUE = _style('marque', fontName=GRAS, fontSize=20, leading=22)
SURTITRE = _style(
    'surtitre', fontName=GRAS, fontSize=9, leading=12, textColor=BRASS
)
SECTION = _style('section', fontName=GRAS, fontSize=13, leading=18)
SOUS_SECTION = _style(
    'sousSection', fontName=GRAS, fontSize=10.5, leading=15
)
TEXTE = _style('texte', fontSize=9.5, leading=14)
NOTE = _style('note', fontSize=9, leading=13, textColor=GRIS)
PIED_STYLE = _style('pied', fontSize=8, leading=12, textColor=GRIS)


def tableau_vente():
    """Le tableau des six tranches, en-tête compris."""
    colonnes = [LARGEUR_UTILE * 0.62, LARGEUR_UTILE * 0.38]
    t = Table(TRANCHES_VENTE, colWidths=colonnes, rowHeights=[26] * len(TRANCHES_VENTE))
    style = [
        # En-tête
        ('BACKGROUND', (0, 0), (-1, 0), INK),
        ('TEXTCOLOR', (0, 0), (-1, 0), STONE),
        ('FONTNAME', (0, 0), (-1, 0), GRAS),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        # Corps
        ('FONTNAME', (0, 1), (-1, -1), REGULIER),
        ('FONTSIZE', (0, 1), (-1, -1), 9.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), INK),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, FILET),
        ('BOX', (0, 0), (-1, -1), 0.5, FILET),
    ]
    # Alternance Warm Stone / blanc sur les six tranches.
    for i in range(1, len(TRANCHES_VENTE)):
        if i % 2 == 1:
            style.append(('BACKGROUND', (0, i), (-1, i), STONE))
        else:
            style.append(('BACKGROUND', (0, i), (-1, i), colors.white))
    t.setStyle(TableStyle(style))
    return t


def construire(chemin):
    doc = BaseDocTemplate(
        str(chemin),
        pagesize=A4,
        leftMargin=MARGE,
        rightMargin=MARGE,
        topMargin=MARGE,
        bottomMargin=MARGE,
        title='Barème d’honoraires — IMMOVIA',
        author='IMMOVIA',
        subject='Barème d’honoraires de vente et de location',
    )
    cadre = Frame(
        MARGE, MARGE, LARGEUR_UTILE, A4[1] - 2 * MARGE, id='corps',
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id='page', frames=[cadre])])

    flux = [
        Paragraph('IMMOVIA', MARQUE),
        Spacer(1, 4),
        Paragraph('BARÈME D’HONORAIRES', SURTITRE),
        Spacer(1, 26),

        Paragraph('HONORAIRES DE VENTE', SECTION),
        Spacer(1, 10),
        tableau_vente(),
        Spacer(1, 12),
    ]
    for ligne in MENTIONS_VENTE:
        flux.append(Paragraph(ligne, TEXTE))
    flux.append(Spacer(1, 28))

    flux.append(Paragraph('HONORAIRES DE LOCATION', SECTION))
    flux.append(Spacer(1, 12))
    flux.append(Paragraph('Habitation :', SOUS_SECTION))
    flux.append(Spacer(1, 6))
    flux.append(Paragraph(HABITATION_CHAPEAU, TEXTE))
    flux.append(Spacer(1, 6))
    for ligne in HABITATION_LIGNES:
        flux.append(Paragraph(ligne, NOTE if ligne.startswith('(') else TEXTE))
    flux.append(Spacer(1, 18))

    flux.append(Paragraph('Locaux commerciaux ou professionnels :', SOUS_SECTION))
    flux.append(Spacer(1, 6))
    for ligne in COMMERCIAUX_LIGNES:
        flux.append(Paragraph(ligne, NOTE if ligne.startswith('(') else TEXTE))

    flux.append(Spacer(1, 34))
    flux.append(Paragraph(PIED, PIED_STYLE))

    doc.build(flux)


if __name__ == '__main__':
    cible = Path(__file__).resolve().parent.parent / 'public' / 'documents' / 'bareme-honoraires-immovia.pdf'
    cible.parent.mkdir(parents=True, exist_ok=True)
    construire(cible)
    print(f'PDF généré : {cible}')
