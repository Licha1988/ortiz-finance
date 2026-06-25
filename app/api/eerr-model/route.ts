import { del, head, put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MODEL_PATH = "eerr/model.xlsx";
const META_PATH = "eerr/meta.json";

type EerrModelMeta = {
  fileName: string;
  savedAt: string;
};

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function readMeta(): Promise<EerrModelMeta | null> {
  if (!blobConfigured()) return null;

  try {
    const metaBlob = await head(META_PATH);
    const response = await fetch(metaBlob.url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as EerrModelMeta;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!blobConfigured()) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const modelBlob = await head(MODEL_PATH);
    const meta = await readMeta();
    const response = await fetch(modelBlob.url, { cache: "no-store" });
    if (!response.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Cache-Control": "no-store",
        "X-Eerr-File-Name": meta?.fileName ?? "modelo-importado.xlsx",
        "X-Eerr-Saved-At": meta?.savedAt ?? new Date().toISOString(),
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function POST(request: Request) {
  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN no configurado en Vercel." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo Excel." }, { status: 400 });
  }

  const fileName =
    file instanceof File && file.name.trim()
      ? file.name.trim()
      : "modelo-importado.xlsx";

  const meta: EerrModelMeta = {
    fileName,
    savedAt: new Date().toISOString(),
  };

  await put(META_PATH, JSON.stringify(meta), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  await put(MODEL_PATH, file, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return NextResponse.json({ ok: true, ...meta });
}

export async function DELETE() {
  if (!blobConfigured()) {
    return new NextResponse(null, { status: 404 });
  }

  await del([MODEL_PATH, META_PATH]).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
