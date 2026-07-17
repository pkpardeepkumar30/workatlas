import Link from "next/link";
import { getSiteConfig } from "@/config/loader";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteConfig();
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center font-bold text-white">{site.name}</Link>
        <div className="rounded-3xl bg-white p-7 shadow-2xl">{children}</div>
      </div>
    </main>
  );
}

