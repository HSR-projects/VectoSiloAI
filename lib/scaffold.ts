/**
 * Template Scaffold Engine
 * Converts a template ID (+ custom props) into a standalone Vite + React project
 * with all dependencies configured. The output is a list of {path, content} files
 * ready to write to the computer sandbox filesystem.
 */

import registry from "@/templates/registry/registry.json";
import fs from "fs";
import path from "path";

export interface ScaffoldFile {
  path: string;
  content: string;
}

export interface ScaffoldOptions {
  id: string;
  title?: string;
  port?: number;
  props?: Record<string, any>;
}

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

/**
 * Read and cache template source files.
 */
const sourceCache = new Map<string, string>();

function readSource(filePath: string): string {
  const normal = path.normalize(filePath);
  if (sourceCache.has(normal)) return sourceCache.get(normal)!;
  if (!fs.existsSync(normal)) return "";
  const content = fs.readFileSync(normal, "utf-8");
  sourceCache.set(normal, content);
  return content;
}

/**
 * Resolve a template file path from its registry entry.
 */
function resolveTemplateFile(file: string): string {
  const full = path.join(TEMPLATES_DIR, `${file}.tsx`);
  if (fs.existsSync(full)) return full;
  const alt = path.join(TEMPLATES_DIR, file);
  if (fs.existsSync(alt)) return alt;
  return full;
}

/**
 * Resolve a relative import like "../components/Navbar" or "./utils"
 * against the importing file's path.
 */
function resolveRelativeImport(relativePath: string, currentFile: string): string | null {
  const dir = path.dirname(currentFile);
  const candidate = path.resolve(dir, relativePath);
  const extensions = [".tsx", ".ts", "/index.tsx", "/index.ts"];
  for (const ext of extensions) {
    const withExt = candidate.endsWith(ext) ? candidate : candidate + ext;
    if (fs.existsSync(withExt)) return path.normalize(withExt);
  }
  return null;
}

/**
 * Resolve a @/templates/... import to its actual file path.
 */
function resolveAliasImport(importPath: string): string | null {
  const relative = importPath.replace("@/templates/", "");
  const candidates = [
    path.join(TEMPLATES_DIR, `${relative}.tsx`),
    path.join(TEMPLATES_DIR, `${relative}.ts`),
    path.join(TEMPLATES_DIR, relative, "index.tsx"),
    path.join(TEMPLATES_DIR, relative, "index.ts"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return path.normalize(c);
  }
  return null;
}

/**
 * Check if a string is an npm package import (not relative, not alias).
 */
const NPM_IMPORT_RE = /^[a-z@][a-z0-9_@\/\-]*$/i;

function isNpmImport(imp: string): boolean {
  return !imp.startsWith(".") && !imp.startsWith("@/") && NPM_IMPORT_RE.test(imp);
}

/**
 * Recursively inline all template imports into a single source file.
 * Handles:
 * - @/templates/components/X, @/templates/pages/X
 * - @/templates/utils/animations, @/templates/utils/types
 * - @/templates/hooks/X
 * - @/lib/utils (cn)
 * - Relative imports (../components/X, ./utils)
 */
function inlineImports(
  source: string,
  currentFile: string,
  inlined: Set<string>,
  depth = 0
): string {
  if (depth > 10) return source; // prevent circular deps

  let result = source;

  // Track which imports we've processed to avoid duplicates
  const processed = new Set<string>();

  // Pattern: import { X } from "path" or import X from "path"
  const IMPORT_RE = /import\s+(?:(?:\{[^}]*\}|\w+(?:\s*,\s*\{[^}]*\})?))\s*from\s*["']([^"']+)["']\s*;?\n?/g;

  result = result.replace(IMPORT_RE, (match, importPath: string) => {
    // Skip NPM packages
    if (isNpmImport(importPath)) return match;

    const key = `${currentFile}::${importPath}`;
    if (processed.has(key)) return match;
    processed.add(key);

    // Handle @/lib/utils → rewrite to ./utils
    if (importPath === "@/lib/utils") {
      return `import { cn } from "./utils";\n`;
    }

    // Handle @/templates/utils/animations → rewrite to inline const
    if (importPath.startsWith("@/templates/utils/animations")) {
      return `// Animation variants (inlined)\n`;
    }

    // Handle @/templates/utils/types → remove (types not needed at runtime)
    if (importPath.startsWith("@/templates/utils/types")) {
      return `// Types (stripped for standalone)\n`;
    }

    // Handle @/templates/hooks/X
    if (importPath.startsWith("@/templates/hooks/")) {
      const resolved = resolveAliasImport(importPath);
      if (resolved && !inlined.has(resolved)) {
        inlined.add(resolved);
        const hookSource = readSource(resolved);
        const inlinedHook = inlineImports(hookSource, resolved, inlined, depth + 1)
          .replace(/^"use client";\s*\n/gm, "")
          .replace(/^export\s+/gm, "// ");
        return `${inlinedHook}\n`;
      }
      return `// Hook import: ${importPath}\n`;
    }

    // Handle @/templates/components/X and @/templates/pages/X
    if (importPath.startsWith("@/templates/")) {
      const resolved = resolveAliasImport(importPath);
      if (resolved && !inlined.has(resolved)) {
        inlined.add(resolved);
        const compSource = readSource(resolved);
        const inlinedComp = inlineImports(compSource, resolved, inlined, depth + 1)
          .replace(/^"use client";\s*\n/gm, "");
        return `${inlinedComp}\n`;
      }
      return `// Unresolved: ${importPath}\n`;
    }

    // Handle relative imports (../ or ./)
    if (importPath.startsWith(".")) {
      const resolved = resolveRelativeImport(importPath, currentFile);
      if (resolved && !inlined.has(resolved)) {
        inlined.add(resolved);
        const compSource = readSource(resolved);
        if (compSource) {
          const inlinedComp = inlineImports(compSource, resolved, inlined, depth + 1)
            .replace(/^"use client";\s*\n/gm, "");
          return `${inlinedComp}\n`;
        }
      }
      return `// Already inlined: ${importPath}\n`;
    }

    return match;
  });

  // Remove @ts-nocheck
  result = result.replace(/\/\/\s*@ts-nocheck\s*\n/g, "");

  // Remove Template ID comments
  result = result.replace(/\/\/\s*Template\s*ID:\s*[^\n]*\n/g, "");

  // Remove "use client" directives (we're server-rendering the scaffold)
  result = result.replace(/^"use client";\s*\n/gm, "");

  return result;
}

/**
 * Generate package.json for a standalone project.
 */
function genPackageJson(title: string): string {
  return JSON.stringify(
    {
      name: title.toLowerCase().replace(/\s+/g, "-"),
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "framer-motion": "^11.3.0",
        "lucide-react": "^0.408.0",
        clsx: "^2.1.1",
        "tailwind-merge": "^2.4.0",
      },
      devDependencies: {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^4.3.1",
        autoprefixer: "^10.4.19",
        postcss: "^8.4.38",
        "postcss-load-config": "^5.1.0",
        tailwindcss: "^3.4.6",
        typescript: "^5.5.3",
        vite: "^5.3.4",
      },
    },
    null,
    2
  );
}

function genViteConfig(): string {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
  },
});
`;
}

function genTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        incogni: {
          bg: "#212121",
          surface: "#2f2f2f",
          "surface-2": "#343541",
          border: "#424242",
          accent: "#10a37f",
          "accent-soft": "#1a7f64",
          "accent-dim": "#0d8c6d",
          text: "#ececec",
          muted: "#8e8e93",
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(16,163,127,0.4), 0 0 24px -4px rgba(16,163,127,0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
`;
}

function genPostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function genTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
      include: ["src"],
    },
    null,
    2
  );
}

function genIndexHtml(title: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body class="bg-incogni-bg text-incogni-text antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function genMainTsx(): string {
  return `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;
}

function genIndexCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    color-scheme: dark;
  }
  body {
    font-family: system-ui, sans-serif;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb {
    border-radius: 9999px;
    background: #424242;
  }
  ::-webkit-scrollbar-track { background: transparent; }
}
`;
}

function genUtilsTs(): string {
  return `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

/**
 * Main scaffold function. Takes a template ID + options, returns
 * a complete standalone project as an array of {path, content} files.
 */
export function scaffoldTemplate(opts: ScaffoldOptions): ScaffoldFile[] {
  const { id, title = "My App", port = 5173, props = {} } = opts;

  const templates = (registry.templates as Record<string, any>);
  const entry = templates[id];
  if (!entry) {
    throw new Error(`Template "${id}" not found in registry`);
  }

  const filePath = resolveTemplateFile(entry.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filePath}`);
  }

  const rawSource = readSource(filePath);

  // Inline all imports recursively
  const inlined = new Set<string>();
  let appSource = inlineImports(rawSource, filePath, inlined);

  // Prevent duplicate default export in App.tsx by stripping "default" from the template's root export
  appSource = appSource.replace(/^\s*export\s+default\s+/gm, "export ");

  // Determine component name and export style
  const hasDefaultExport = /export\s+default\s+(function|\w+)/.test(rawSource);
  const compName = path.basename(filePath, path.extname(filePath));

  // Generate App.tsx that renders the template
  const appTsx = `import { cn } from "./utils";

${appSource}

export default function App() {
  return (
    <div className="min-h-screen bg-incogni-bg text-incogni-text">
      ${hasDefaultExport
        ? `<${compName} />`
        : `{${compName} ? <${compName} /> : <div>Template "${id}"</div>}`
      }
    </div>
  );
}
`;

  const files: ScaffoldFile[] = [
    { path: "package.json", content: genPackageJson(title) },
    { path: "vite.config.ts", content: genViteConfig() },
    { path: "tailwind.config.js", content: genTailwindConfig() },
    { path: "postcss.config.js", content: genPostcssConfig() },
    { path: "tsconfig.json", content: genTsconfigJson() },
    { path: "index.html", content: genIndexHtml(title) },
    { path: "src/main.tsx", content: genMainTsx() },
    { path: "src/index.css", content: genIndexCss() },
    { path: "src/App.tsx", content: appTsx },
    { path: "src/utils.ts", content: genUtilsTs() },
  ];

  files.push({
    path: "README.md",
    content: `# ${title}\n\nScaffolded from \`${id}\` via IncogniAI.\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
  });

  return files;
}
