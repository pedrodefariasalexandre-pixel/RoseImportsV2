export type OrderNumberValidation = {
  valid: boolean;
  normalized: string;
  error: string | null;
};

/** Converte as formas amigáveis aceitas pela tela para o código salvo. */
export function normalizeOrderNumber(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/^#+/, "").trim();

  if (/^\d+$/.test(cleaned)) return `RI-${cleaned}`;

  const prefixed = cleaned.match(/^RI[\s-]*(\d+)$/);
  if (prefixed) return `RI-${prefixed[1]}`;

  return cleaned;
}

/**
 * Os pedidos são gerados pela sequência do banco no formato RI-1000.
 * Esta validação confirma o formato sem expor a existência de um pedido.
 */
export function validateOrderNumber(value: string): OrderNumberValidation {
  if (!value.trim()) {
    return {
      valid: false,
      normalized: "",
      error: "Informe o número do pedido.",
    };
  }

  const normalized = normalizeOrderNumber(value);
  const match = normalized.match(/^RI-(\d{4,10})$/);

  if (!match || Number(match[1]) < 1000) {
    return {
      valid: false,
      normalized,
      error: "Digite um código válido, como RI-1048 ou apenas 1048.",
    };
  }

  return { valid: true, normalized, error: null };
}
