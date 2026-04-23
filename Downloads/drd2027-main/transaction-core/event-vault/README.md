# Event Vault

Append-only immutable log of transaction events used for recovery, audit, and replay when Neon is unavailable.

Events are recorded for both success and failed outcomes. No update or delete operations are allowed.

Structure:

```
{
  "eventId": "uuid",
  "version": "1.0",
  "type": "UserToUser | BankodeToUser | UserToBankode | Reward | AssetPurchase",
  "status": "success | failed",
  "from": 100,
  "to": 101,
  "amount": 5,
  "assetId": null,
  "reason": null,
  "timestamp": "ISO-8601",
  "txHash": "sha256"
}
```
