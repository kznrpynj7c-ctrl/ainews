# Sådan bygger og publicerer du sitet

## 1. Åbn projektmappen i terminalen

Gå til projektets rodmappe, hvor `package.json` ligger:

```sh
cd /Users/flbo/dev/ainews
```

Generatoren kræver Node.js. Tjek, at det er installeret:

```sh
node --version
```

## 2. Byg HTML-filerne

Kør:

```sh
npm run build
```

Generatoren læser Markdown-filerne i `content/articles/` og opretter:

- `dist/index.html` – sitets forside
- `dist/articles/` – en HTML-side for hver artikel
- `dist/style.css` – sitets fælles layout

Du kan åbne `dist/index.html` i en browser for at se resultatet lokalt.

## 3. Tilføj en artikel

Opret en ny `.md`-fil i `content/articles/`, for eksempel `min-artikel.md`:

```md
---
title: "Artikeloverskrift"
date: "2026-10-24"
description: "Kort beskrivelse, som vises på forsiden."
---

## Første afsnit

Skriv artiklen her. Links kan skrives som [kildens navn](https://example.com).
```

Kør derefter `npm run build` igen. Filen bliver til `dist/articles/min-artikel.html` og dukker automatisk op på forsiden.

## 4. Publicér til `prod`-branchen

Byg først sitet fra projektmappen. Opret derefter en separat checkout af `prod`-branchen én gang:

```sh
git worktree add ../ainews-prod prod
```

Kopiér de nybyggede filer til roden af den checkout:

```sh
cp -R dist/. ../ainews-prod/
```

Gå til checkouten, og push HTML-filerne til GitHub:

```sh
cd ../ainews-prod
git add -A
git commit -m "Opdater site"
git push origin prod
```

Næste gang du publicerer, gentager du build- og kopieringstrinnene. `git worktree add` skal kun køres første gang. Hvis `prod` ikke findes lokalt endnu, skal den først hentes fra GitHub.

## 5. GitHub Pages

I repositoryets **Settings → Pages** vælges `prod` som branch og `/(root)` som mappe. `index.html` skal ligge direkte i roden af `prod`-branchen.
