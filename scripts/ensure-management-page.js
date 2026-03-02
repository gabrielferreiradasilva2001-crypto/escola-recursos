import fs from "fs";
import path from "path";

const root = process.cwd();
const dir = path.join(root, "app", "management");
const pageFile = path.join(dir, "page.tsx");

try {
  fs.mkdirSync(dir, { recursive: true });
  const content = "import ManagementTabs from \"./ManagementTabs\";\n\nexport default function ManagementHome() {\n  return <ManagementTabs />;\n}\n";
  fs.writeFileSync(pageFile, content, "utf8");
} catch (err) {
  console.error("ensure-management-page failed", err);
  process.exitCode = 1;
}
