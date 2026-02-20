const fs = require('fs');
const path = require('path');
const https = require('https');

const M3U_FILE = path.join(__dirname, 'tv_channels_narsvod_plus.m3u');
const DELAY_MS = 300;
const MAX_TITLES = null; // Mude para null para importar tudo

const MOVIE_GROUPS = [
  'ACAO/AVENTURA','COMEDIA','FICCAO','TERROR/SUSPENSE','ROMANCE/DRAMA',
  'LANCAMENTOS','LANCAMENTOS LEG','LEGENDADO','NACIONAL','CLASSICO',
  'MARVEL & DC','4K ULTRA HD','GUERRA','FAROESTE','RELIGIOSO',
  'OSCAR 2025','TOP MENSAL','TOP SEMANAL','ESPECIAL DE NATAL',
  'CINE FERIAS','CINEMA - BAIXA QUALIDADE','FILMES 24H','TURCO','ANIME'
];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function tmdbFetch(urlPath) {
  const key = process.env.TMDB_API_KEY;
  return new Promise((resolve, reject) => {
    const sep = urlPath.includes('?') ? '&' : '?';
    const url = 'https://api.themoviedb.org/3' + urlPath + sep + 'api_key=' + key + '&language=pt-BR';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function searchTMDB(title, type) {
  try {
    const clean = title.replace(/ LEG\s*$/i, '').replace(/\s+/g, ' ').trim();
    const data = await tmdbFetch('/search/' + type + '?query=' + encodeURIComponent(clean));
    return (data.results && data.results.length > 0) ? data.results[0] : null;
  } catch(e) { return null; }
}

async function getTMDBDetails(tmdbId, type) {
  try { return await tmdbFetch('/' + type + '/' + tmdbId); }
  catch(e) { return null; }
}

function parseM3U(content) {
  const lines = content.split('\n');
  const movies = new Map();
  const series = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;
    const nameMatch = line.match(/tvg-name="([^"]+)"/);
    const groupMatch = line.match(/group-title="([^"]+)"/);
    const logoMatch = line.match(/tvg-logo="([^"]+)"/);
    if (!nameMatch || !groupMatch) continue;
    const rawName = nameMatch[1].trim();
    const group = groupMatch[1].trim();
    const logo = logoMatch ? logoMatch[1] : null;

    if (/^SERIES/.test(group)) {
      const snMatch = rawName.match(/^(.+?)\s+S\d{2}/i);
      if (!snMatch) continue;
      const sName = snMatch[1].trim();
      const epMatch = rawName.match(/S(\d{2})E(\d{2})/i);
      if (!epMatch) continue;
      const season = parseInt(epMatch[1]);
      if (!series.has(sName)) series.set(sName, { logo, seasons: new Set(), episodes: new Map() });
      const s = series.get(sName);
      s.seasons.add(season);
      const key = 'S' + season;
      s.episodes.set(key, (s.episodes.get(key) || 0) + 1);
      continue;
    }

    if (MOVIE_GROUPS.includes(group)) {
      const isLeg = / LEG\s*$/.test(rawName);
      const baseName = rawName.replace(/ LEG\s*$/i, '').trim();
      if (movies.has(baseName)) {
        if (isLeg) movies.get(baseName).hasLeg = true;
        else movies.get(baseName).hasDub = true;
      } else {
        movies.set(baseName, { name: baseName, logo, hasLeg: isLeg, hasDub: !isLeg });
      }
    }
  }
  return { movies, series };
}

async function run() {
  console.log('Lendo arquivo M3U...');
  if (!fs.existsSync(M3U_FILE)) { console.error('Arquivo nao encontrado: ' + M3U_FILE); process.exit(1); }
  const content = fs.readFileSync(M3U_FILE, 'utf8');
  console.log('Arquivo lido!');
  console.log('Parseando M3U...');
  const { movies, series } = parseM3U(content);
  console.log('Encontrados: ' + movies.size + ' filmes, ' + series.size + ' series');

  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Conectado ao banco!');

  const existing = await client.query('SELECT "tmdbId" FROM "Title"');
  const existingIds = new Set(existing.rows.map(r => r.tmdbId));

  const adminRes = await client.query('SELECT id FROM "User" WHERE role = \'ADMIN\' LIMIT 1');
  if (!adminRes.rows.length) { console.error('Nenhum admin encontrado!'); process.exit(1); }
  const adminId = adminRes.rows[0].id;
  console.log(existingIds.size + ' titulos ja no banco, adminId: ' + adminId);

  let inserted = 0, skipped = 0, errors = 0, updates = 0;
  const ignored = [];

  // FILMES
  console.log('\nProcessando filmes...');
  const movieList = Array.from(movies.values());
  const limitMovies = MAX_TITLES ? movieList.slice(0, MAX_TITLES) : movieList;

  for (let i = 0; i < limitMovies.length; i++) {
    const movie = limitMovies[i];
    process.stdout.write('\rFilme ' + (i+1) + '/' + limitMovies.length + ': ' + movie.name.substring(0,40));
    try {
      await delay(DELAY_MS);
      const tmdb = await searchTMDB(movie.name, 'movie');
      if (!tmdb) { skipped++; ignored.push({ type: "MOVIE", name: movie.name, reason: "Nao encontrado no TMDB" }); continue; }
      if (existingIds.has(tmdb.id)) { skipped++; ignored.push({ type: "MOVIE", name: movie.name, reason: "Ja existe no banco" }); continue; }
      const audio = (movie.hasDub && movie.hasLeg) ? 'DUBLADO_LEGENDADO' : movie.hasLeg ? 'LEGENDADO' : 'DUBLADO';
      const poster = tmdb.poster_path ? 'https://image.tmdb.org/t/p/w500' + tmdb.poster_path : null;
      const year = tmdb.release_date ? parseInt(tmdb.release_date.split('-')[0]) : null;
      await client.query(
        'INSERT INTO "Title" (id, "tmdbId", type, title, overview, "posterUrl", "releaseYear", "hasP1", "hasP2", "internalStatus", "audioType", "createdById", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, \'MOVIE\', $2, $3, $4, $5, true, false, \'DISPONIVEL\', $6, $7, NOW(), NOW()) ON CONFLICT ("tmdbId", type) DO NOTHING',
        [tmdb.id, tmdb.title || movie.name, tmdb.overview || '', poster, year, audio, adminId]
      );
      existingIds.add(tmdb.id);
      inserted++;
    } catch(e) {
      errors++;
      if (errors <= 3) console.log('\nERRO FILME: ' + e.message);
    }
  }
  console.log('\nFilmes: ' + inserted + ' inseridos, ' + skipped + ' pulados, ' + errors + ' erros');

  // SERIES
  console.log('\nProcessando series...');
  const seriesList = Array.from(series.entries());
  const limitSeries = MAX_TITLES ? seriesList.slice(0, MAX_TITLES) : seriesList;
  let insertedS = 0, skippedS = 0, errorsS = 0;

  for (let i = 0; i < limitSeries.length; i++) {
    const [name, data] = limitSeries[i];
    process.stdout.write('\rSerie ' + (i+1) + '/' + limitSeries.length + ': ' + name.substring(0,40));
    try {
      await delay(DELAY_MS);
      const tmdb = await searchTMDB(name, 'tv');
      if (!tmdb) { skippedS++; ignored.push({ type: "TV", name: name, reason: "Nao encontrado no TMDB" }); continue; }
      if (existingIds.has(tmdb.id)) { skippedS++; ignored.push({ type: "TV", name: name, reason: "Ja existe no banco" }); continue; }
      await delay(DELAY_MS);
      const details = await getTMDBDetails(tmdb.id, 'tv');
      const poster = tmdb.poster_path ? 'https://image.tmdb.org/t/p/w500' + tmdb.poster_path : null;
      const year = tmdb.first_air_date ? parseInt(tmdb.first_air_date.split('-')[0]) : null;
      const m3uSeasons = data.seasons.size;
      let m3uEps = 0; data.episodes.forEach(c => m3uEps += c);
      const tvSeasons = details ? details.number_of_seasons : m3uSeasons;
      const tvEpisodes = details ? details.number_of_episodes : m3uEps;
      const tvStatus = (details && (details.status === 'Ended' || details.status === 'Canceled')) ? 'FINALIZADA' : 'EM_ANDAMENTO';
      await client.query(
        'INSERT INTO "Title" (id, "tmdbId", type, title, overview, "posterUrl", "releaseYear", "hasP1", "hasP2", "internalStatus", "tvSeasons", "tvEpisodes", "tvStatus", "createdById", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, \'TV\', $2, $3, $4, $5, true, false, \'DISPONIVEL\', $6, $7, $8, $9, NOW(), NOW()) ON CONFLICT ("tmdbId", type) DO NOTHING',
        [tmdb.id, tmdb.name || name, tmdb.overview || '', poster, year, tvSeasons, tvEpisodes, tvStatus, adminId]
      );
      existingIds.add(tmdb.id);
      insertedS++;
      if (details && details.number_of_seasons > m3uSeasons) {
        const notes = '[AUTO] M3U: ' + m3uSeasons + ' temp/' + m3uEps + ' eps. TMDB: ' + details.number_of_seasons + ' temp/' + details.number_of_episodes + ' eps.';
        await client.query(
          'INSERT INTO "Request" (id, "requestedTitle", type, "tmdbId", "posterUrl", "isUpdate", notes, status, "createdById", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, \'TV\', $2, $3, true, $4, \'ABERTO\', $5, NOW(), NOW())',
          [tmdb.name || name, tmdb.id, poster, notes, adminId]
        );
        updates++;
      }
    } catch(e) {
      errorsS++;
      if (errorsS <= 3) console.log('\nERRO SERIE: ' + e.message);
    }
  }

  console.log('\nSeries: ' + insertedS + ' inseridas, ' + skippedS + ' puladas, ' + errorsS + ' erros');
  console.log(updates + ' series com atualizacoes pendentes');
  await client.end();
  console.log('\nImportacao concluida! Total: ' + (inserted + insertedS) + ' titulos inseridos');
  fs.writeFileSync(path.join(__dirname, 'import-ignored.json'), JSON.stringify(ignored, null, 2));
  console.log(ignored.length + ' titulos ignorados salvos em import-ignored.json');
  fs.writeFileSync(path.join(__dirname, 'import-log.json'), JSON.stringify({ date: new Date().toISOString(), inserted, insertedS, skipped, skippedS, errors, errorsS, updates }, null, 2));
}

run().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
