import * as fs from "fs";
import yaml from "js-yaml";
import path from "path";

console.log("Reforging Symlinks");
async function safeSymlink(src, dest) {
  // Ensure parent dir for dest exists
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });

  try {
    const st = await fs.promises.lstat(dest);
    if (st.isSymbolicLink()) {
      const current = await fs.promises.readlink(dest);
      const resolvedCurrent = path.resolve(path.dirname(dest), current);
      const resolvedSrc = path.resolve(src);
      if (resolvedCurrent === resolvedSrc) {
        console.log(`OK: ${dest} -> ${current}`);
        return;
      }
      console.log(`Updating symlink ${dest} (was ${current}) -> ${src}`);
      await fs.promises.unlink(dest);
    } else {
      console.error(`Cannot create symlink: destination exists and is not a symlink: ${dest}`);
      return;
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    // ENOENT means dest doesn't exist — continue to create it
  }

  await fs.promises.symlink(src, dest);
  console.log(`Created symlink: ${dest} -> ${src}`);
}

async function main() {
  if (!fs.existsSync("foundry-config.yaml")) {
    console.log("Foundry config file did not exist.");
    return;
  }

  let fileRoot;
  try {
    const fc = await fs.promises.readFile("foundry-config.yaml", "utf-8");
    const foundryConfig = yaml.load(fc);
    const installPath = foundryConfig && foundryConfig.installPath;
    if (!installPath) {
      console.error("foundry-config.yaml missing 'installPath'");
      return;
    }

    const nestedCandidate = path.join(installPath, "resources", "app");
    const nested = fs.existsSync(nestedCandidate);
    fileRoot = nested ? nestedCandidate : installPath;
    console.log(`Using Foundry root: ${fileRoot}`);
  } catch (err) {
    console.error(`Error reading foundry-config.yaml: ${err}`);
    return;
  }

  try {
    await fs.promises.mkdir("foundry", { recursive: true });
  } catch (e) {
    console.error(`Failed to create 'foundry' directory: ${e}`);
    return;
  }

  // Javascript files
  for (const p of ["client", "common"]) {
    const src = path.join(fileRoot, p);
    const dest = path.join("foundry", p);
    try {
      await safeSymlink(src, dest);
    } catch (e) {
      console.error(`Error linking ${src} -> ${dest}: ${e}`);
    }
  }

  // Language files
  try {
    await safeSymlink(path.join(fileRoot, "public", "lang"), path.join("foundry", "lang"));
  } catch (e) {
    console.error(`Error linking lang files: ${e}`);
  }
}

main();