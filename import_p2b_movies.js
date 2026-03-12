const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const TMDB_KEY = process.env.TMDB_API_KEY;

// Carrega o arquivo gerado pelo scraping
const rawTitles = JSON.parse(fs.readFileSync('p2b_titles.json', 'utf8'));
const movies = rawTitles.filter(t => t.type === 'MOVIE');

// Pega o ID do admin
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const stats = { atualizados: 0, cadastrados: 0, ignorados: 0, erros: 0 };
const log = { atualizados: [], cadastrados: [], ignorados: [], erros: [] };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeAudio(audio) {
  if (audio === 'DUBLADO_LEGENDADO') return 'DUBLADO_LEGENDADO';
  if (audio === 'LEGENDADO') return 'LEGENDADO';
  return 'DUBLADO';
}

function mergeAudio(existing, incoming) {
  if (existing === 'DUBLADO_LEGENDADO') return 'DUBLADO_LEGENDADO';
  if (incoming === 'DUBLADO_LEGENDADO') return 'DUBLADO_LEGENDADO';
  if (existing === 'LEGENDADO' && incoming === 'DUBLADO') return 'DUBLADO_LEGENDADO';
  if (existing === 'DUBLADO' && incoming === 'LEGENDADO') return 'DUBLADO_LEGENDADO';
  return incoming || existing;
}

async function searchTMDB(name) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}&language=pt-BR`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) return data.results[0];
  } catch (e) {}
  return null;
}

async function getMovieDetails(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`;
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {}
  return null;
}

async function run() {
  if (!TMDB_KEY) { console.error('TMDB_API_KEY não definida no .env!'); process.exit(1); }

  const admin = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });
  if (!admin) { console.error('Admin não encontrado!'); process.exit(1); }

  console.log(`Total de filmes no P2B: ${movies.length}`);
  console.log(`Admin: ${admin.email}`);
  console.log('Iniciando importação...\n');

  for (let i = 0; i < movies.length; i++) {
    const item = movies[i];
    const audio = normalizeAudio(item.audio);

    try {
      // Verifica se já existe pelo nome (busca aproximada)
      const existing = await prisma.title.findFirst({
        where: {
          type: 'MOVIE',
          title: { contains: item.name, mode: 'insensitive' }
        }
      });

      if (existing) {
        // Atualiza hasP2 e merge do áudio
        const newAudio = mergeAudio(existing.audioType, audio);
        await prisma.title.update({
          where: { id: existing.id },
          data: { hasP2: true, audioType: newAudio }
        });
        stats.atualizados++;
        if (stats.atualizados <= 20) log.atualizados.push(`${existing.title} [${existing.audioType} → ${newAudio}]`);
        if ((i + 1) % 500 === 0) console.log(`[${i + 1}/${movies.length}] Atualizados: ${stats.atualizados} | Cadastrados: ${stats.cadastrados} | Ignorados: ${stats.ignorados}`);
        continue;
      }

      // Não existe — busca no TMDB
      await sleep(300);
      const tmdbResult = await searchTMDB(item.name);
      if (!tmdbResult) {
        stats.ignorados++;
        log.ignorados.push(item.name);
        continue;
      }

      // Busca detalhes completos
      await sleep(300);
      const details = await getMovieDetails(tmdbResult.id);
      if (!details) { stats.ignorados++; continue; }

      // Verifica se já existe pelo tmdbId
      const existingByTmdb = await prisma.title.findUnique({
        where: { tmdbId_type: { tmdbId: details.id, type: 'MOVIE' } }
      });

      if (existingByTmdb) {
        const newAudio = mergeAudio(existingByTmdb.audioType, audio);
        await prisma.title.update({
          where: { id: existingByTmdb.id },
          data: { hasP2: true, audioType: newAudio }
        });
        stats.atualizados++;
        continue;
      }

      // Cadastra novo título
      const releaseYear = details.release_date ? parseInt(details.release_date.split('-')[0]) : null;
      const genres = details.genres ? details.genres.map(g => g.name) : [];
      const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;

      await prisma.title.create({
        data: {
          tmdbId: details.id,
          type: 'MOVIE',
          title: details.title || item.name,
          overview: details.overview || null,
          posterUrl,
          releaseYear,
          genres,
          audioType: audio,
          hasP1: false,
          hasP2: true,
          internalStatus: 'DISPONIVEL',
          createdById: admin.id
        }
      });
      stats.cadastrados++;
      if (stats.cadastrados <= 20) log.cadastrados.push(`${details.title} [${audio}]`);

    } catch (e) {
      stats.erros++;
      log.erros.push(`${item.name}: ${e.message}`);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`[${i + 1}/${movies.length}] Atualizados: ${stats.atualizados} | Cadastrados: ${stats.cadastrados} | Ignorados: ${stats.ignorados} | Erros: ${stats.erros}`);
    }
  }

  await prisma.$disconnect();

  // Salva log
  fs.writeFileSync('import_p2b_log.json', JSON.stringify({ stats, log }, null, 2));

  console.log('\n========== CONCLUÍDO ==========');
  console.log(`Atualizados (hasP2=true): ${stats.atualizados}`);
  console.log(`Cadastrados novos:        ${stats.cadastrados}`);
  console.log(`Ignorados (sem TMDB):     ${stats.ignorados}`);
  console.log(`Erros:                    ${stats.erros}`);
  console.log('Log salvo em import_p2b_log.json');
}

run().catch(console.error);
