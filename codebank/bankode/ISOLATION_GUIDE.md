# Bankode System Isolation Guide

## 🔒 Complete Separation from Social/Community Services

This document details the **strict isolation** between the **Bankode Core Banking System** and **Eb3at/Community Social Services** within CodeBank.

---

## 🎯 Isolation Principles

### 1. **Database Isolation**
- **Bankode Tables**: Exclusive to banking operations
- **Community Tables**: Exclusive to social services
- **No Cross-Table References**: Bankode never touches community tables

### 2. **RPC Function Isolation**
- Bankode RPCs only interact with Bankode tables
- Community RPCs only interact with Community tables
- Separate function namespaces

### 3. **Codebase Isolation**
- Bankode code resides exclusively in `/codebank/bankode/`
- Community code resides in `/codebank/eb3at/` and `/codebank/community/`
- No shared dependencies

### 4. **Visual Isolation**
- Bankode UI components are self-contained
- No references to social features in banking interface
- Separate styling and assets

---

## 📊 System Architecture Comparison

### Bankode Core Banking System (Isolated)

```bash
codebank/bankode/
├─ bankode-schema.sql      # Bankode tables ONLY
├─ config.js              # Bankode RPC functions ONLY
├─ rpc.js                 # Calls Bankode RPCs ONLY
├─ dashboard.js           # Bankode logic ONLY
└─ assets/                # Bankode-specific assets ONLY
```

**Bankode Tables:**
- `bankode_wallets` - User banking balances
- `bankode_transactions` - Banking transaction history
- `bankode_auth` - Banking authentication
- `bankode_audit` - Banking audit logs
- `bankode_admin_actions` - Admin banking operations

**Bankode RPC Functions:**
- `bankode_verify_password` → `bankode_auth` only
- `bankode_set_password` → `bankode_auth` only
- `bankode_get_balances` → `bankode_wallets` only
- `bankode_get_transactions` → `bankode_transactions` only
- `bankode_mint_assets` → `bankode_wallets` only
- `bankode_admin_adjust` → `bankode_wallets` only
- `bankode_create_audit` → `bankode_audit` only

### Eb3at/Community Social Services (Separate)

```bash
codebank/eb3at/
├─ supabase-schema.sql    # Community tables ONLY
├─ eb3atAPI.js           # Community logic ONLY
└─ community/            # Social features ONLY
```

**Community Tables:**
- `community_wallets` - Social credits/points
- `community_transfers` - Social transactions
- `community_messages` - Social messaging

**Community RPC Functions:**
- `transfer_asset` → `community_wallets` only
- `get_user_by_email` → `auth.users` only
- `community_*` functions → Community tables only

---

## 🛡️ Security Isolation

### Row-Level Security (RLS) Policies

**Bankode RLS (Exclusive):**
```sql
-- Bankode wallets: Users can only access their own banking data
CREATE POLICY "Users can view their own bankode wallet" ON bankode_wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Bankode transactions: Users can only view their own banking transactions
CREATE POLICY "Users can view their own bankode transactions" ON bankode_transactions
  FOR SELECT USING (auth.uid() = user_id);
```

**Community RLS (Separate):**
```sql
-- Community wallets: Users can only access their own social credits
CREATE POLICY "Users can view their own wallet" ON community_wallets
  FOR SELECT USING (auth.uid() = user_id);
```

### Authentication Isolation

- **Bankode**: Uses `bankode_auth` table with secure password hashing
- **Community**: Uses standard Supabase auth with social credentials
- **Separate Session Management**: No shared authentication state

---

## 🔧 Development Guidelines

### Extending Bankode (Isolated Approach)

```javascript
// ✅ CORRECT: Bankode-only operations
const balances = await BankodeRPC.getBalances(); // Calls bankode_get_balances
const result = await BankodeRPC.mintAssets(userId, 'gold', 100); // Calls bankode_mint_assets

// ❌ INCORRECT: Cross-system contamination
const socialBalance = await CommunityAPI.getCredits(); // WRONG - don't mix systems
```

### Adding New Bankode Features

1. **Create Bankode-specific tables** in `bankode-schema.sql`
2. **Add Bankode-specific RPC functions** with `bankode_*` prefix
3. **Implement Bankode-specific UI** in `/codebank/bankode/`
4. **Use Bankode-specific assets** in `/codebank/bankode/assets/`

### Adding New Community Features

1. **Create Community-specific tables** in `eb3at/supabase-schema.sql`
2. **Add Community-specific RPC functions** with `community_*` prefix
3. **Implement Community-specific UI** in `/codebank/eb3at/`
4. **Use Community-specific assets** in `/codebank/eb3at/assets/`

---

## 🧪 Testing Isolation

### Bankode System Tests

```javascript
// Test Bankode RPC isolation
async function testBankodeIsolation() {
  // 1. Verify Bankode RPCs only touch Bankode tables
  const result = await BankodeRPC.getBalances();
  console.assert(result.success, 'Bankode RPC should work independently');

  // 2. Verify no community table access
  console.assert(!result.data.community_balance, 'Should not access community tables');

  // 3. Verify Bankode audit logs are separate
  await BankodeRPC.createAudit('test_action', 'Isolation test');
  // This should only write to bankode_audit, not community tables
}
```

### Community System Tests

```javascript
// Test Community RPC isolation
async function testCommunityIsolation() {
  // 1. Verify Community RPCs only touch Community tables
  const result = await CommunityAPI.getCredits();
  console.assert(result.success, 'Community RPC should work independently');

  // 2. Verify no Bankode table access
  console.assert(!result.data.bankode_balance, 'Should not access Bankode tables');

  // 3. Verify Community transactions are separate
  await CommunityAPI.transferCredits('user1', 'user2', 100);
  // This should only write to community_transfers, not Bankode tables
}
```

---

## 📋 Isolation Checklist

### Bankode System
- [x] Exclusive table definitions (`bankode_*` tables)
- [x] Isolated RPC functions (`bankode_*` prefix)
- [x] Separate RLS policies (Bankode tables only)
- [x] Dedicated codebase directory
- [x] Independent authentication system
- [x] Self-contained UI components
- [x] Isolated asset management

### Community System
- [x] Exclusive table definitions (`community_*` tables)
- [x] Isolated RPC functions (`community_*` prefix)
- [x] Separate RLS policies (Community tables only)
- [x] Dedicated codebase directory
- [x] Independent social features
- [x] Self-contained UI components

---

## 🚀 Deployment Strategy

### Bankode Deployment
```bash
# Deploy Bankode schema (isolated)
psql -f codebank/bankode/bankode-schema.sql

# Deploy Bankode RPC functions (isolated)
# Functions are already defined in bankode-schema.sql

# Test Bankode isolation
npm test bankode-isolation
```

### Community Deployment
```bash
# Deploy Community schema (separate)
psql -f codebank/eb3at/supabase-schema.sql

# Deploy Community RPC functions (separate)
# Functions are already defined in eb3at/supabase-schema.sql

# Test Community isolation
npm test community-isolation
```

---

## ⚠️ Critical Isolation Rules

1. **Never** reference `community_wallets` in Bankode code
2. **Never** reference `bankode_wallets` in Community code
3. **Never** share RPC function names between systems
4. **Never** mix authentication systems
5. **Never** share UI components between banking and social features
6. **Always** use system-specific prefixes (`bankode_*` vs `community_*`)

---

## 🔍 Troubleshooting Isolation Issues

### Symptom: Bankode RPC affecting Community tables
**Cause**: Incorrect RPC function implementation
**Solution**: Verify RPC function only uses `bankode_*` tables

### Symptom: Community features appearing in Bankode UI
**Cause**: Cross-system component import
**Solution**: Remove Community imports from Bankode code

### Symptom: Shared authentication issues
**Cause**: Mixed auth systems
**Solution**: Use separate auth flows for each system

---

## 📚 Reference Architecture

```
CodeBank System Architecture
├── Bankode Core Banking (Isolated)
│   ├── bankode_wallets (Banking balances)
│   ├── bankode_transactions (Banking history)
│   ├── bankode_auth (Banking security)
│   └── bankode_* RPC functions
│
└── Eb3at/Community Social (Separate)
    ├── community_wallets (Social credits)
    ├── community_transfers (Social transactions)
    └── community_* RPC functions
```

**The Bankode system is now completely isolated and ready for standalone operation!** 🚀