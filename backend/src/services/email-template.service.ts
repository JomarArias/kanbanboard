import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR_CANDIDATES = [
  // Dev with ts-node: backend/src/services -> backend/src/templates/emails
  path.resolve(__dirname, "../templates/emails"),
  // Build fallback when templates are not copied to build
  path.resolve(process.cwd(), "src/templates/emails"),
];

type TemplateData = Record<string, unknown>;

const templateCache = new Map<string, Handlebars.TemplateDelegate<TemplateData>>();

const loadTemplate = async (templateName: string) => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const filename = `${templateName}.hbs`;
  let rawTemplate: string | null = null;
  let resolvedPath: string | null = null;

  for (const baseDir of TEMPLATE_DIR_CANDIDATES) {
    const candidatePath = path.resolve(baseDir, filename);
    try {
      rawTemplate = await readFile(candidatePath, "utf-8");
      resolvedPath = candidatePath;
      break;
    } catch {
      // Continue trying candidates until one exists.
    }
  }

  if (!rawTemplate || !resolvedPath) {
    throw new Error(`Email template not found: ${filename}`);
  }

  const compiled = Handlebars.compile<TemplateData>(rawTemplate);
  templateCache.set(templateName, compiled);
  return compiled;
};

export const renderEmailTemplate = async (templateName: string, variables: TemplateData): Promise<string> => {
  const template = await loadTemplate(templateName);
  return template(variables);
};
