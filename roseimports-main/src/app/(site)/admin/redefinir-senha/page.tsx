import type { Metadata } from "next";
import { PasswordUpdateForm } from "@/features/admin/password-update-form";

export const metadata: Metadata = {
  title: "Criar nova senha",
  robots: { index: false },
};

export default function PasswordUpdatePage() {
  return (
    <div className="flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="eyebrow">Painel administrativo</p>
          <h1 className="mt-2 text-2xl">Criar nova senha</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Escolha uma senha exclusiva para acessar o painel.
          </p>
          <div className="filete mx-auto mt-3 max-w-40" aria-hidden />
        </div>

        <div className="mt-8 border border-line bg-surface p-7">
          <PasswordUpdateForm />
        </div>
      </div>
    </div>
  );
}
