import { z } from "zod";

export const EXPORT_FORMAT = "master-ai-studio-export";
export const EXPORT_VERSION = 1;

const recordArray = z.array(z.object({ id: z.string() }).passthrough());

export const exportBundleSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string(),
  data: z.object({
    projects: recordArray.default([]),
    scripts: recordArray.default([]),
    characters: recordArray.default([]),
    animations: recordArray.default([]),
    edits: recordArray.default([]),
    thumbnails: recordArray.default([]),
    chat: recordArray.default([]),
  }),
});

export type ExportBundle = z.infer<typeof exportBundleSchema>;
export type ExportData = ExportBundle["data"];

export function buildExportBundle(data: ExportData, at: string): ExportBundle {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: at, data };
}

export type ImportResult = { ok: true; bundle: ExportBundle } | { ok: false; error: string };

export function parseImportBundle(raw: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "ফাইলটি বৈধ JSON নয়।" };
  }
  const parsed = exportBundleSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: "এটি Master AI Studio-র এক্সপোর্ট ফাইল নয় বা ফাইলটি ক্ষতিগ্রস্ত।" };
  }
  return { ok: true, bundle: parsed.data };
}
