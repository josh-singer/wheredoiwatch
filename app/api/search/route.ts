import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  const url = `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: res.status }
    );
  }

  const data = await res.json();

  // Filter to only movies and TV shows, exclude people
  const results = (data.results ?? [])
    .filter((r: { media_type: string }) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 10)
    .map((r: {
      id: number;
      media_type: string;
      title?: string;
      name?: string;
      poster_path?: string;
      release_date?: string;
      first_air_date?: string;
      overview?: string;
    }) => ({
      id: r.id,
      mediaType: r.media_type,
      title: r.title ?? r.name ?? "Unknown",
      posterPath: r.poster_path ?? null,
      year: (r.release_date ?? r.first_air_date ?? "").slice(0, 4) || null,
      overview: r.overview ?? "",
    }));

  return NextResponse.json({ results });
}
