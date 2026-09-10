/**
 * Seta compartilhada das galerias e carrosséis.
 *
 * Só o glifo, sem círculo: o botão redondo de 44px tapava a foto do produto,
 * que é o que importa na vitrine. A área de clique continua com 28x44px, mas
 * transparente, então não cobre nada visualmente.
 *
 * Glifo escuro com halo branco porque a maior parte do catálogo é foto sobre
 * fundo claro, onde um chevron branco sumia; nas fotos escuras o halo contorna
 * o glifo e ele continua legível.
 *
 * Cada lugar acrescenta o próprio posicionamento e a própria regra de
 * visibilidade — o que fica aqui é só a aparência da seta.
 */
export const CAROUSEL_ARROW_SKIN = `
  flex h-11 w-7 items-center justify-center
  text-ink drop-shadow-[0_0_3px_rgba(255,255,255,0.95)]
  active:scale-90
`;

export function ChevronIcon({
  direction,
  size = 22,
}: {
  direction: "left" | "right";
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}
