"use client";

import Link from "next/link";
import {
  CAROUSEL_ARROW_SKIN,
  ChevronIcon,
} from "@/components/carousel-arrow";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { useHomePicks } from "@/features/home/home-picks";
import { formatCents } from "@/lib/money";

/** Tempo que cada destaque fica em tela antes de passar para o seguinte. */
const AUTOPLAY_MS = 7000;

const DEFAULT_DESCRIPTION =
  "Conheça uma seleção especial da Rose Imports e confira as opções disponíveis.";

function summarize(description: string | null) {
  if (!description) return DEFAULT_DESCRIPTION;

  const clean = description.replace(/\s+/g, " ").trim();

  return clean.length > 125
    ? `${clean.slice(0, 122).trimEnd()}…`
    : clean;
}

function formatHeroTitle(name: string) {
  const firstProduct = name.split("/")[0]?.trim() || name;

  const withoutMeta = firstProduct
    .replace(/\bEDP\b/gi, "")
    .replace(/\bEDT\b/gi, "")
    .replace(/\b\d+\s*ML\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const lowercaseWords = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
  ]);

  return withoutMeta
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowercaseWords.has(word)) {
        return word;
      }

      return (
        word.charAt(0).toLocaleUpperCase("pt-BR") +
        word.slice(1)
      );
    })
    .join(" ");
}

function formatHeroMeta(name: string) {
  const upper = name.toUpperCase();

  let concentration: string | null = null;

  if (upper.includes("EDP")) {
    concentration = "Eau de Parfum";
  } else if (upper.includes("EDT")) {
    concentration = "Eau de Toilette";
  }

  const volume = name.match(/(\d+)\s*ML/i)?.[1];

  return [
    concentration,
    volume ? `${volume} ml` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function HeroCarousel() {
  const { hero: products, ready } = useHomePicks();
  const [activeIndex, setActiveIndex] = useState(0);
  // Incrementado só na troca manual, para reiniciar a contagem sem
  // recriar o intervalo a cada passagem automática.
  const [manualToken, setManualToken] = useState(0);
  const total = products.length;

  // Se o sorteio mudar a quantidade de destaques, o índice anterior
  // pode apontar para fora da lista.
  useEffect(() => {
    setActiveIndex((index) => (index < total ? index : 0));
  }, [total]);

  // O intervalo não depende do índice: recriá-lo a cada passagem somaria
  // o tempo de render ao ciclo. Só a troca manual reinicia a contagem.
  useEffect(() => {
    if (total <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % total),
      AUTOPLAY_MS,
    );

    return () => window.clearInterval(timer);
  }, [total, manualToken]);

  if (products.length === 0) {
    return (
      <section
        className="
          grid min-h-[320px]
          place-items-center
          bg-surface
          px-6 py-10
          text-center
          sm:min-h-[360px]
          lg:min-h-[400px]
        "
      >
        <div>
          <p className="text-sm font-semibold text-rose">
            Rose Imports
          </p>

          <h1
            className="
              mx-auto mt-3
              max-w-xl
              text-3xl font-bold
              leading-tight
              tracking-[-0.025em]
              sm:text-4xl
            "
          >
            Perfumes e cuidados corporais importados.
          </h1>

          <p
            className="
              mx-auto mt-4
              max-w-lg
              text-sm leading-6
              text-muted
              sm:text-base
            "
          >
            Produtos selecionados para deixar sua experiência de compra
            mais simples e especial.
          </p>

          <Link
            href="/catalogo"
            className="
              mt-6 inline-flex min-h-11
              items-center justify-center
              rounded-lg bg-rose
              px-5
              text-sm font-semibold
              text-white
              transition-all duration-200
              hover:-translate-y-0.5
              hover:bg-rose-deep
              hover:shadow-md
              active:translate-y-0
              active:scale-[0.98]
            "
          >
            Ver catálogo
          </Link>
        </div>
      </section>
    );
  }

  const product = products[activeIndex] ?? products[0];

  if (!product) return null;

  const goTo = (index: number) => {
    setActiveIndex((index + total) % total);
    setManualToken((token) => token + 1);
  };

  const heroTitle = formatHeroTitle(product.name);
  const heroMeta = [
    product.categoryName,
    product.familyName,
    product.volumeLabel ?? formatHeroMeta(product.name),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da Rose Imports"
      className={`
        grid overflow-hidden
        bg-surface
        md:min-h-[500px]
        md:grid-cols-[0.88fr_1.12fr]
        lg:min-h-[540px]
        lg:grid-cols-[0.9fr_1.1fr]
        ${ready ? "" : "opacity-0"}
      `}
    >
      {/* IMAGEM */}
      <div
        className="
          group/image
          relative
          h-[210px]
          overflow-hidden
          rounded-r-2xl
          bg-surface
          sm:h-[260px]
          md:min-h-[500px]
          lg:min-h-[540px]
        "
      >
        <ProductImage
          path={product.imagePath}
          alt={product.imageAlt ?? product.name}
          sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 45vw, 547px"
          priority
          className="object-contain object-center"
        />

        {/* Overlay */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            bg-gradient-to-t
            from-black/10
            via-transparent
            to-transparent
          "
        />

        {/* SETAS */}
        {total > 1 && (
          <>
            {/* Anterior */}
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Destaque anterior"
              className={`
                absolute left-2 top-1/2 z-20
                ${CAROUSEL_ARROW_SKIN}
                -translate-y-1/2
                transition-all duration-300 ease-out

                lg:-translate-x-2
                lg:opacity-0
                lg:group-hover/image:translate-x-0
                lg:group-hover/image:opacity-100
              `}
            >
              <ChevronIcon direction="left" />
            </button>

            {/* Próximo */}
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Próximo destaque"
              className={`
                absolute right-2 top-1/2 z-20
                ${CAROUSEL_ARROW_SKIN}
                -translate-y-1/2
                transition-all duration-300 ease-out

                lg:translate-x-2
                lg:opacity-0
                lg:group-hover/image:translate-x-0
                lg:group-hover/image:opacity-100
              `}
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        )}
      </div>

      {/* INFORMAÇÕES */}
      <div
        className="
          flex min-w-0 flex-col
          justify-center
          bg-gradient-to-br
          from-surface
          to-rose-wash/30
          px-5 py-5
          sm:px-7 sm:py-7
          md:px-8 md:py-9
          lg:px-10 lg:py-10
          xl:px-12
        "
      >
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="
              rounded-full
              bg-gold-soft/30
              px-3 py-1
              text-xs font-semibold
              text-gold
            "
          >
            Destaque Rose
          </span>

          {product.brand && (
            <span
              className="
                rounded-full
                bg-gold-soft/30
                px-3 py-1
                text-xs font-semibold
                text-gold
              "
            >
              {product.brand}
            </span>
          )}
        </div>

        {/* Nome */}
        <h1
          className="
            mt-3
            max-w-[19ch]
            text-3xl font-bold
            leading-[1.05]
            tracking-[-0.035em]
            text-ink
            sm:text-4xl
            lg:text-[2.7rem]
          "
        >
          {heroTitle}
        </h1>

        {/* Tipo + volume */}
        <p className="mt-2 text-sm font-medium leading-6 text-muted sm:text-base sm:leading-7">
          {heroMeta || "\u00A0"}
        </p>

        <div className="mt-3 h-[2px] w-10 rounded-full bg-rose/40 sm:mt-4" />

        {/* Descrição */}
        <p
          className="
            mt-4 hidden
            max-w-lg
            min-h-12
            text-sm leading-6
            text-ink-soft
            sm:line-clamp-2 sm:text-base
          "
        >
          {summarize(product.description)}
        </p>

        {/* PREÇO */}
        {product.fromPriceCents !== null && (
          <div className="mt-4 min-h-[4.25rem] sm:mt-5 sm:min-h-[4.5rem]">
            {product.variantCount > 1 && (
              <p className="mb-1 text-xs text-muted">
                A partir de
              </p>
            )}

            <p className="text-2xl font-bold tracking-[-0.025em]">
              {formatCents(product.fromPriceCents)}
            </p>

            <p className="mt-1 text-sm text-muted">
              Em até 3x com juros da maquininha
            </p>
          </div>
        )}

        {/* BOTÕES */}
        <div className="mt-5 grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap lg:mt-6">
          <Link
            href={`/produto/${product.slug}`}
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-lg bg-rose
              px-3 sm:px-5
              text-sm font-semibold
              text-white
              transition-all duration-200
              hover:-translate-y-0.5
              hover:bg-rose-deep
              hover:shadow-[0_8px_20px_rgba(0,0,0,0.10)]
              active:translate-y-0
              active:scale-[0.98]
            "
          >
            Ver produto
          </Link>

          <Link
            href="/catalogo"
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-lg
              border border-line-strong
              bg-surface
              px-3 sm:px-5
              text-sm font-semibold
              text-ink
              transition-all duration-200
              hover:border-rose
              hover:text-rose
            "
          >
            Ver catálogo
          </Link>
        </div>

        {/* INDICADORES */}
        {total > 1 && (
          <div className="mt-4 flex items-center gap-2 lg:mt-6">
            {products.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir para o destaque ${index + 1}`}
                aria-current={
                  index === activeIndex
                    ? "true"
                    : undefined
                }
                className={`
                  h-1 rounded-full
                  transition-all duration-300
                  ${
                    index === activeIndex
                      ? "w-7 bg-rose"
                      : "w-3 bg-rose-soft/60 hover:bg-rose-soft"
                  }
                `}
              />
            ))}

            <span className="ml-2 text-xs text-muted">
              {activeIndex + 1} de {total}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
