import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { about } from "@/lib/config/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Sobre nós",
  description:
    "Conheça a Rose Imports, nossa forma de selecionar produtos e o atendimento próximo que acompanha cada pedido.",
};

export default function SobreNosPage() {
  return (
    <div className="overflow-hidden">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.82fr)] lg:gap-16 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-rose">Sobre a Rose Imports</p>
          <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Sua essência merece uma fragrância inesquecível.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-ink-soft sm:text-lg">
            {about.intro}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
            Aqui, cada pessoa pode conhecer os produtos no seu tempo e contar
            com uma conversa de verdade quando precisar de ajuda.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-rose px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-rose-deep hover:shadow-lg"
            >
              Conhecer os produtos
            </Link>
            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line-strong bg-white px-6 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-rose-soft hover:text-rose"
            >
              Conversar no WhatsApp
            </a>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-rose-wash/80 sm:-inset-7" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-ivory-deep shadow-[0_24px_70px_rgba(25,20,19,0.14)]">
            <Image
              src="/sobre/rose-retrato-natural.png"
              alt="Atendimento da Rose Imports"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 42vw"
              className="object-cover object-center"
            />
          </div>
          <figcaption className="absolute -bottom-5 left-4 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ink shadow-lg sm:left-8">
            Atendimento próximo, do começo ao fim.
          </figcaption>
        </figure>
      </section>

      <section className="mt-8 bg-ink text-white sm:mt-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold text-rose-soft">Bem-vindo</p>
            <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
              Um jeito simples e próximo de encontrar seu próximo favorito.
            </h2>
          </div>
          <div className="grid gap-5 text-base leading-8 text-white/70">
            {about.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-rose">O que importa para nós</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Cuidado em cada etapa da escolha
          </h2>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {about.pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-line bg-white p-6 shadow-[0_10px_30px_rgba(25,20,19,0.045)] sm:p-7"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-wash text-sm font-bold text-rose-deep">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-xl">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
