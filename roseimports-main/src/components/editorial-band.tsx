"use client";

import Link from "next/link";
import { ProductImageGallery } from "@/components/product-image-gallery";
import type { ProductCard } from "@/features/catalog/queries";
import { useHomePicks } from "@/features/home/home-picks";
import { formatCents } from "@/lib/money";

function editorialTitle(product: ProductCard) {
  const firstName = product.name.split("/")[0]?.trim();

  if (!firstName) return product.name;

  return firstName
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\S/g, (letter) =>
      letter.toLocaleUpperCase("pt-BR"),
    );
}

/**
 * Destaque editorial. O produto sai do mesmo sorteio do hero e do
 * carrossel, então nunca repete nada que já esteja na página.
 */
export function EditorialBand() {
  const { editorial: editorialProduct, ready } = useHomePicks();

  if (!editorialProduct) return null;

  return (
    <section
      className={`px-4 py-5 sm:px-6 lg:px-8 ${ready ? "" : "opacity-0"}`}
    >
      <div
        className="
          mx-auto grid max-w-7xl
          overflow-hidden rounded-2xl
          bg-surface text-ivory
          lg:grid-cols-[1fr_1.15fr]
        "
      >
        {/* TEXTO */}
        <div
          className="
            order-2
            flex flex-col justify-center
            bg-ink
            px-6 py-8
            sm:px-8 sm:py-10
            lg:order-1
            lg:px-10 lg:py-10
            xl:px-14
          "
        >
          <p className="text-sm font-bold tracking-[0.08em] text-gold-soft uppercase">
            Destaque Rose Imports
          </p>

          {editorialProduct.brand && (
            <p className="mt-4 text-base text-ivory/60">
              {editorialProduct.brand}
            </p>
          )}

          <h2
            className="
              mt-1 max-w-xl
              text-3xl font-bold
              leading-[1.1]
              tracking-[-0.025em]
              text-ivory
              sm:text-4xl
              lg:text-[2.75rem]
            "
          >
            {editorialTitle(editorialProduct)}
          </h2>

          {editorialProduct.description && (
            <p
              className="
                mt-5
                max-w-[48ch]
                line-clamp-3
                text-base
                leading-7
                text-ivory/65
              "
            >
              {editorialProduct.description}
            </p>
          )}

          {editorialProduct.fromPriceCents !== null && (
            <div className="mt-6">
              {editorialProduct.variantCount > 1 && (
                <p className="mb-1 text-xs text-ivory/45">
                  A partir de
                </p>
              )}

              <p className="text-3xl font-bold tracking-[-0.02em] text-ivory">
                {formatCents(
                  editorialProduct.fromPriceCents,
                )}
              </p>

              <p className="mt-1 text-sm text-ivory/50">
                Em até 3x com juros da maquininha
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href={`/produto/${editorialProduct.slug}`}
              className="
                inline-flex min-h-11
                items-center justify-center
                rounded-lg bg-ivory
                px-5
                text-sm font-semibold
                text-ink
                transition-all duration-200
                hover:-translate-y-0.5
                hover:bg-rose-soft
                hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]
                active:scale-[0.98]
              "
            >
              Ver produto
            </Link>

            <Link
              href="/catalogo"
              className="
                inline-flex items-center gap-1
                text-sm font-semibold
                text-rose-soft
                transition-all duration-200
                hover:gap-2
                hover:text-ivory
              "
            >
              Ver catálogo
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* IMAGEM
            "Destaque" precisa parecer maior que os outros cards da
            página, não caber justo. Por isso o painel:
            - domina a faixa (coluna mais larga que o texto, altura bem
              acima do card comum);
            - tem um brilho radial atrás do produto — dá presença mesmo
              quando a própria foto trouxer bastante respiro em volta,
              que é como a maioria das fotos de frasco/caixa vem;
            - a foto ocupa o painel inteiro, sem padding: várias fotos do
              catálogo vêm com fundo cinza-claro em vez de branco puro,
              e qualquer respiro em volta faz a borda desse fundo virar
              um retângulo visível dentro do painel;
            - altura é piso (min-h), não altura fixa: com título ou
              descrição longos a coluna de texto cresce e o painel
              acompanha, em vez de deixar sobrar o bg-ink da faixa. */}
        <div
          className="
            order-1
            relative
            min-h-[340px]
            overflow-hidden
            bg-surface
            sm:min-h-[420px]
            lg:order-2
            lg:min-h-[500px]
          "
        >
          <div
            aria-hidden
            className="
              pointer-events-none absolute inset-0
              bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,var(--color-rose-wash)_0%,transparent_70%)]
            "
          />

          <ProductImageGallery
            images={editorialProduct.images}
            fallbackPath={editorialProduct.imagePath}
            fallbackAlt={editorialProduct.imageAlt}
            productName={editorialProduct.name}
            productHref={`/produto/${editorialProduct.slug}`}
            sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 55vw, 650px"
            className="absolute inset-0"
            imageClassName="object-contain object-center"
          />
        </div>
      </div>
    </section>
  );
}
