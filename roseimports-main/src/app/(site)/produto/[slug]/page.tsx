import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductGallery } from "@/components/product-gallery";
import { TrustStrip } from "@/components/trust-strip";
import { VariantSelector } from "@/features/product/variant-selector";
import { getProductBySlug } from "@/features/catalog/queries";
import { GENDER_LABEL, PRODUCT_TYPE_LABEL } from "@/lib/labels";
import { imageUrl } from "@/lib/images";
import { whatsappContactUrl } from "@/lib/whatsapp";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };

  const cover = product.images[0];
  const description = product.description?.slice(0, 155) ?? `${product.name}${product.brand ? ` — ${product.brand}` : ""}. Disponível na Rose Imports.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: cover ? [imageUrl(cover.path)] : undefined,
    },
  };
}

export default async function ProdutoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const cover = product.images[0] ?? null;
  const attributes = [
    product.brand && { label: "Marca", value: product.brand },
    product.categoryName && { label: "Categoria", value: product.categoryName },
    { label: "Tipo", value: PRODUCT_TYPE_LABEL[product.productType] ?? "—" },
    product.gender && { label: "Perfil", value: GENDER_LABEL[product.gender] },
    product.familyName && { label: "Família olfativa", value: product.familyName },
  ].filter(Boolean) as { label: string; value: string }[];
  const productWhatsappUrl = whatsappContactUrl(
    `Olá! Gostaria de tirar uma dúvida sobre ${product.name}.`,
  );

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-5 sm:py-10 lg:py-12">
        <nav aria-label="Trilha" className="text-xs text-muted">
          <Link href="/" className="hover:text-rose">Início</Link>
          <span className="mx-2" aria-hidden>/</span>
          <Link href="/catalogo" className="hover:text-rose">Catálogo</Link>
          {product.categorySlug && product.categoryName && (
            <>
              <span className="mx-2" aria-hidden>/</span>
              <Link href={`/catalogo?categoria=${product.categorySlug}`} className="hover:text-rose">{product.categoryName}</Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-9 md:grid-cols-[0.95fr_1.05fr] md:gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 xl:gap-20">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="md:pt-3">
            <header>
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] tracking-[0.12em] text-muted uppercase">
                {product.brand && <span>{product.brand}</span>}
                {product.brand && product.categoryName && <span aria-hidden>·</span>}
                {product.categoryName && <span>{product.categoryName}</span>}
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h1 className="text-3xl leading-[1.08] sm:text-4xl lg:text-[2.65rem]">{product.name}</h1>

                <FavoriteButton
                  productId={product.id}
                  productName={product.name}
                  className="mt-1 shrink-0"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {product.categoryName && (
                  <span className="rounded-full bg-rose-wash px-3 py-1.5 text-xs font-medium text-rose-deep">
                    {product.categoryName}
                  </span>
                )}
                {product.familyName?.split(",").map((family) => (
                  <span
                    key={family}
                    className="rounded-full bg-ivory-deep px-3 py-1.5 text-xs font-medium text-ink-soft"
                  >
                    {family.trim()}
                  </span>
                ))}
                {product.gender && (
                  <span className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted">
                    Perfil {GENDER_LABEL[product.gender].toLocaleLowerCase("pt-BR")}
                  </span>
                )}
              </div>
            </header>

            <div className="mt-7 border-t border-line pt-7">
              <VariantSelector product={product} coverPath={cover?.path ?? null} />
            </div>

            {product.description && (
              <section className="mt-9 rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-6">
                <p className="text-xs font-semibold text-rose">Detalhes da fragrância</p>
                <h2 className="mt-1 text-xl font-semibold">Sobre o produto</h2>
                <p className="mt-3 text-sm leading-7 whitespace-pre-line text-ink-soft">{product.description}</p>
              </section>
            )}

            {attributes.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold">Perfil do produto</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {attributes.map((attribute) => (
                    <div key={attribute.label} className="rounded-xl border border-line bg-surface px-4 py-3.5">
                      <dt className="text-xs text-muted">{attribute.label}</dt>
                      <dd className="mt-1 text-sm font-semibold">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="mt-8 overflow-hidden rounded-2xl bg-ink p-5 text-ivory sm:p-6">
              <p className="text-xs font-semibold text-rose-soft">Compra acompanhada</p>
              <h2 className="mt-1 text-xl font-semibold">Do carrinho ao WhatsApp</h2>
              <ol className="mt-5 grid gap-3 text-sm text-ivory/70 sm:grid-cols-3">
                {[
                  ["1", "Escolha a versão"],
                  ["2", "Monte seu pedido"],
                  ["3", "Combine o fechamento"],
                ].map(([number, label]) => (
                  <li key={number} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose text-xs font-bold text-white">
                      {number}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
              <a
                href={productWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-ivory/20 px-4 text-sm font-semibold text-ivory transition-colors hover:border-rose-soft hover:text-rose-soft"
              >
                Tirar dúvida sobre este produto
              </a>
            </section>
          </div>
        </div>
      </div>
      <TrustStrip />
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}
