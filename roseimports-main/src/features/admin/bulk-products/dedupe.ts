import {
  normalizeProductIdentityFromDescription,
  type BulkProductConcentration,
  type KitComponent,
  type ParsedBulkProduct,
} from "./parser";

export type BulkProductAnalysisStatus =
  | "new_product"
  | "existing_product"
  | "possible_duplicate"
  | "incomplete"
  | "error";

export type BulkProductProposedAction =
  | "create_inactive_product"
  | "create_inactive_variant";

export type BulkProductAnalysisReason =
  | "duplicate_in_batch"
  | "insufficient_product_identity"
  | "shared_quantity_between_variations"
  | "similar_catalog_product"
  | "brand_missing_requires_review"
  | "category_missing"
  | "product_type_missing"
  | "gender_missing"
  | "variant_identity_incomplete";

export type CatalogVariantCandidate = {
  variantId: string;
  label: string;
  concentration: BulkProductConcentration | null;
  volumeMl: number | null;
  variantType: ParsedBulkProduct["variantType"];
  isKit: boolean;
  components: KitComponent[];
};

export type CatalogProductCandidate = {
  productId: string;
  name: string;
  normalizedName: string;
  normalizedCoreName: string;
  brand: string | null;
  normalizedBrand: string;
  productType: NonNullable<ParsedBulkProduct["productType"]>;
  variants: CatalogVariantCandidate[];
};

export type BulkProductDuplicateCandidate = {
  productId: string;
  productName: string;
  brand: string | null;
  variants: Array<{
    variantId: string;
    label: string;
    concentration: BulkProductConcentration | null;
    volumeMl: number | null;
  }>;
};

export type BulkProductAnalysis = ParsedBulkProduct & {
  status: BulkProductAnalysisStatus;
  proposedAction: BulkProductProposedAction | null;
  matchedProductId: string | null;
  matchedVariantId: string | null;
  requiresPriceReview: boolean;
  candidates: BulkProductDuplicateCandidate[];
  reasons: BulkProductAnalysisReason[];
};

export type BulkProductDuplicateCheckItem = {
  name: string;
  brand: string;
  productType: NonNullable<ParsedBulkProduct["productType"]>;
  concentration: ParsedBulkProduct["concentration"];
  volumeMl: number | null;
  variantType: ParsedBulkProduct["variantType"];
  isKit: boolean;
  components: KitComponent[];
};

export function analyzeBulkProductRecords(
  records: ParsedBulkProduct[],
  catalog: CatalogProductCandidate[],
): BulkProductAnalysis[] {
  return records.map((record) => analyzeRecord(record, catalog));
}

export function findCatalogDuplicateIndexes(
  items: BulkProductDuplicateCheckItem[],
  catalog: CatalogProductCandidate[],
): number[] {
  return items.flatMap((item, index) => {
    const normalizedBrand = normalizeIdentity(item.brand);
    const normalizedName = normalizeProductIdentityFromDescription(
      item.name,
      item.productType,
    );
    const normalizedCoreName = removeBrandFromIdentity(
      normalizedName,
      normalizedBrand,
    );
    const duplicateFound = catalog.some(
      (candidate) => {
        const sameStructuredIdentity =
          candidate.productType === item.productType &&
          candidate.normalizedBrand === normalizedBrand &&
          sameCoreIdentity(candidate.normalizedCoreName, normalizedCoreName);
        const sameCanonicalName = candidate.normalizedName === normalizedName;
        const missingFormConflict =
          !hasProductForm(normalizedName) &&
          hasProductForm(candidate.normalizedName) &&
          stripProductForm(candidate.normalizedName) === normalizedName;

        return (
          (sameStructuredIdentity || sameCanonicalName || missingFormConflict) &&
          candidate.variants.some((variant) => sameVariantIdentity(item, variant))
        );
      },
    );

    return duplicateFound ? [index] : [];
  });
}

export function findRepeatedImportIndexes(
  items: BulkProductDuplicateCheckItem[],
): number[] {
  return items.flatMap((item, index) => {
    const normalizedBrand = normalizeIdentity(item.brand);
    const normalizedName = normalizeProductIdentityFromDescription(
      item.name,
      item.productType,
    );
    const normalizedCoreName = removeBrandFromIdentity(
      normalizedName,
      normalizedBrand,
    );
    const repeated = items.slice(0, index).some((previous) => {
      const previousBrand = normalizeIdentity(previous.brand);
      const previousName = normalizeProductIdentityFromDescription(
        previous.name,
        previous.productType,
      );
      const previousCoreName = removeBrandFromIdentity(
        previousName,
        previousBrand,
      );

      return (
        previous.productType === item.productType &&
        previousBrand === normalizedBrand &&
        sameCoreIdentity(previousCoreName, normalizedCoreName) &&
        sameVariantIdentity(item, previous)
      );
    });

    return repeated ? [index] : [];
  });
}

function analyzeRecord(
  record: ParsedBulkProduct,
  catalog: CatalogProductCandidate[],
): BulkProductAnalysis {
  if (record.duplicateOfIndex !== undefined) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["duplicate_in_batch"],
    });
  }

  if (record.issues.includes("shared_quantity_between_variations")) {
    return result(record, {
      status: "incomplete",
      reasons: ["shared_quantity_between_variations"],
    });
  }

  const requiredFieldReasons: BulkProductAnalysisReason[] = [];
  if (hasInsufficientProductIdentity(record)) {
    requiredFieldReasons.push("insufficient_product_identity");
  }
  if (!record.brand) requiredFieldReasons.push("brand_missing_requires_review");
  if (!record.categorySlug) requiredFieldReasons.push("category_missing");
  if (!record.productType) requiredFieldReasons.push("product_type_missing");
  if (!record.gender) requiredFieldReasons.push("gender_missing");
  if (lacksVariantIdentity(record)) {
    requiredFieldReasons.push("variant_identity_incomplete");
  }

  let missingBrandCandidates: CatalogProductCandidate[] = [];
  if (!record.brand) {
    missingBrandCandidates = catalog.filter(
      (candidate) =>
        candidate.normalizedCoreName === record.normalizedName &&
        candidate.variants.some(
          (variant) => variant.volumeMl === record.volumeMl,
        ),
    );

  }

  const normalizedBrand = normalizeIdentity(record.brand ?? "");
  const normalizedCoreName = removeBrandFromIdentity(
    record.normalizedName,
    normalizedBrand,
  );
  const sameProduct = catalog.filter(
    (candidate) =>
      candidate.productType === record.productType &&
      sameCoreIdentity(candidate.normalizedCoreName, normalizedCoreName) &&
      candidate.normalizedBrand === normalizedBrand,
  );

  // Gênero e categoria não fazem parte da identidade da variante. Mesmo que
  // estejam ausentes, uma coincidência exata já é suficiente para impedir que
  // o mesmo produto/estoque seja cadastrado novamente.
  if (
    record.brand &&
    record.productType &&
    !hasInsufficientProductIdentity(record) &&
    !lacksVariantIdentity(record) &&
    sameProduct.length > 0
  ) {
    const exactMatches = sameProduct.flatMap((product) =>
      product.variants
        .filter((variant) => sameVariantIdentity(record, variant))
        .map((variant) => ({ product, variant })),
    );
    const firstMatch = exactMatches[0];

    if (firstMatch) {
      return result(record, {
        status: "existing_product",
        proposedAction: null,
        matchedProductId: firstMatch.product.productId,
        matchedVariantId: firstMatch.variant.variantId,
        candidates: sameProduct,
      });
    }
  }

  // Nomes idênticos com a mesma variante continuam sendo o mesmo item mesmo
  // quando marca ou tipo foram cadastrados de forma inconsistente no legado.
  // Só automatizamos quando existe um único destino possível no catálogo.
  const sameCanonicalIdentity = catalog.flatMap((product) =>
    product.normalizedName === record.normalizedName
      ? product.variants
          .filter((variant) => sameVariantIdentity(record, variant))
          .map((variant) => ({ product, variant }))
      : [],
  );

  if (record.brand && record.productType && sameCanonicalIdentity.length === 1) {
    const [match] = sameCanonicalIdentity;
    return result(record, {
      status: "existing_product",
      proposedAction: null,
      matchedProductId: match?.product.productId ?? null,
      matchedVariantId: match?.variant.variantId ?? null,
      candidates: match ? [match.product] : [],
    });
  }

  if (sameCanonicalIdentity.length > 1) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["similar_catalog_product"],
      candidates: sameCanonicalIdentity.map(({ product }) => product),
    });
  }

  // Uma entrada sem "BODY SPLASH/BODY CREAM" pode ter sido classificada como
  // perfume, embora o catálogo legado já tenha o mesmo nome e volume em outro
  // formato. Nessa situação jamais liberamos a criação automática.
  const missingFormConflicts = !hasProductForm(record.normalizedName)
    ? catalog.filter(
        (candidate) =>
          hasProductForm(candidate.normalizedName) &&
          stripProductForm(candidate.normalizedName) === record.normalizedName &&
          candidate.variants.some((variant) => sameVariantIdentity(record, variant)),
      )
    : [];

  if (missingFormConflicts.length > 0) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["similar_catalog_product"],
      candidates: missingFormConflicts,
    });
  }

  if (requiredFieldReasons.length > 0) {
    return result(record, {
      status: "incomplete",
      reasons: requiredFieldReasons,
      candidates: missingBrandCandidates,
    });
  }

  if (sameProduct.length === 1) {
    const product = sameProduct[0];
    const exactVariants = product?.variants.filter((variant) =>
      sameVariantIdentity(record, variant),
    );

    if (exactVariants?.length === 1) {
      return result(record, {
        status: "existing_product",
        proposedAction: null,
        matchedProductId: product?.productId ?? null,
        matchedVariantId: exactVariants[0]?.variantId ?? null,
        candidates: product ? [product] : [],
      });
    }

    if ((exactVariants?.length ?? 0) > 1 || lacksVariantIdentity(record)) {
      return result(record, {
        status: "possible_duplicate",
        reasons: ["variant_identity_incomplete"],
        candidates: product ? [product] : [],
      });
    }

    return result(record, {
      status: "existing_product",
      proposedAction: "create_inactive_variant",
      matchedProductId: product?.productId ?? null,
      requiresPriceReview: true,
      candidates: product ? [product] : [],
    });
  }

  if (sameProduct.length > 1) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["similar_catalog_product"],
      candidates: sameProduct,
    });
  }

  const similar = catalog.filter(
    (candidate) =>
      candidate.productType === record.productType &&
      candidate.normalizedBrand === normalizedBrand &&
      candidate.variants.some((variant) => variant.isKit === record.isKit) &&
      tokenSimilarity(candidate.normalizedCoreName, normalizedCoreName) >= 0.8,
  );

  if (similar.length > 0) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["similar_catalog_product"],
      candidates: similar,
    });
  }

  return result(record, {
    status: "new_product",
    proposedAction: "create_inactive_product",
    requiresPriceReview: true,
  });
}

type ResultOverrides = Omit<Partial<BulkProductAnalysis>, "candidates"> & {
  candidates?: CatalogProductCandidate[];
};

function result(
  record: ParsedBulkProduct,
  overrides: ResultOverrides,
): BulkProductAnalysis {
  const { candidates: candidateProducts = [], ...rest } = overrides;

  return {
    ...record,
    status: "error",
    proposedAction: null,
    matchedProductId: null,
    matchedVariantId: null,
    requiresPriceReview: false,
    candidates: candidateProducts.map((candidate) => ({
      productId: candidate.productId,
      productName: candidate.name,
      brand: candidate.brand,
      variants: candidate.variants.map((variant) => ({
        variantId: variant.variantId,
        label: variant.label,
        concentration: variant.concentration,
        volumeMl: variant.volumeMl,
      })),
    })),
    reasons: [],
    ...rest,
  };
}

function hasInsufficientProductIdentity(record: ParsedBulkProduct): boolean {
  if (!record.name) return true;

  const identity = stripProductForm(record.normalizedName);
  const brand = normalizeIdentity(record.brand ?? "");
  const genericPatterns = [
    /^desodorantes? perfumados? arabes?(?: femininos?| masculinos?)?$/,
    /^arabes?(?: femininos?| masculinos?)?$/,
    /^(?:body splash|body mist|desodorante) armen?$/,
  ];

  return identity === brand || genericPatterns.some((pattern) => pattern.test(identity));
}

function lacksVariantIdentity(record: ParsedBulkProduct): boolean {
  if (record.isKit) return false;
  return record.volumeMl === null;
}

type VariantIdentity = Pick<
  ParsedBulkProduct,
  | "concentration"
  | "volumeMl"
  | "variantType"
  | "isKit"
  | "components"
>;

function sameVariantIdentity(
  record: VariantIdentity,
  candidate: VariantIdentity,
): boolean {
  const concentrationMatches =
    candidate.concentration === record.concentration ||
    candidate.concentration === null ||
    record.concentration === null;

  if (
    !concentrationMatches ||
    candidate.variantType !== record.variantType ||
    candidate.isKit !== record.isKit
  ) {
    return false;
  }

  // Alguns kits legados foram gravados apenas como variante "Kit", sem volume
  // ou composição estruturada. Quando nome, marca, tipo e natureza de kit já
  // coincidem, essa ausência de metadados não pode criar uma segunda variante.
  if (
    record.isKit &&
    (record.components.length === 0 || candidate.components.length === 0)
  ) {
    return (
      record.volumeMl === candidate.volumeMl ||
      record.volumeMl === null ||
      candidate.volumeMl === null
    );
  }

  return (
    candidate.volumeMl === record.volumeMl &&
    componentSignature(candidate.components) === componentSignature(record.components)
  );
}

function componentSignature(components: KitComponent[]): string {
  return components
    .map(
      (component) =>
        `${normalizeIdentity(component.type)}:${normalizeIdentity(component.name ?? "")}:${component.volumeMl ?? ""}:${component.quantity ?? ""}`,
    )
    .join("|");
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  const denominator = leftTokens.size + rightTokens.size;

  return denominator === 0 ? 0 : (2 * intersection.length) / denominator;
}

export function normalizeIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function removeBrandFromIdentity(
  normalizedName: string,
  normalizedBrand: string,
): string {
  if (!normalizedBrand) return normalizedName;
  return ` ${normalizedName} `
    .replace(` ${normalizedBrand} `, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sameCoreIdentity(left: string, right: string): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  return coreIdentitySignature(left) === coreIdentitySignature(right);
}

function coreIdentitySignature(value: string): string {
  return value
    .split(" ")
    .filter((token) => token && token !== "imports")
    .sort()
    .join(" ");
}

function hasProductForm(normalizedName: string): boolean {
  return /\bbody (?:splash|cream|lotion)$/.test(normalizedName);
}

function stripProductForm(normalizedName: string): string {
  return normalizedName.replace(/\s+body (?:splash|cream|lotion)$/, "").trim();
}
