// Renders the social sharing preview cards (1200×630) in public/og/ using the
// site's own fonts, photography and logo. Re-run after changing imagery:
//   node scripts/generate-og-images.mjs   (requires Playwright + Chromium)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { pathToFileURL } from "node:url";
import path from "node:path";
import { writeFileSync, rmSync } from "node:fs";

const root = path.resolve(import.meta.dirname, "..");
const file = (p) => pathToFileURL(path.join(root, p)).href;
const font = (f) => file(`node_modules/@fontsource-variable/${f}`);

const cards = [
  { out: "home", image: null, eyebrow: "In Business. In Life. In Love.", title: "The art of <em>being known.</em>", line: "Life after 40. Connection with intention." },
  { out: "membership", image: "public/images/in-business.webp", eyebrow: "Memberships", title: "Build your <em>membership.</em>", line: "Choose one experience, or all three — one account, one subscription." },
  { out: "business", image: "public/images/in-business.webp", eyebrow: "In Business · Professional Connections", title: "Connect <em>with purpose.</em>", line: "Business compatibility, mentorship and strategic partnerships." },
  { out: "life", image: "public/images/in-life.webp", eyebrow: "In Life · Personal Growth & Guidance", title: "Discover <em>yourself.</em>", line: "Self-discovery, emotional intelligence and trusted guidance." },
  { out: "love", image: "public/images/in-love.webp", eyebrow: "In Love · Romantic Connections", title: "Connect <em>intentionally.</em>", line: "Intentional matchmaking for singles, and tools for couples." },
  { out: "professionals", image: null, eyebrow: "For counselors, coaches & mentors", title: "A distinguished home for <em>your practice.</em>", line: "Serve adults 40+ seeking meaningful growth and connection.", burgundy: true },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Cormorant;src:url(${font("cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2")}) format("woff2");font-weight:300 700}
@font-face{font-family:Cormorant;font-style:italic;src:url(${font("cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2")}) format("woff2");font-weight:300 700}
@font-face{font-family:Manrope;src:url(${font("manrope/files/manrope-latin-wght-normal.woff2")}) format("woff2");font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;display:flex;background:${c.burgundy ? "#781F35" : "#211C18"};color:#F8F3E9;font-family:Manrope;overflow:hidden;position:relative}
body:before{content:"";position:absolute;inset:0;background:radial-gradient(55% 70% at 90% 0%,rgba(197,165,114,.22),transparent 70%),radial-gradient(50% 60% at 0% 100%,${c.burgundy ? "rgba(33,28,24,.45)" : "rgba(120,31,53,.45)"},transparent 70%)}
.photo{width:470px;height:630px;position:relative;flex:none}
.photo img{width:100%;height:100%;object-fit:cover}
.photo:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 60%,${c.burgundy ? "#781F35" : "#211C18"})}
.txt{position:relative;flex:1;padding:50px 70px 120px ${c.image ? "40px" : "90px"};display:flex;flex-direction:column;justify-content:center}
.mono{height:96px;width:auto;align-self:flex-start;margin-bottom:34px}
.eyebrow{font-size:17px;letter-spacing:.3em;text-transform:uppercase;color:${c.burgundy ? "#E2CBA0" : "#C5A572"};font-weight:600}
h1{font-family:Cormorant;font-weight:400;font-size:${c.image ? 78 : 92}px;line-height:.98;letter-spacing:-.02em;margin-top:22px}
em{font-style:italic;color:${c.burgundy ? "#E2CBA0" : "#D9BD8C"}}
p.line{margin-top:26px;font-size:24px;line-height:1.4;color:rgba(248,243,233,.85);max-width:640px}
.foot{position:absolute;left:${c.image ? "510px" : "90px"};right:70px;bottom:44px;display:flex;justify-content:space-between;font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:rgba(248,243,233,.75)}
.rule{position:absolute;left:${c.image ? "510px" : "90px"};right:70px;bottom:84px;height:1px;background:linear-gradient(90deg,#C5A572,rgba(197,165,114,0))}
</style></head><body>
${c.image ? `<div class="photo"><img src="${file(c.image)}"></div>` : ""}
<div class="txt"><img class="mono" src="${file("public/brand/monogram.webp")}"><div class="eyebrow">${c.eyebrow}</div><h1>${c.title}</h1><p class="line">${c.line}</p></div>
<div class="rule"></div><div class="foot"><span>The Art of Connect</span><span>Exclusively for adults 40+</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const c of cards) {
  // Opened as a local file so it may load local fonts and images.
  const tmp = path.join(root, `.og-${c.out}.html`);
  writeFileSync(tmp, html(c));
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
  rmSync(tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, `public/og/${c.out}.jpg`), type: "jpeg", quality: 88 });
  console.log("wrote public/og/" + c.out + ".jpg");
}
await browser.close();
