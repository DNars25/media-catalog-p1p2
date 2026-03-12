const puppeteer = require('puppeteer');
const fs = require('fs');

const BASIC_USER = 'bld9Y57HZp';
const BASIC_PASS = '3Kdn3iRSkiL9DjmBa12';
const LOGIN_USER = 'supx';
const LOGIN_PASS = 'Liberta23';

const ADM_URL = 'http://adm-bldYcog4F.p2bld.vip:5010';
const VOD_URL = 'http://pdt-blddqryjz.p2bld.vip:3010';
const PAGE_SIZE = 100;

let allTitles = [];

function detectAudio(name) {
  if (/\(Dub\+Leg\)/i.test(name) || /\bDub\+Leg\b/i.test(name)) return 'DUBLADO_LEGENDADO';
  if (/\bLeg\b/i.test(name) || /\(Leg\)/i.test(name)) return 'LEGENDADO';
  return 'DUBLADO';
}

function cleanName(name) {
  return name
    .replace(/\s*\(Dub\+Leg\)/gi, '').replace(/\s*\(Leg\)/gi, '').replace(/\s*\(Dub\)/gi, '')
    .replace(/\s*\bDub\+Leg\b/gi, '').replace(/\s*\bLeg\b/gi, '')
    .replace(/\s*\bHDcamm?\b/gi, '').replace(/\s*\bHD\b/gi, '').replace(/\s*\b4K\b/gi, '')
    .trim();
}

function detectType(tags) {
  const tagStr = tags.join(' ').toUpperCase();
  if (tagStr.includes('SERIES') || tagStr.includes('NOVELA') || tagStr.includes('ANIME') || tagStr.includes('DORAMA')) return 'SERIES';
  return 'MOVIE';
}

async function extractPageTitles(page) {
  return await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr:not(.hid)');
    const titles = [];
    rows.forEach(row => {
      const tds = row.querySelectorAll('td.v-align-m');
      const img = row.querySelector('img[data-original]');
      const tagSpans = row.querySelectorAll('span.label.label-info');
      
      // O nome é o td sem classe extra após os primeiros
      let rawName = null;
      tds.forEach(td => {
        const text = td.textContent.trim();
        if (text.length > 2 && !td.classList.contains('text-right') && !td.querySelector('img') && !td.querySelector('button') && !td.querySelector('span.glyphicon-ok') && !td.querySelector('input')) {
          if (!rawName && isNaN(text)) rawName = text;
        }
      });

      if (!rawName || rawName.length < 2) return;
      const tags = [...tagSpans].map(s => s.textContent.trim());
      const logo = img ? img.getAttribute('data-original') : null;
      titles.push({ rawName, tags, logo });
    });
    return titles;
  });
}

async function run() {
  console.log('Iniciando Chrome...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Login no painel admin
  console.log('Fazendo login no painel admin...');
  await page.authenticate({ username: BASIC_USER, password: BASIC_PASS });
  await page.goto(`${ADM_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('URL login:', page.url());
  console.log('Título:', await page.title());

  // Salva HTML do login para debug
  const loginHtml = await page.content();
  fs.writeFileSync('adm_login_page.html', loginHtml);

  // Tenta preencher formulário
  try {
    await page.waitForSelector('input[name="username"], input[type="text"], #username', { timeout: 5000 });
    await page.type('input[name="username"], input[type="text"], #username', LOGIN_USER);
    await page.type('input[name="password"], input[type="password"], #password', LOGIN_PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      page.click('button[type="submit"], input[type="submit"], .btn-primary')
    ]);
    console.log('Login OK! URL:', page.url());
  } catch (e) {
    console.log('Erro login:', e.message);
    console.log('URL atual:', page.url());
    await browser.close();
    return;
  }

  // Acessa o VoD com o mesmo contexto (cookies compartilhados)
  console.log('\nAcessando VoD...');
  await page.authenticate({ username: BASIC_USER, password: BASIC_PASS });
  await page.goto(`${VOD_URL}/channel/vod?page=1&limit=${PAGE_SIZE}`, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('URL VoD:', page.url());

  const pageTitle = await page.title();
  console.log('Título página VoD:', pageTitle);

  // Verifica se está logado
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
  console.log('Conteúdo:', bodyText);

  const totalPages = 199;
  console.log(`\nIniciando scraping — ${totalPages} páginas\n`);

  let paginasVazias = 0;

  for (let i = 1; i <= totalPages; i++) {
    try {
      await page.goto(`${VOD_URL}/channel/vod?page=${i}&limit=${PAGE_SIZE}`, { waitUntil: 'networkidle2', timeout: 30000 });

      const rawTitles = await extractPageTitles(page);

      if (rawTitles.length === 0) {
        paginasVazias++;
        console.log(`Página ${i}/${totalPages} — 0 títulos (vazias: ${paginasVazias})`);
        if (paginasVazias >= 3) { console.log('Encerrando.'); break; }
      } else {
        paginasVazias = 0;
        const processed = rawTitles.map(t => ({
          name: cleanName(t.rawName),
          originalName: t.rawName,
          logo: t.logo,
          audio: detectAudio(t.rawName),
          type: detectType(t.tags),
          tags: t.tags
        }));
        allTitles = allTitles.concat(processed);
        console.log(`Página ${i}/${totalPages} — +${rawTitles.length} | Total: ${allTitles.length}`);
      }

    } catch (e) {
      console.log(`Página ${i} — Erro: ${e.message}`);
    }

    if (i % 10 === 0) fs.writeFileSync('p2b_titles_backup.json', JSON.stringify(allTitles, null, 2));
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  fs.writeFileSync('p2b_titles.json', JSON.stringify(allTitles, null, 2));

  const filmes = allTitles.filter(t => t.type === 'MOVIE').length;
  const series = allTitles.filter(t => t.type === 'SERIES').length;
  const dub = allTitles.filter(t => t.audio === 'DUBLADO').length;
  const leg = allTitles.filter(t => t.audio === 'LEGENDADO').length;
  const dubleg = allTitles.filter(t => t.audio === 'DUBLADO_LEGENDADO').length;

  console.log('\n========== CONCLUÍDO ==========');
  console.log(`Total: ${allTitles.length} títulos`);
  console.log(`Filmes: ${filmes} | Séries: ${series}`);
  console.log(`Dublado: ${dub} | Legendado: ${leg} | Dub+Leg: ${dubleg}`);
  console.log('Salvo em p2b_titles.json');
}

run().catch(console.error);
