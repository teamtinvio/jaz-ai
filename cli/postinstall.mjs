// Branded welcome on install (TTY only)
if (process.stdout.isTTY) {
  const v = process.env.npm_package_version || "";
  console.log("");
  console.log("  [32m✓[0m [1mClio[0m" + (v ? " v" + v : "") + " installed");
  console.log("  [2mGet started:[0m clio --help");
  console.log("");
}
