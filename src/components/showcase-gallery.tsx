"use client";

import { useState } from "react";
import Image from "next/image";

export function ShowcaseGallery({ items }: { items: Array<{ title: string; image: string; alt: string }> }) {
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  return <div className="mt-8 grid gap-6 lg:grid-cols-3">{items.map((item) => <figure key={item.image} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    {missing[item.image]
      ? <div className="grid aspect-[8/5] place-items-center bg-slate-100 p-6 text-center text-sm text-slate-500">Preview temporarily unavailable</div>
      : <Image src={item.image} alt={item.alt} width={960} height={600} className="aspect-[8/5] w-full object-cover" onError={() => setMissing((current) => ({ ...current, [item.image]: true }))} />}
    <figcaption className="border-t border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{item.title}</figcaption>
  </figure>)}</div>;
}
