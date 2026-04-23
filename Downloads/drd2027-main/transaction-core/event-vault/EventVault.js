import { serializeEvent } from "./VaultSerializer.js"
import { appendToVault } from "./VaultWriter.js"

export class EventVault {
  static record(event) {
    const serialized = serializeEvent(event)
    appendToVault(serialized)
  }
}
