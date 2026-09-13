import Image from "next/image";
import Link from "next/link";

/**
 * A marca tem três apresentações, porque a logo completa é detalhada
 * demais para funcionar em tamanho pequeno:
 *
 *   mark  — monograma (rosa + frasco + RI). Header, onde há pouca altura.
 *   full  — logo inteira com letreiro. Home e páginas com espaço.
 *   type  — tipografia sobre fundo escuro. Rodapé, onde o PNG de fundo
 *           claro deixaria um retângulo branco.
 */
type Variant = "mark" | "full" | "header" | "type";

export function Logo({
  variant = "mark",
  href = "/",
  className = "",
  imageClassName = "",
}: {
  variant?: Variant;
  href?: string;
  className?: string;
  imageClassName?: string;
}) {
  if (variant === "type") {
    return (
      <Link href={href} className={`inline-flex flex-col ${className}`}>
        <span
          className="font-display text-lg leading-none"
          style={{ letterSpacing: "0.14em" }}
        >
          ROSE IMPORTS
        </span>
        <span className="filete mt-2" aria-hidden />
      </Link>
    );
  }

  if (variant === "header") {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-2.5 transition-opacity hover:opacity-80 ${className}`}
        aria-label={href === "/" ? "Rose Imports — página inicial" : "Painel Rose Imports"}
      >
        <span
          className={`relative h-10 w-[70px] shrink-0 overflow-hidden sm:h-12 sm:w-[84px] lg:h-14 lg:w-[98px] ${imageClassName}`}
          aria-hidden
        >
          <Image
            src="/logo-header-black.webp"
            alt=""
            width={512}
            height={512}
            priority
            sizes="(max-width: 639px) 80px, (max-width: 1023px) 96px, 112px"
            className="absolute -left-1 -top-2 h-20 w-20 max-w-none sm:-left-[5px] sm:-top-2 sm:h-24 sm:w-24 lg:-left-[7px] lg:-top-2.5 lg:h-28 lg:w-28"
          />
        </span>

        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="whitespace-nowrap font-serif text-lg italic leading-none tracking-[0.04em] text-rose-soft lg:text-xl">
            Rose Imports
          </span>
          <span className="mt-1 whitespace-nowrap text-[0.42rem] font-medium uppercase tracking-[0.16em] text-gold-soft/75 lg:text-[0.48rem]">
            Perfumaria e cosméticos importados
          </span>
        </span>
      </Link>
    );
  }

  const isFull = variant === "full";

  return (
    <Link
      href={href}
      className={`inline-block transition-opacity hover:opacity-80 ${className}`}
      aria-label={href === "/" ? "Rose Imports — página inicial" : "Painel Rose Imports"}
    >
      <Image
        src={isFull ? "/logo.png" : "/logo-mark.png"}
        alt="Rose Imports"
        width={isFull ? 450 : 240}
        height={isFull ? 356 : 150}
        priority
        sizes={isFull ? "(max-width: 640px) 260px, 420px" : "150px"}
        className={`${isFull ? "h-auto w-full" : "h-9 w-auto sm:h-10"} ${imageClassName}`}
      />
    </Link>
  );
}
