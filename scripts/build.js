import { readdir, readFile, mkdir, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'content', 'articles');
const outputDir = path.join(root, 'dist');

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function parseArticle(source, filename) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: mangler metadata mellem --- linjer`);
  const metadata = Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
    const separator = line.indexOf(':');
    if (separator < 1) throw new Error(`${filename}: ugyldig metadata: ${line}`);
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
  for (const field of ['title', 'date', 'description']) {
    if (!metadata[field]) throw new Error(`${filename}: mangler feltet ${field}`);
  }
  return { ...metadata, body: match[2].trim(), slug: path.basename(filename, '.md') };
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => `<a href="${url}" rel="noopener noreferrer">${label}</a>`);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html;
}

function markdownToHtml(markdown) {
  return markdown.split(/\n\s*\n/).map((block) => {
    const heading = block.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 6);
      return `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
    }
    return `<p>${inlineMarkdown(block.replaceAll('\n', ' '))}</p>`;
  }).join('\n');
}

function shell({ title, description, content, stylesheet = 'style.css', home = 'index.html' }) {
  return `<!doctype html>
<html lang="da">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} · AI News</title>
  <link rel="stylesheet" href="${stylesheet}">
</head>
<body>
  <header class="site-header"><a class="site-name" href="${home}">AI News</a><span>Kildebaserede artikelrekonstruktioner</span></header>
  <main>${content}</main>
  <footer class="site-footer">Artiklerne er rekonstruktioner baseret på offentligt tilgængelige kilder.</footer>
</body>
</html>
`;
}

const files = (await readdir(sourceDir)).filter((name) => name.endsWith('.md'));
const articles = await Promise.all(files.map(async (name) => parseArticle(await readFile(path.join(sourceDir, name), 'utf8'), name)));
articles.sort((a, b) => b.date.localeCompare(a.date));

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, 'articles'), { recursive: true });
await copyFile(path.join(root, 'public', 'style.css'), path.join(outputDir, 'style.css'));

const cards = articles.map((article) => `<article class="article-card">
  <p class="article-date"><time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></p>
  <h2><a href="articles/${encodeURIComponent(article.slug)}.html">${escapeHtml(article.title)}</a></h2>
  <p>${escapeHtml(article.description)}</p>
</article>`).join('\n');
const indexContent = `<section class="intro"><p class="eyebrow">Undersøgende journalistik</p><h1>Artikler og rekonstruktioner</h1><p>En samling kildebaserede bud på, hvordan historier udfolder sig – med tydelig skelnen mellem dokumentation og sandsynlige tolkninger.</p></section>
<section aria-label="Artikler" class="article-list">${cards || '<p>Der er endnu ingen artikler.</p>'}</section>`;
await writeFile(path.join(outputDir, 'index.html'), shell({ title: 'Forside', description: 'Kildebaserede artikelrekonstruktioner.', content: indexContent }));

for (const article of articles) {
  const content = `<article class="story"><a class="back-link" href="../index.html">← Alle artikler</a><header class="story-header"><p class="article-date"><time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></p><h1>${escapeHtml(article.title)}</h1><p class="standfirst">${escapeHtml(article.description)}</p></header><div class="prose">${markdownToHtml(article.body)}</div></article>`;
  await writeFile(path.join(outputDir, 'articles', `${article.slug}.html`), shell({ title: article.title, description: article.description, content, stylesheet: '../style.css', home: '../index.html' }));
}

console.log(`Bygget ${articles.length} artikel/artikler til dist/`);
