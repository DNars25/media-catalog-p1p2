var fs = require('fs');
var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

var TMDB_KEY = process.env.TMDB_API_KEY;
var data = JSON.parse(fs.readFileSync('missing_clean.json', 'utf8'));

var ADMIN_ID = 'a61ae843-85f5-4410-a856-f7448a8b7eb0';

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

function detectAudio(originalName) {
  if (/\bLEG\b/i.test(originalName) || /\(LEG\)/i.test(originalName)) return 'LEGENDADO';
  return 'DUBLADO';
}

function cleanName(name) {
  return name
    .replace(/\s*\(DUB\)/gi, '').replace(/\s*\(LEG\)/gi, '').replace(/\s*\(DUAL\)/gi, '')
    .replace(/\s*\bDUB\b/gi, '').replace(/\s*\bLEG\b/gi, '').replace(/\s*\bDUAL\b/gi, '')
    .replace(/\s*\bHD\b/gi, '').replace(/\s*\bFHD\b/gi, '').replace(/\s*\b4K\b/gi, '')
    .trim();
}

async function searchTMDB(name, type) {
  var tmdbType = type === 'MOVIE' ? 'movie' : 'tv';
  var url = 'https://api.themoviedb.org/3/search/' + tmdbType + '?api_key=' + TMDB_KEY + '&query=' + encodeURIComponent(name) + '&language=pt-BR';
  try {
    var res = await fetch(url);
    var data = await res.json();
    if (data.results && data.results.length > 0) return data.results[0];
  } catch(e) {}
  return null;
}

async function getDetails(tmdbId, type) {
  var tmdbType = type === 'MOVIE' ? 'movie' : 'tv';
  var url = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=pt-BR';
  try {
    var res = await fetch(url);
    return await res.json();
  } catch(e) {}
  return null;
}

async function run() {
  var total = data.length;
  var success = 0;
  var failed = 0;
  var skipped = 0;
  var failedList = [];

  console.log('Iniciando importacao de', total, 'titulos...');

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var audioType = detectAudio(item.name);
    var cleanedName = cleanName(item.name);

    if (i % 50 === 0) console.log('Progresso:', i + '/' + total, '| OK:', success, '| Falha:', failed, '| Skip:', skipped);

    try {
      var result = await searchTMDB(cleanedName, item.type);
      if (result === null) {
        failed++;
        failedList.push({ name: cleanedName, type: item.type, reason: 'not found in TMDB' });
        await sleep(200);
        continue;
      }

      var existing = await prisma.title.findUnique({
        where: { tmdbId_type: { tmdbId: result.id, type: item.type } }
      });
      if (existing) { skipped++; await sleep(100); continue; }

      var details = await getDetails(result.id, item.type);
      if (details === null) { failed++; await sleep(200); continue; }

      var titleData = {
        tmdbId: result.id,
        type: item.type,
        title: details.title || details.name || cleanedName,
        overview: details.overview || null,
        posterUrl: details.poster_path ? 'https://image.tmdb.org/t/p/w500' + details.poster_path : null,
        releaseYear: details.release_date ? parseInt(details.release_date.substring(0,4)) : details.first_air_date ? parseInt(details.first_air_date.substring(0,4)) : null,
        genres: JSON.stringify((details.genres || []).map(function(g){ return g.name; })),
        hasP1: true,
        hasP2: false,
        audioType: audioType,
        internalStatus: 'DISPONIVEL',
        createdById: ADMIN_ID
      };

      if (item.type === 'TV') {
        titleData.tvSeasons = details.number_of_seasons || null;
        titleData.tvEpisodes = details.number_of_episodes || null;
        var status = details.status || '';
        titleData.tvStatus = (status === 'Ended' || status === 'Canceled') ? 'FINALIZADA' : 'EM_ANDAMENTO';
      }

      await prisma.title.create({ data: titleData });
      success++;
      await sleep(250);

    } catch(e) {
      failed++;
      failedList.push({ name: cleanedName, type: item.type, reason: e.message });
      await sleep(300);
    }
  }

  console.log('\n=== RESULTADO FINAL ===');
  console.log('Cadastrados:', success);
  console.log('Ja existiam:', skipped);
  console.log('Falhou:', failed);
  fs.writeFileSync('import_failed.json', JSON.stringify(failedList, null, 2));
  console.log('Falhas salvas em import_failed.json');
  await prisma.$disconnect();
}

run();
