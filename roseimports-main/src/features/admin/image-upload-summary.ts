export function imageUploadSummary(
  uploaded: number,
  total: number,
  failures: string[],
): string {
  const count = `${uploaded} de ${total} ${
    total === 1 ? "imagem enviada" : "imagens enviadas"
  }.`;

  return [count, ...failures].join(" ");
}
