import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel request body limit is 4.5 MB
export const ACCEPTED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx"];
const MAX_SOURCE_CHARS = 120_000;

export class ExtractError extends Error {}

function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function normalize(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractFileText(file: File): Promise<{ title: string; text: string; truncated: boolean }> {
  if (file.size === 0) throw new ExtractError("El archivo está vacío.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ExtractError("El archivo supera los 4 MB.");

  const ext = extension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  let raw: string;

  try {
    if (ext === ".txt" || ext === ".md") {
      raw = buffer.toString("utf8");
    } else if (ext === ".docx") {
      raw = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === ".pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      raw = (await extractText(pdf, { mergePages: true })).text;
    } else if (ext === ".doc") {
      throw new ExtractError("Los .doc antiguos no son compatibles. Guárdalo como .docx o .pdf.");
    } else {
      throw new ExtractError(`Formato no compatible. Usa ${ACCEPTED_EXTENSIONS.join(", ")}.`);
    }
  } catch (err) {
    if (err instanceof ExtractError) throw err;
    console.error("file extraction failed", err);
    throw new ExtractError("No se pudo leer el archivo. ¿Está dañado o protegido con contraseña?");
  }

  const text = normalize(raw);
  if (text.length < 20) {
    throw new ExtractError(
      ext === ".pdf"
        ? "El PDF no tiene texto seleccionable (puede ser escaneado)."
        : "El archivo no tiene texto suficiente.",
    );
  }

  const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120);
  return {
    title,
    text: text.slice(0, MAX_SOURCE_CHARS),
    truncated: text.length > MAX_SOURCE_CHARS,
  };
}
