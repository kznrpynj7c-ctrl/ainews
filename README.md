# AI News

Et lille statisk site, der bygger HTML direkte fra artikler i `content/articles/`. Der kræves ingen dependencies eller webserver på GitHub Pages.

## Byg sitet

Kør fra projektets rod:

```sh
npm run build
```

Generatoren skriver forsiden til `dist/index.html` og en HTML-fil pr. artikel til `dist/articles/`. `dist/` er det færdigbyggede site. Publicér indholdet af mappen i roden af `prod`-branchen, så `index.html` ligger direkte i branchens rod.

## Tilføj en artikel

Opret en `.md`-fil i `content/articles/`. Filnavnet bliver sidens URL, fx `min-historie.md` → `articles/min-historie.html`.

```md
---
title: "Artikeloverskrift"
date: "2026-10-24"
description: "Kort tekst til forsiden og sidens indledning."
---

## Første afsnit

Skriv artiklen i Markdown. Links skrives som [kildens navn](https://example.com).
```

Kør derefter `npm run build` igen. Generatoren genskaber `dist/` fra kilderne, så outputtet ikke bør redigeres manuelt.

## Publicér med GitHub Pages

Workflowet bygger sitet og publicerer `dist/` direkte til GitHub Pages, når der pushes ændringer til `incoming/` eller `news-prompt.md`. Det kan også startes manuelt fra fanen Actions.

Aktivér publicering én gang i repositoryets indstillinger: vælg **Settings → Pages → Build and deployment → Source → GitHub Actions**. Efterfølgende publicerer workflowet automatisk fra `main`.
