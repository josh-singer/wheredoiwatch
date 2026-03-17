"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

// --- Types ---
interface SearchResult {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  year: string | null;
  overview: string;
}

interface Provider {
  id: number;
  name: string;
  logo: string;
}

interface ProviderGroups {
  streaming: Provider[];
  free: Provider[];
  rent: Provider[];
  buy: Provider[];
}

interface ProvidersResponse {
  country: string;
  link: string | null;
  providers: ProviderGroups | null;
}

// --- Sub-components ---
function ProviderSection({ label, providers, link }: { label: string; providers: Provider[]; link: string | null }) {
  if (providers.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => {
          const tile = (
            <div
              key={p.id}
              title={p.name}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow ring-1 ring-violet-200 transition-transform group-hover:scale-105">
                <Image
                  src={p.logo}
                  alt={p.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs text-violet-400 group-hover:text-violet-700 text-center w-14 truncate">{p.name}</span>
            </div>
          );
          return link ? (
            <a key={p.id} href={link} target="_blank" rel="noopener noreferrer">{tile}</a>
          ) : tile;
        })}
      </div>
    </div>
  );
}

function ProviderCard({
  result,
  data,
  country,
  onCountryChange,
}: {
  result: SearchResult;
  data: ProvidersResponse;
  country: string;
  onCountryChange: (c: string) => void;
}) {
  const hasAny =
    data.providers &&
    (data.providers.streaming.length > 0 ||
      data.providers.free.length > 0 ||
      data.providers.rent.length > 0 ||
      data.providers.buy.length > 0);

  const COUNTRIES = [
    { code: "US", label: "🇺🇸 US" },
    { code: "GB", label: "🇬🇧 UK" },
    { code: "CA", label: "🇨🇦 CA" },
    { code: "AU", label: "🇦🇺 AU" },
    { code: "DE", label: "🇩🇪 DE" },
    { code: "FR", label: "🇫🇷 FR" },
    { code: "JP", label: "🇯🇵 JP" },
  ];

  return (
    <div className="mt-6 rounded-2xl bg-white border border-violet-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex gap-4 p-5 border-b border-violet-100">
        {result.posterPath && (
          <Image
            src={`https://image.tmdb.org/t/p/w185${result.posterPath}`}
            alt={result.title}
            width={60}
            height={90}
            className="rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug text-violet-900">
            {result.title}
            {result.year && <span className="text-violet-400 font-normal ml-2 text-base">({result.year})</span>}
          </h2>
          <p className="text-xs text-violet-400 uppercase mt-0.5">{result.mediaType === "tv" ? "TV Series" : "Movie"}</p>
          {result.overview && (
            <p className="text-sm text-violet-700/70 mt-2 line-clamp-3">{result.overview}</p>
          )}
        </div>
      </div>

      {/* Country picker */}
      <div className="flex gap-1 px-5 py-3 border-b border-violet-100 overflow-x-auto">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => onCountryChange(c.code)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              country === c.code
                ? "bg-violet-600 text-white"
                : "bg-violet-100 text-violet-500 hover:bg-violet-200 hover:text-violet-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Providers */}
      <div className="p-5">
        {!hasAny ? (
          <p className="text-violet-400 text-sm">
            Not available for streaming, rent, or purchase in <strong className="text-violet-700">{country}</strong>.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <ProviderSection label="Stream" providers={data.providers!.streaming} link={data.link} />
            <ProviderSection label="Free / Ad-supported" providers={data.providers!.free} link={data.link} />
            <ProviderSection label="Rent" providers={data.providers!.rent} link={data.link} />
            <ProviderSection label="Buy" providers={data.providers!.buy} link={data.link} />
          </div>
        )}
        <p className="text-xs text-violet-300 mt-5">
          Streaming data provided by{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-600 underline">
            TMDB
          </a>{" "}
          via JustWatch.
        </p>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [providerData, setProviderData] = useState<ProvidersResponse | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [country, setCountry] = useState(process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "US");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProviders = useCallback(async (result: SearchResult, countryCode: string) => {
    setLoadingProviders(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers?id=${result.id}&type=${result.mediaType}&country=${countryCode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load providers");
      setProviderData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setSelected(result);
      setResults([]);
      setQuery(result.title);
      fetchProviders(result, country);
    },
    [country, fetchProviders]
  );

  const handleCountryChange = useCallback(
    (newCountry: string) => {
      setCountry(newCountry);
      if (selected) fetchProviders(selected, newCountry);
    },
    [selected, fetchProviders]
  );

  const handleInput = (value: string) => {
    setQuery(value);
    setSelected(null);
    setProviderData(null);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.results ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen text-gray-900" style={{backgroundImage: "url('/nightsky.jpeg')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed"}}>
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl mb-2 text-white" style={{fontFamily: "var(--font-display)"}}>Where Do I Watch?</h1>
          <p className="text-white">Easy to find, no stress 👍</p>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-gray-400 shadow-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="Search for a movie or TV show..."
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-base"
              autoFocus
            />
            {searching && (
              <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]); setSelected(null); setProviderData(null); setError(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl z-10">
              {results.map((r) => (
                <button
                  key={`${r.mediaType}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                >
                  {r.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                      alt={r.title}
                      width={32}
                      height={48}
                      className="rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.title}
                      {r.year && <span className="text-gray-400 font-normal ml-1">({r.year})</span>}
                    </p>
                    <p className="text-xs text-gray-400">{r.mediaType === "tv" ? "TV Series" : "Movie"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-900/20 border border-red-400/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading providers */}
        {loadingProviders && (
          <div className="mt-6 flex items-center justify-center gap-2 text-violet-400 text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Looking up streaming services...
          </div>
        )}

        {/* Provider results */}
        {selected && providerData && !loadingProviders && (
          <ProviderCard
            result={selected}
            data={providerData}
            country={country}
            onCountryChange={handleCountryChange}
          />
        )}
      </div>
    </div>
  );
}
