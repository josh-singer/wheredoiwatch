import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

interface TmdbCountryResult {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const mediaType = req.nextUrl.searchParams.get("type"); // "movie" or "tv"
  const country = req.nextUrl.searchParams.get("country") ?? "US";

  if (!id || !mediaType) {
    return NextResponse.json({ error: "Missing id or type param" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  const url = `${TMDB_BASE}/${mediaType}/${id}/watch/providers?api_key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch providers from TMDB" },
      { status: res.status }
    );
  }

  const data = await res.json();
  const countryData: TmdbCountryResult | undefined = data.results?.[country];

  if (!countryData) {
    return NextResponse.json({ providers: null, link: null, country });
  }

  const formatProviders = (list: TmdbProvider[] = []) =>
    list
      .sort((a, b) => a.display_priority - b.display_priority)
      .map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
        logo: `https://image.tmdb.org/t/p/original${p.logo_path}`,
      }));

  return NextResponse.json({
    country,
    link: countryData.link ?? null,
    providers: {
      streaming: formatProviders(countryData.flatrate),
      free: formatProviders([...(countryData.free ?? []), ...(countryData.ads ?? [])]),
      rent: formatProviders(countryData.rent),
      buy: formatProviders(countryData.buy),
    },
  });
}
