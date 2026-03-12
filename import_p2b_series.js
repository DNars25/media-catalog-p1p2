const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const TMDB_KEY = process.env.TMDB_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const rawTitles = JSON.parse(fs.readFileSync('p2b_titles.json', 'utf8'));
const series = rawTitles.filter(t => t.type === 'SERIES');

const stats = { atualizados: 0, cadastrados: 0, divergencias: 0, ignorados: 0, erros: 0 };

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
  const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}&language=pt-BR`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) return data.results[0];
  } catch (e) {}
  return null;
}

async function getTVDetails(tmdbId) {
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`;
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {}
  return null;
}

async function run() {
  if (!TMDB_KEY) { console.error('TMDB_API_KEY não definida!'); process.exit(1); }

  const admin = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });
  if (!admin) { console.error('Admin não encontrado!'); process.exit(1); }

  console.log(`Total de séries no P2B: ${series.length}`);
  console.log(`Admin: ${admin.email}`);
  console.log('Iniciando importação...\n');

  for (let i = 0; i < series.length; i++) {
    const item = series[i];
    const audio = normalizeAudio(item.audio);

    try {
      // Verifica se já existe pelo nome
      const existing = await prisma.title.findFirst({
        where: { type: 'TV', title: { contains: item.name, mode: 'insensitive' } }
      });

      if (existing) {
        const newAudio = mergeAudio(existing.audioType, audio);

        // Busca dados atuais do TMDB para comparar temporadas/episódios
        await sleep(300);
        const details = await getTVDetails(existing.tmdbId);

        let divergence = null;
        if (details) {
          const tmdbSeasons = details.number_of_seasons || 0;
          const tmdbEpisodes = details.number_of_episodes || 0;
          const dbSeasons = existing.tvSeasons || 0;
          const dbEpisodes = existing.tvEpisodes || 0;

          if (tmdbSeasons !== dbSeasons || tmdbEpisodes !== dbEpisodes) {
            divergence = {
              p1Seasons: dbSeasons,
              p1Episodes: dbEpisodes,
              tmdbSeasons,
              tmdbEpisodes,
              detectedAt: new Date().toISOString()
            };
            stats.divergencias++;
          }
        }

        await prisma.title.update({
          where: { id: existing.id },
          data: {
            hasP2: true,
            audioType: newAudio,
            ...(divergence && { p2Divergence: divergence })
          }
        });
        stats.atualizados++;
        continue;
      }

      // Não existe — busca no TMDB e cadastra
      await sleep(300);
      const tmdbResult = await searchTMDB(item.name);
      if (!tmdbResult) { stats.ignorados++; continue; }

      await sleep(300);
      const details = await getTVDetails(tmdbResult.id);
      if (!details) { stats.ignorados++; continue; }

      // Verifica pelo tmdbId
      const existingByTmdb = await prisma.title.findUnique({
        where: { tmdbId_type: { tmdbId: details.id, type: 'TV' } }
      });

      if (existingByTmdb) {
        const newAudio = mergeAudio(existingByTmdb.audioType, audio);
        const tmdbSeasons = details.number_of_seasons || 0;
        const tmdbEpisodes = details.number_of_episodes || 0;
        const dbSeasons = existingByTmdb.tvSeasons || 0;
        const dbEpisodes = existingByTmdb.tvEpisodes || 0;

        let divergence = null;
        if (tmdbSeasons !== dbSeasons || tmdbEpisodes !== dbEpisodes) {
          divergence = {
            p1Seasons: dbSeasons,
            p1Episodes: dbEpisodes,
            tmdbSeasons,
            tmdbEpisodes,
            detectedAt: new Date().toISOString()
          };
          stats.divergencias++;
        }

        await prisma.title.update({
          where: { id: existingByTmdb.id },
          data: {
            hasP2: true,
            audioType: newAudio,
            ...(divergence && { p2Divergence: divergence })
          }
        });
        stats.atualizados++;
        continue;
      }

      // Cadastra novo
      const releaseYear = details.first_air_date ? parseInt(details.first_air_date.split('-')[0]) : null;
      const genres = details.genres ? details.genres.map(g => g.name) : [];
      const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;
      const tvStatus = details.status === 'Ended' || details.status === 'Canceled' ? 'FINALIZADA' : 'EM_ANDAMENTO';

      await prisma.title.create({
        data: {
          tmdbId: details.id,
          type: 'TV',
          title: details.name || item.name,
          overview: details.overview || null,
          posterUrl,
          releaseYear,
          genres,
          tvSeasons: details.number_of_seasons || null,
          tvEpisodes: details.number_of_episodes || null,
          tvStatus,
          audioType: audio,
          hasP1: false,
          hasP2: true,
          internalStatus: 'DISPONIVEL',
          createdById: admin.id
        }
      });
      stats.cadastrados++;

    } catch (e) {
      stats.erros++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`[${i + 1}/${series.length}] Atualizados: ${stats.atualizados} | Cadastrados: ${stats.cadastrados} | Divergências: ${stats.divergencias} | Ignorados: ${stats.ignorados}`);
    }
  }

  await prisma.$disconnect();

  console.log('\n========== CONCLUÍDO ==========');
  console.log(`Atualizados (hasP2=true): ${stats.atualizados}`);
  console.log(`Cadastrados novos:        ${stats.cadastrados}`);
  console.log(`Com divergências:         ${stats.divergencias}`);
  console.log(`Ignorados (sem TMDB):     ${stats.ignorados}`);
  console.log(`Erros:                    ${stats.erros}`);
}

run().catch(console.error);
