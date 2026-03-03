import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/rbac";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

interface TmdbDiscoverItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  overview: string
}

interface TmdbDiscoverResponse {
  results?: TmdbDiscoverItem[]
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const ip = getClientIp(request)
  if (!checkRateLimit(`discover:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const section = searchParams.get("section");
  if (!TMDB_KEY) return NextResponse.json({ error: "TMDB_API_KEY nao configurada" }, { status: 500 });
  if (!type || !section) return NextResponse.json({ error: "Parametros ausentes" }, { status: 400 });
  let endpoint = "";
  if (type === "movie" && section === "now_playing") endpoint = "/movie/now_playing";
  else if (type === "movie" && section === "upcoming") endpoint = "/movie/upcoming";
  else if (type === "tv" && section === "on_the_air") endpoint = "/tv/on_the_air";
  else if (type === "tv" && section === "popular") endpoint = "/tv/popular";
  else return NextResponse.json({ error: "Combinacao invalida" }, { status: 400 });
  try {
    const url = TMDB_BASE + endpoint + "?api_key=" + TMDB_KEY + "&language=pt-BR&page=1&region=BR";
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("TMDB erro " + res.status);
    const data = await res.json() as TmdbDiscoverResponse;
    const results = (data.results ?? []).slice(0, 8).map((item) => ({
      tmdbId: item.id,
      title: item.title || item.name,
      posterPath: item.poster_path ? "https://image.tmdb.org/t/p/w300" + item.poster_path : null,
      releaseDate: item.release_date || item.first_air_date || null,
      overview: item.overview || "",
      type: type,
    }));
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao buscar TMDB" }, { status: 500 });
  }
}