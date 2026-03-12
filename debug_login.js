const puppeteer = require('puppeteer');
const fs = require('fs');

const BASIC_USER = 'bld9Y57HZp';
const BASIC_PASS = '3Kdn3iRSkiL9DjmBa12';

async function run() {
  console.log('Iniciando Chrome...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.authenticate({ username: BASIC_USER, password: BASIC_PASS });
  await page.goto('http://pdt-blddqryjz.p2bld.vip:3010/login', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const html = await page.content();
  fs.writeFileSync('login_page.html', html);
  console.log('HTML salvo em login_page.html');
  console.log('URL:', page.url());
  console.log('Título:', await page.title());

  await browser.close();
}

run().catch(console.error);
