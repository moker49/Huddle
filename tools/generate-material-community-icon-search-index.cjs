const fs = require("fs");
const https = require("https");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const glyphMapPath = path.join(
  projectRoot,
  "node_modules",
  "@expo",
  "vector-icons",
  "build",
  "vendor",
  "react-native-vector-icons",
  "glyphmaps",
  "MaterialCommunityIcons.json"
);
const outputPath = path.join(
  projectRoot,
  "src",
  "features",
  "topics",
  "data",
  "materialCommunityIconSearchTerms.ts"
);
const metadataUrl = "https://raw.githubusercontent.com/Templarian/MaterialDesign-SVG/master/meta.json";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const { statusCode, headers } = response;

      if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
        response.resume();
        resolve(fetchText(new URL(headers.location, url).toString()));
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Metadata request failed with status ${statusCode}.`));
        return;
      }

      response.setEncoding("utf8");
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

function escapeNonAscii(value) {
  return value.replace(/[\u0080-\uFFFF]/g, (character) => (
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  ));
}

async function generate() {
  const glyphMap = JSON.parse(fs.readFileSync(glyphMapPath, "utf8"));
  const metadata = JSON.parse(await fetchText(metadataUrl));
  const searchTermsByIcon = {};

  for (const icon of metadata) {
    if (!(icon.name in glyphMap)) {
      continue;
    }

    const terms = [...(icon.aliases ?? []), ...(icon.tags ?? [])]
      .map((term) => term.toLocaleLowerCase())
      .filter((term, index, allTerms) => allTerms.indexOf(term) === index);

    if (terms.length > 0) {
      searchTermsByIcon[icon.name] = terms;
    }
  }

  const source = [
    "// Generated from Material Design Icons metadata. Do not edit by hand.",
    "// Regenerate with: npm run generate:mdi-search-index",
    "",
    "export const materialCommunityIconSearchTerms: Readonly<Record<string, readonly string[]>> = ",
    `${escapeNonAscii(JSON.stringify(searchTermsByIcon, null, 2))} as const;`,
    ""
  ].join("\n");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, source);
  console.log(`Generated ${Object.keys(searchTermsByIcon).length} Material Community icon search entries.`);
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
