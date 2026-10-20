export type SongCardData = {
  id: string;
  title: string;
  genre: string | null;
  artistName: string;
  coverUrl: string | null;
};

export function SongCard({ song }: { song: SongCardData }) {
  return (
    <article className="group rounded-xl bg-zinc-900/60 p-3 transition hover:bg-zinc-800/80">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
        {song.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🎵</div>
        )}
        <span className="absolute bottom-2 right-2 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-fuchsia-500 text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
          ▶
        </span>
      </div>
      <h3 className="mt-3 truncate font-semibold text-white">{song.title}</h3>
      <p className="truncate text-sm text-zinc-400">
        {song.artistName}
        {song.genre ? ` · ${song.genre}` : ""}
      </p>
    </article>
  );
}
