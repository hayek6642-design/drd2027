import fs from "fs"
import path from "path"
import os from "os"
import { VaultConfig } from "./VaultConfig.js"

export function appendToVault(serializedEvent) {
  if (!VaultConfig.enabled) return
  const baseDir = process.env.VAULT_LOG_DIR || (path.isAbsolute(VaultConfig.path) ? VaultConfig.path : path.join(os.tmpdir(), "yt-clear", "vault"))
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }
  const fileName = `${VaultConfig.filePrefix}-${new Date().toISOString().slice(0, 10)}.log`
  const filePath = path.join(baseDir, fileName)
  fs.appendFileSync(filePath, serializedEvent + "\n")
}
