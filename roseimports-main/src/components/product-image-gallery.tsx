"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product-image";
import {
  CAROUSEL_ARROW_SKIN,
  ChevronIcon,
} from "@/components/carousel-arrow";

type GalleryImage = {
  path: string;
  alt: string | null;
};

type ProductImageGalleryProps = {
  images: GalleryImage[];
  fallbackPath?: string | null;
  fallbackAlt?: string | null;
  productName: string;
  productHref: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /**
   * "showcase" é a moldura grande (faixa editorial), com respiro para a seta.
   * "card" é o quadro do grid: no celular ele tem 140px, e ali as setas
   * cobriam 30% da foto e encostavam no coração de favoritar — por isso o card
   * troca as setas por arraste + bolinhas abaixo de 640px.
   */
  variant?: "card" | "showcase";
};

/** Deslocamento horizontal mínimo, em px, para o arraste contar como troca de foto. */
const SWIPE_THRESHOLD = 40;

/** Acima disso o rodapé vira contador: bolinhas demais não cabem nos 140px do card. */
const MAX_DOTS = 6;

export function ProductImageGallery({
  images,
  fallbackPath = null,
  fallbackAlt = null,
  productName,
  productHref,
  sizes,
  priority = false,
  className = "relative",
  imageClassName = "object-contain object-center",
  variant = "showcase",
}: ProductImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const current = images[selected] ?? images[0] ?? null;
  const hasGallery = images.length > 1;
  const isCard = variant === "card";
  const swipeable = isCard && hasGallery;

  // No showcase a seta fica sempre visível no celular. No card ela não recebe
  // esse override: some da tela mas continua no DOM, focável por teclado e
  // anunciada por leitor de tela, enquanto o toque usa arraste + bolinhas.
  const arrowMobileReveal = isCard
    ? ""
    : "max-sm:pointer-events-auto max-sm:opacity-100";

  // Card tem moldura de 140px no celular, então a seta cola na borda.
  // O showcase é um painel largo e comporta um respiro maior.
  const arrowInset = isCard ? "left-1" : "left-3";
  const arrowInsetRight = isCard ? "right-1" : "right-3";

  function move(direction: -1 | 1) {
    setSelected((currentIndex) =>
      (currentIndex + direction + images.length) % images.length,
    );
  }

  function handleTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    swiped.current = false;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    // Só gesto claramente horizontal troca a foto: rolar a página na vertical
    // passa por cima do card e não pode virar navegação de imagem.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    // O link cobre a foto inteira. Sem esta marca o fim do arraste também
    // conta como clique e abre o produto.
    swiped.current = true;
    move(deltaX < 0 ? 1 : -1);
  }

  return (
    <div
      className={`group/gallery overflow-hidden ${className}`}
      onTouchStart={swipeable ? handleTouchStart : undefined}
      onTouchEnd={swipeable ? handleTouchEnd : undefined}
    >
      <ProductImage
        path={current?.path ?? fallbackPath}
        alt={current?.alt ?? fallbackAlt ?? productName}
        sizes={sizes}
        priority={priority}
        className={imageClassName}
      />

      <Link
        href={productHref}
        aria-label={`Ver ${productName}`}
        onClick={(event) => {
          if (!swiped.current) return;
          swiped.current = false;
          event.preventDefault();
        }}
        className="absolute inset-0 z-10"
      />

      {hasGallery && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`Ver imagem anterior de ${productName}`}
            className={`
              pointer-events-none absolute top-1/2 z-20
              flex -translate-y-1/2 items-center justify-center
              opacity-0 transition-all duration-200
              focus-visible:pointer-events-auto focus-visible:opacity-100
              group-hover/gallery:pointer-events-auto group-hover/gallery:opacity-100
              ${CAROUSEL_ARROW_SKIN}
              ${arrowInset}
              ${arrowMobileReveal}
            `}
          >
            <ChevronIcon direction="left" />
          </button>

          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`Ver próxima imagem de ${productName}`}
            className={`
              pointer-events-none absolute top-1/2 z-20
              flex -translate-y-1/2 items-center justify-center
              opacity-0 transition-all duration-200
              focus-visible:pointer-events-auto focus-visible:opacity-100
              group-hover/gallery:pointer-events-auto group-hover/gallery:opacity-100
              ${CAROUSEL_ARROW_SKIN}
              ${arrowInsetRight}
              ${arrowMobileReveal}
            `}
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}

      {/* Rodapé só do celular: diz que há mais fotos e em qual delas se está.
          O leitor de tela usa as setas acima, então aqui fica aria-hidden, e
          pointer-events-none deixa o toque passar direto para o link do card. */}
      {swipeable && (
        <div
          aria-hidden
          className="
            pointer-events-none absolute inset-x-0 bottom-2 z-20
            flex items-center justify-center gap-1.5
            sm:hidden
          "
        >
          {images.length <= MAX_DOTS ? (
            images.map((image, index) => (
              <span
                key={image.path}
                className={`
                  h-1.5 w-1.5 rounded-full transition-colors duration-200
                  ${index === selected ? "bg-rose" : "bg-ink/25"}
                `}
              />
            ))
          ) : (
            <span
              className="
                rounded-full bg-surface/90 px-2 py-0.5
                text-[0.6rem] font-medium tabular-nums text-muted
              "
            >
              {selected + 1}/{images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
