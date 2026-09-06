"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGE =
  "Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.";

/**
 * Protege formulários longos contra saídas acidentais. Links recebem uma
 * confirmação própria; recarregar, fechar a aba ou trocar de endereço usa o
 * aviso nativo do navegador, que é o único permitido nesses casos.
 */
export function UnsavedChangesGuard({ enabled }: { enabled: boolean }) {
  const [destination, setDestination] = useState<string | null>(null);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const allowNavigationRef = useRef(false);

  function closeDialog() {
    setDestination(null);
    window.requestAnimationFrame(() => lastActiveElementRef.current?.focus());
  }

  useEffect(() => {
    if (!enabled) {
      setDestination(null);
      allowNavigationRef.current = false;
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = "";
    }

    function onLinkClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.download || (anchor.target && anchor.target !== "_self")) return;

      const next = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      // Âncoras da própria tela não abandonam o formulário.
      if (
        next.origin === current.origin &&
        next.pathname === current.pathname &&
        next.search === current.search
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      lastActiveElementRef.current = anchor;
      setDestination(next.href);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onLinkClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, [enabled]);

  useEffect(() => {
    if (destination) continueButtonRef.current?.focus();
  }, [destination]);

  if (!enabled || !destination) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink/45 px-5 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alteracoes-nao-salvas-titulo"
        aria-describedby="alteracoes-nao-salvas-texto"
        className="w-full max-w-md border border-line bg-surface p-6 shadow-[0_22px_70px_rgba(25,20,19,0.22)] sm:p-7"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeDialog();
            return;
          }

          if (event.key !== "Tab") return;

          const firstButton = leaveButtonRef.current;
          const lastButton = continueButtonRef.current;
          if (!firstButton || !lastButton) return;

          if (event.shiftKey && document.activeElement === firstButton) {
            event.preventDefault();
            lastButton.focus();
          } else if (!event.shiftKey && document.activeElement === lastButton) {
            event.preventDefault();
            firstButton.focus();
          }
        }}
      >
        <p className="eyebrow">Alterações não salvas</p>
        <h2 id="alteracoes-nao-salvas-titulo" className="mt-2 text-xl">
          Deseja sair desta página?
        </h2>
        <p
          id="alteracoes-nao-salvas-texto"
          className="mt-3 text-sm leading-6 text-muted"
        >
          {MESSAGE}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={leaveButtonRef}
            type="button"
            onClick={() => {
              allowNavigationRef.current = true;
              window.location.assign(destination);
            }}
            className="min-h-11 border border-danger/40 px-5 text-xs font-medium tracking-[0.08em] text-danger uppercase transition-colors hover:bg-danger/5"
          >
            Sair sem salvar
          </button>

          <button
            ref={continueButtonRef}
            type="button"
            onClick={closeDialog}
            className="min-h-11 bg-ink px-5 text-xs font-medium tracking-[0.08em] text-ivory uppercase transition-opacity hover:opacity-90"
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  );
}
