import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-7xl font-extrabold text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Paj sa a pa egziste</h1>
      <p className="mt-2 text-zinc-400">Petèt lyen an mal ekri, oswa paj la te efase.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3 font-semibold text-white"
      >
        Retounen lakay
      </Link>
    </div>
  );
}
