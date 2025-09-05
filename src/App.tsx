import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";

type ArtistEntry = {
  id: string;
  name: string;
  artTypes: string[];
  location: string;
  bio: string;
  images: string[];
  links: { label: string; url: string }[];
  createdAt: string;
  approved: boolean;
};

type LinkField = { label: string; url: string };

const SHOW_ADMIN_HINT = import.meta.env.VITE_SHOW_ADMIN_HINT === "true";

export default function App() {
  const [route, setRoute] = useState<string>(window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Load entries
  const [entries, setEntries] = useState<ArtistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from("submissions")
            .select("id,name,art_types,location,bio,images,links,created_at,approved")
            .eq("approved", true)
            .order("name", { ascending: true });
          if (error) throw error;
          const mapped: ArtistEntry[] = (data ?? []).map((r: any) => ({
            id: r.id,
            name: r.name,
            artTypes: Array.isArray(r.art_types) ? r.art_types : (r.art_types ? [r.art_types] : []),
            location: r.location,
            bio: r.bio ?? "",
            images: Array.isArray(r.images) ? r.images : [],
            links: Array.isArray(r.links) ? r.links : [],
            createdAt: r.created_at,
            approved: r.approved ?? false,
          }));
          setEntries(mapped);
        } else {
          const raw = localStorage.getItem("ll_submissions") || "[]";
          const parsed = JSON.parse(raw);
          setEntries((Array.isArray(parsed) ? parsed : []).filter((x) => x.approved !== false));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load locations
  const [worldLocations, setWorldLocations] = useState<string[]>([]);
  useEffect(() => {
    fetch("/cities.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setWorldLocations(list.filter(Boolean));
      })
      .catch(() => {});
  }, []);

  // Filters
  const [q, setQ] = useState("");
  const [filterArt, setFilterArt] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  const artTypesDynamic = useMemo(
    () => uniq(entries.flatMap((e) => e.artTypes).filter(Boolean)),
    [entries]
  );
  const locations = useMemo(
    () => uniq([...entries.map((e) => e.location).filter(Boolean), ...worldLocations]),
    [entries, worldLocations]
  );

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (filterArt === "all" ? true : e.artTypes.includes(filterArt)))
      .filter((e) => (filterLocation === "all" ? true : e.location === filterLocation))
      .filter((e) =>
        q.trim()
          ? `${e.name} ${e.location} ${e.artTypes.join(" ")}`
              .toLowerCase()
              .includes(q.toLowerCase())
          : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, filterArt, filterLocation, q]);

  // Routes
  const artistMatch = route.match(/^#\/artist\/(.+)$/);
  const adminMatch = route.match(/^#\/admin$/);
  const submitMatch = route.match(/^#\/submit$/);

  if (artistMatch) {
    const id = decodeURIComponent(artistMatch[1]);
    const entry = entries.find((e) => e.id === id);
    return <ArtistPage entry={entry} />;
  }
  if (adminMatch) return <AdminPage />;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-mono">
      <header className="sticky top-0 z-10 bg-neutral-50/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="#/" className="tracking-tight text-pink-600 font-bold">Love Letter</a>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#/" className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-100">Directory</a>
            <a href="#/submit" className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-100">Submit</a>
            <a href="#/admin" className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-100">Admin</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {submitMatch ? (
          <SubmissionForm knownLocations={locations.length ? locations : DEFAULT_LOCATIONS} />
        ) : (
          <Directory
            loading={loading}
            entries={filtered}
            q={q}
            setQ={setQ}
            artTypes={["all", ...uniq([...ART_TYPE_OPTIONS, ...artTypesDynamic])]}
            filterArt={filterArt}
            setFilterArt={setFilterArt}
            locations={["all", ...uniq(locations)]}
            filterLocation={filterLocation}
            setFilterLocation={setFilterLocation}
          />
        )}
      </main>
    </div>
  );
}

function ArtistPage({ entry }: { entry?: ArtistEntry }) {
  if (!entry) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-800 font-mono">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <a href="#/" className="text-sm underline">← Back to directory</a>
          <h1 className="mt-4 text-2xl text-pink-600">Artist not found</h1>
          <p className="mt-2 text-neutral-600">The profile you’re looking for doesn’t exist.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-mono">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <a href="#/" className="text-sm underline">← Back to directory</a>
        <header className="mt-4">
          <h1 className="text-2xl text-pink-600 leading-tight">{entry.name}</h1>
          <p className="text-sm text-neutral-600">{entry.artTypes.join(", ")} • {entry.location}</p>
        </header>
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {entry.images?.length ? (
            entry.images.map((src, i) => (
              <img key={i} src={src} alt="art" className="w-full aspect-video object-cover border border-neutral-200" />
            ))
          ) : (
            <a href="#/" className="w-full h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm">No images</a>
          )}
        </section>
        {entry.bio && <p className="mt-6 text-base leading-relaxed">{entry.bio}</p>}
        {entry.links?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {entry.links.map((l, i) => (
              <a key={i} href={normalizeUrl(l.url)} target="_blank" rel="noreferrer" className="text-sm px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100">{l.label}</a>
            ))}
          </div>
        )}
        <p className="mt-6 text-xs text-neutral-500">Added {new Date(entry.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function AdminPage() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadPending() {
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase
        .from("submissions")
        .select("id,name,art_types,location,created_at")
        .eq("approved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPending(data || []);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function moderate(id: string, action: "approve" | "reject") {
    const key = password.trim();
    if (!key) return alert("Enter admin password");
    const res = await fetch("/.netlify/functions/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, key }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return alert(out.error || "Failed");
    await loadPending();
    alert(action === "approve" ? "Approved" : "Rejected");
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-mono">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <a href="#/" className="text-sm underline">← Back</a>
        <h1 className="text-2xl text-pink-600">Moderation</h1>
        <div className="flex items-center gap-2">
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" className="rounded border border-neutral-300 px-3 py-2 bg-neutral-50" />
          <button onClick={loadPending} className="px-3 py-2 rounded border border-neutral-300">Load pending</button>
        </div>
        {loading ? <div>Loading…</div> : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="border border-neutral-200 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-pink-600">{p.name}</div>
                  <div className="text-sm text-neutral-600">{Array.isArray(p.art_types) ? p.art_types.join(", ") : p.art_types} • {p.location}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => moderate(p.id, "approve")} className="px-2 py-1 rounded border border-neutral-300">Approve</button>
                  <button onClick={() => moderate(p.id, "reject")} className="px-2 py-1 rounded border border-neutral-300">Reject</button>
                </div>
              </div>
            ))}
            {pending.length === 0 && <div className="text-neutral-500">No pending submissions.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact multi-select dropdown for disciplines (max 3)
function MultiSelectDiscipline({ value, onChange, options, limit=3 }: { value: string[]; onChange: (v: string[]) => void; options: string[]; limit?: number }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter(x => x !== opt));
    else if (value.length < limit) onChange([...value, opt]);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50 text-left">
        {value.length === 0 ? "Select disciplines…" : value.join(", ")}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 overflow-auto w-full border border-neutral-300 bg-white shadow">
          {options.map((opt) => {
            const checked = value.includes(opt);
            const disabled = !checked && value.length >= limit;
            return (
              <label key={opt} className={`flex items-center gap-2 px-3 py-2 border-b border-neutral-100 last:border-b-0 ${disabled ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(opt)} />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Simple autocomplete for locations (bigger dropdown)
function LocationAutocomplete({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setQ(value), [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return options.slice(0, 20);
    const low = q.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(low)).slice(0, 20);
  }, [q, options]);

  function select(val: string) {
    onChange(val);
    setQ(val);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50"
        placeholder="City, Country"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 overflow-auto w-full border border-neutral-300 bg-white shadow text-sm">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-neutral-500">No matches</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => select(opt)}
                className="block w-full text-left px-3 py-2 hover:bg-neutral-100"
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionForm({ knownLocations }: { knownLocations: string[] }) {
  const [name, setName] = useState("");
  const [artTypes, setArtTypes] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<LinkField[]>([{ label: "Instagram", url: "" }]);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const dataUrls = await Promise.all(arr.map(fileToDataURL));
    setImages((prev) => [...prev, ...dataUrls]);
  }
  function removeImage(idx: number) { setImages((prev) => prev.filter((_, i) => i !== idx)); }
  function updateLink(idx: number, patch: Partial<LinkField>) { setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))); }
  function addLink() { setLinks((prev) => [...prev, { label: "Website", url: "" }]); }
  function removeLink(idx: number) { setLinks((prev) => prev.filter((_, i) => i !== idx)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || artTypes.length === 0 || !location.trim()) {
      alert("Please fill Name, select up to 3 disciplines, & Location.");
      return;
    }
    setSaving(true);
    try {
      let imageUrls: string[] = [];
      if (supabase && images.length) {
        for (let i = 0; i < images.length; i++) {
          const dataUrl = images[i];
          const blob = await (await fetch(dataUrl)).blob();
          const filename = `${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage.from("images").upload(`public/${filename}`, blob, { upsert: false });
          if (error) throw error;
          const { data: pub } = supabase.storage.from("images").getPublicUrl(`public/${filename}`);
          imageUrls.push(pub.publicUrl);
        }
      } else {
        imageUrls = images;
      }

      if (supabase) {
        const { error } = await supabase.from("submissions").insert({
          name: name.trim(),
          art_types: artTypes,
          location: location.trim(),
          bio: bio.trim(),
          images: imageUrls,
          links: links.filter((l) => l.url.trim()),
          approved: false,
        });
        if (error) throw error;
      } else {
        const entry: any = {
          id: crypto.randomUUID(),
          name: name.trim(),
          artTypes,
          location: location.trim(),
          bio: bio.trim(),
          images,
          links: links.filter((l) => l.url.trim()),
          createdAt: new Date().toISOString(),
          approved: true,
        };
        const raw = localStorage.getItem("ll_submissions") || "[]";
        const parsed = JSON.parse(raw);
        localStorage.setItem("ll_submissions", JSON.stringify([entry, ...parsed]));
      }

      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 60000);
      setName(""); setArtTypes([]); setLocation(""); setBio(""); setLinks([{ label: "Instagram", url: "" }]); setImages([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid md:grid-cols-5 gap-8">
      <div className="md:col-span-5">
        <h2 className="text-lg mb-2 text-pink-600">Submit your work</h2>
        <p className="text-sm text-neutral-600 mb-2">Required: Name, up to 3 disciplines, & Location.</p>
        <p className="text-xs text-neutral-500 mb-6">Disclaimer: Submissions can’t be edited or deleted by artists at this stage. If you need a change or removal, please contact support.</p>
        {justSubmitted && (
          <div className="mb-4 rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm">
            Thanks! Your submission was received and is <span className="text-pink-600">awaiting moderation</span>.
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50" placeholder="Name" />
          </div>

          <div>
            <label className="block text-sm">Disciplines (choose up to 3)</label>
            <MultiSelectDiscipline value={artTypes} onChange={setArtTypes} options={ART_TYPE_OPTIONS} limit={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Where you're from (City, Country)</label>
              <LocationAutocomplete value={location} onChange={setLocation} options={knownLocations} />
            </div>
          </div>

          <div>
            <label className="block text-sm">Artist bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50" placeholder="Short bio (optional)" />
          </div>

          <div>
            <label className="block text-sm mb-2">Images (JPG/PNG, multiple)</label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                {images.map((src, i) => (
                  <div key={i} className="relative group border border-neutral-300 rounded overflow-hidden">
                    <img src={src} alt="upload preview" className="w-full h-28 object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 text-xs bg-neutral-50/95 rounded px-1.5 py-0.5 border border-neutral-300 opacity-0 group-hover:opacity-100 transition">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Links</label>
              <button type="button" onClick={addLink} className="text-sm underline">+ Add link</button>
            </div>
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input value={l.label} onChange={(e) => updateLink(i, { label: e.target.value })} className="col-span-4 rounded border border-neutral-300 px-3 py-2 bg-neutral-50" placeholder="Label (Instagram, Website, Portfolio)" />
                <input value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} className="col-span-7 rounded border border-neutral-300 px-3 py-2 bg-neutral-50" placeholder="https://..." />
                <button type="button" onClick={() => removeLink(i)} className="col-span-1 text-sm underline">Remove</button>
              </div>
            ))}
          </div>

          <div>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded border border-neutral-400 px-5 py-2.5 hover:bg-neutral-100 disabled:opacity-50">
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Directory(props: {
  loading: boolean;
  entries: ArtistEntry[];
  q: string; setQ: (v: string) => void;
  artTypes: string[]; filterArt: string; setFilterArt: (v: string) => void;
  locations: string[]; filterLocation: string; setFilterLocation: (v: string) => void;
}) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm">Search</label>
          <input value={props.q} onChange={(e) => props.setQ(e.target.value)} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50" placeholder="Search by name, discipline, location" />
        </div>
        <div>
          <label className="block text-sm">Discipline</label>
          <select value={props.filterArt} onChange={(e) => props.setFilterArt(e.target.value)} className="mt-1 rounded border border-neutral-300 px-3 py-2 min-w-[200px] bg-neutral-50">
            {props.artTypes.map((t) => <option key={t} value={t}>{t === "all" ? "All" : t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Location</label>
          <select value={props.filterLocation} onChange={(e) => props.setFilterLocation(e.target.value)} className="mt-1 rounded border border-neutral-300 px-3 py-2 min-w-[200px] bg-neutral-50">
            {props.locations.map((t) => <option key={t} value={t}>{t === "all" ? "All" : t}</option>)}
          </select>
        </div>
      </div>

      {props.loading ? <div>Loading…</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {props.entries.map((e) => <ArtistCard key={e.id} entry={e} />)}
          {props.entries.length === 0 && (
            <div className="col-span-full text-center text-neutral-400 py-10">
              No entries yet.
              {SHOW_ADMIN_HINT && <div className="mt-2 text-xs text-neutral-500">Tip: go to <code>#/admin</code> and approve pending submissions.</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ArtistCard({ entry }: { entry: ArtistEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded overflow-hidden">
      {entry.images?.length > 0 ? (
        <a href={`#/artist/${encodeURIComponent(entry.id)}`} aria-label={`Open profile for ${entry.name}`}>
          <img src={entry.images[0]} alt={entry.name} className="w-full h-48 object-cover" />
        </a>
      ) : (
        <a href={`#/artist/${encodeURIComponent(entry.id)}`} aria-label={`Open profile for ${entry.name}`}>
          <div className="w-full h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm">No image</div>
        </a>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="leading-tight">
              <a href={`#/artist/${encodeURIComponent(entry.id)}`} className="text-pink-600 hover:underline">{entry.name}</a>
            </h3>
            <p className="text-sm text-neutral-600">{entry.artTypes.join(", ")} • {entry.location}</p>
          </div>
        </div>
        {entry.bio && <p className="text-sm">{entry.bio}</p>}
        <button onClick={() => setOpen(!open)} className="text-sm underline">{open ? "Hide details" : "View details"}</button>
        {open && (
          <div className="pt-2 space-y-3">
            {entry.images?.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {entry.images.slice(1).map((src, i) => <img key={i} src={src} alt="art" className="w-full h-24 object-cover rounded" />)}
              </div>
            )}
            {entry.links?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {entry.links.map((l, i) => (
                  <a key={i} href={normalizeUrl(l.url)} target="_blank" rel="noreferrer" className="text-sm px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100">{l.label}</a>
                ))}
              </div>
            )}
            <p className="text-xs text-neutral-500">Added {new Date(entry.createdAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Helpers **/
function uniq(arr: (string | undefined)[]) {
  return Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function normalizeUrl(url: string) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

const ART_TYPE_OPTIONS = [
  "Painting","Illustration","Photography","Film/Video","Animation","Graphic Design","Typography","Web/Interactive",
  "3D/CGI","Sculpture","Installation","Performance","Sound/Music","DJ/Producer","Fashion/Textiles","Accessories/Jewellery",
  "Product/Industrial","Architecture","Interior","Motion Design","Game Art","Mixed Media","Collage","Graffiti","Street Art",
  "Zine/Publishing","Curatorial","Creative Direction",
  "Tattoo","Nail Artist","Calligraphy","Printmaking","Ceramics","Poetry/Spoken Word","Creative Coding/Generative","AI Art","Data Art","New Media",
  "Set Design","Production Design","Costume","Styling","HMUA (Hair/Makeup)","Lighting Design","Gaffer","Stage Design","Projection/VJ",
];
 
const DEFAULT_LOCATIONS = ["Melbourne, Australia","Sydney, Australia","Brisbane, Australia","Perth, Australia","Adelaide, Australia","Auckland, New Zealand","Wellington, New Zealand","London, UK","Berlin, Germany","Lisbon, Portugal","Paris, France","New York, USA","Los Angeles, USA"];
