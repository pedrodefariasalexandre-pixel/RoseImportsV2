import { describe, expect, it } from "vitest";
import { imageUploadSummary } from "@/features/admin/image-upload-summary";

describe("imageUploadSummary", () => {
  it("resume sucessos e todas as falhas de um lote misto", () => {
    expect(
      imageUploadSummary(1, 3, [
        "gigante.png passa de 5 MB.",
        "documento.txt não é uma imagem.",
      ]),
    ).toBe(
      "1 de 3 imagens enviadas. gigante.png passa de 5 MB. documento.txt não é uma imagem.",
    );
  });

  it("informa quando nenhuma imagem do lote foi enviada", () => {
    expect(
      imageUploadSummary(0, 2, [
        "foto.png passa de 5 MB.",
        "arquivo.pdf não é uma imagem.",
      ]),
    ).toBe(
      "0 de 2 imagens enviadas. foto.png passa de 5 MB. arquivo.pdf não é uma imagem.",
    );
  });

  it("usa o singular para um lote de uma imagem", () => {
    expect(imageUploadSummary(1, 1, [])).toBe("1 de 1 imagem enviada.");
  });
});
