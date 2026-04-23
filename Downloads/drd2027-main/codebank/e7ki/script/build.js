"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const esbuild_1 = require("esbuild");
const vite_1 = require("vite");
const promises_1 = require("fs/promises");
// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
    "@google/generative-ai",
    "axios",
    "connect-pg-simple",
    "cors",
    "date-fns",
    "drizzle-orm",
    "drizzle-zod",
    "express",
    "express-rate-limit",
    "express-session",
    "jsonwebtoken",
    "memorystore",
    "multer",
    "nanoid",
    "nodemailer",
    "openai",
    "passport",
    "passport-local",
    "pg",
    "stripe",
    "uuid",
    "ws",
    "xlsx",
    "zod",
    "zod-validation-error",
];
function buildAll() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.rm)("dist", { recursive: true, force: true });
        console.log("building client...");
        yield (0, vite_1.build)();
        console.log("building server...");
        const pkg = JSON.parse(yield (0, promises_1.readFile)("package.json", "utf-8"));
        const allDeps = [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.devDependencies || {}),
        ];
        const externals = allDeps.filter((dep) => !allowlist.includes(dep));
        yield (0, esbuild_1.build)({
            entryPoints: ["server/index.ts"],
            platform: "node",
            bundle: true,
            format: "cjs",
            outfile: "dist/index.cjs",
            define: {
                "process.env.NODE_ENV": '"production"',
            },
            minify: true,
            external: externals,
            logLevel: "info",
        });
    });
}
buildAll().catch((err) => {
    console.error(err);
    process.exit(1);
});
