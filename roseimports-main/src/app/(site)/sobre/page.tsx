import { permanentRedirect } from "next/navigation";

/** Mantém links antigos funcionando sem duplicar a página institucional. */
export default function SobrePage() {
  permanentRedirect("/sobre-nos");
}
