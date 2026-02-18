import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "movie" ou "tv"
  const section = searchParams.get("section"); // "now_playing", "upcoming", "on_the_air", "popular"

  if (!TMDB_KEY) {
    return NextResponse.json(
      { error: "TMDB_API_KEY não configurada" },
      { status: 500 }
    );
  }

  if (!type || !section) {
    return NextResponse.json(
      { error: "Parâmetros 'type' e 'section' são obrigatórios" },
      { status: 400 }
    );
  }

  // Monta o endpoint correto baseado no tipo e seção
  let endpoint = "";
  if (type === "movie" && section === "now_playing") {
    endpoint = "/movie/now_playing";
  } else if (type === "movie" && section === "upcoming") {
    endpoint = "/movie/upcoming";
  } else if (type === "tv" && section === "on_the_air") {
    endpoint = "/tv/on_the_air";
  } else if (type === "tv" && section === "popular") {
    endpoint = "/tv/popular";
  } else {
    return NextResponse.json(
      { error: "Combinação de 'type' e 'section' inválida" },
      { status: 400 }
    );
  }

  try {
    const url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}&language=pt-BR&page=1&region=BR`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h

    if (!res.ok) {
      throw new Error(`TMDB retornou status ${res.status}`);
    }

    const data = await res.json();

    // Retorna apenas os 8 primeiros resultados
    const results = (data.results || []).slice(0, 8).map((item: any) => ({
      tmdbId: item.id,
      title: item.title || item.name,
      posterPath: item.poster_path
        ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
        : null,
      releaseDate: item.release_date || item.first_air_date || null,
      overview: item.overview || "",
      type: type,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Erro ao buscar TMDB:", error.message);
    return NextResponse.json(
      { error: "Falha ao buscar dados do TMDB" },
      { status: 500 }
    );
  }
}
