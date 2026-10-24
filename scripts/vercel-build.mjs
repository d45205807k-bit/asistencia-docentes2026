import { execFileSync } from "node:child_process";

function runNpm(args) {
  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm.cmd ${args.join(" ")}`], { stdio: "inherit" });
    return;
  }
  execFileSync("npm", args, { stdio: "inherit" });
}

if (process.env.VERCEL_ENV === "production") {
  console.log("Aplicando migraciones PostgreSQL de producción...");
  runNpm(["run", "db:deploy"]);
}

runNpm(["run", "build"]);
