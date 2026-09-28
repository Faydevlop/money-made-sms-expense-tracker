/**
 * Generates docs/privacy-policy.html (published with GitHub Pages) from the
 * same source the app renders: src/legal/privacyPolicy.ts.
 *
 *   node scripts/build-privacy-page.js
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/legal/privacyPolicy.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
require('vm').runInNewContext(js, { module: mod, exports: mod.exports });
const p = mod.exports;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = s => esc(s).replace(p.CONTACT_EMAIL, `<a href="mailto:${p.CONTACT_EMAIL}">${p.CONTACT_EMAIL}</a>`);

const sections = p.PRIVACY_SECTIONS.map(
  s => `    <section>
      <h2>${esc(s.title)}</h2>
${s.paragraphs.map(t => `      <p>${linkify(t)}</p>`).join('\n')}${
    s.bullets ? `\n      <ul>\n${s.bullets.map(b => `        <li>${esc(b)}</li>`).join('\n')}\n      </ul>` : ''
  }
    </section>`,
).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privacy Policy · ${esc(p.APP_NAME)}</title>
  <meta name="description" content="${esc(p.PRIVACY_SUMMARY)}">
  <link rel="icon" href="logo.png">
  <style>
    :root { --bg:#f4f2f0; --card:#fff; --ink:#151416; --muted:#4a464d; --accent:#e4d9f3; }
    @media (prefers-color-scheme: dark) { :root { --bg:#151416; --card:#1f1d21; --ink:#f4f2f0; --muted:#b9b3be; --accent:#3a3342; } }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 32px 16px 64px; }
    header { display:flex; align-items:center; gap:14px; }
    header img { width:56px; height:56px; border-radius:12px; }
    h1 { font-size: 30px; margin: 0; font-style: italic; }
    .date { color: var(--muted); margin: 6px 0 20px; }
    .summary { background: var(--accent); border-radius: 20px; padding: 16px 18px; }
    section { background: var(--card); border-radius: 20px; padding: 4px 20px 8px; margin-top: 12px; }
    h2 { font-size: 18px; font-style: italic; margin: 16px 0 4px; }
    p, li { color: var(--muted); }
    a { color: inherit; }
  </style>
</head>
<body>
  <main>
    <header>
      <img src="logo.png" alt="">
      <h1>${esc(p.APP_NAME)} — Privacy Policy</h1>
    </header>
    <p class="date">Effective ${esc(p.EFFECTIVE_DATE)}</p>
    <p class="summary">${esc(p.PRIVACY_SUMMARY)}</p>
${sections}
  </main>
</body>
</html>
`;

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/privacy-policy.html'), html);
fs.copyFileSync(path.join(root, 'src/assets/logo.png'), path.join(root, 'docs/logo.png'));
// Landing page so the bare Pages URL works too.
fs.writeFileSync(
  path.join(root, 'docs/index.html'),
  `<!doctype html><meta charset="utf-8"><title>${esc(p.APP_NAME)}</title><meta http-equiv="refresh" content="0; url=privacy-policy.html"><a href="privacy-policy.html">Privacy Policy</a>\n`,
);
console.log('Wrote docs/privacy-policy.html →', p.PRIVACY_POLICY_URL);
