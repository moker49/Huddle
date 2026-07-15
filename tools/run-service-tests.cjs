const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const workspaceRoot = path.resolve(__dirname, "..");
const tests = [];

global.test = function test(name, run) {
  tests.push({ name, run });
};

global.beforeEach = function beforeEach() {
  throw new Error("beforeEach is not supported by this lightweight runner.");
};

const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(workspaceRoot, "src", request.slice(2)),
      parent,
      isMain,
      options
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function load(request, parent, isMain) {
  if (request === "expo-file-system/legacy") {
    return {
      documentDirectory: "",
      deleteAsync: async () => undefined,
      getInfoAsync: async () => ({ exists: false }),
      makeDirectoryAsync: async () => undefined,
      readAsStringAsync: async () => "",
      writeAsStringAsync: async () => undefined
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  });

  module._compile(output.outputText, filename);
};

function findTests(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return findTests(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".test.ts") ? [entryPath] : [];
  });
}

async function run() {
  findTests(path.join(workspaceRoot, "src"))
    .sort()
    .forEach((testFile) => require(testFile));

  let failures = 0;

  for (const { name, run: runTest } of tests) {
    try {
      await runTest();
      console.log(`ok - ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok - ${name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`\n${tests.length} service tests passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
