-- ============================================================
-- DRD2027 — FULL DATABASE BACKUP
-- Project : DRD2027 (Codebank App)
-- Source  : Turso (libsql) — ytclear-prod-drd2026.aws-eu-west-1.turso.io
-- Created : 2026-04-06 08:56:28 UTC
-- ============================================================
-- PORTABLE FORMAT: SQLite 3 compatible (default target)
-- Migration notes at bottom of file
-- ============================================================

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- ────────────────────────────────────────────────────────────
-- TABLE: active_device_sessions  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "active_device_sessions";
CREATE TABLE active_device_sessions (
      user_id TEXT PRIMARY KEY,
      session_token TEXT NOT NULL,
      device_label TEXT,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "active_device_sessions" ("user_id", "session_token", "device_label", "connected_at", "last_seen_at") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', 'cf31bacb-7d20-4094-b696-144d139eb731', 'Mac (Chrome)', '2026-04-05 14:34:36', '2026-04-05 18:12:42');

-- ────────────────────────────────────────────────────────────
-- TABLE: admin_otp_attempts  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "admin_otp_attempts";
CREATE TABLE admin_otp_attempts (
      ip_address TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
      blocked_until DATETIME
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: admin_otps  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "admin_otps";
CREATE TABLE admin_otps (
      otp_id TEXT PRIMARY KEY,
      otp_code TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      used BOOLEAN DEFAULT 0,
      ip_address TEXT,
      user_agent TEXT,
      admin_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: admin_vault  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "admin_vault";
CREATE TABLE admin_vault (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL UNIQUE,
      allowance BIGINT NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: admin_vault_cycles  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "admin_vault_cycles";
CREATE TABLE admin_vault_cycles (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      cycle_month TEXT NOT NULL,
      amount BIGINT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (admin_id, cycle_month)
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: applied_events  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "applied_events";
CREATE TABLE applied_events (
       event_id INTEGER PRIMARY KEY,
       applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );


-- ────────────────────────────────────────────────────────────
-- TABLE: asset_balances  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "asset_balances";
CREATE TABLE asset_balances (
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       asset_type TEXT NOT NULL,
       balance INTEGER DEFAULT 0 CHECK (balance >= 0),
       last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (user_id, asset_type)
     );


-- ────────────────────────────────────────────────────────────
-- TABLE: asset_transactions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "asset_transactions";
CREATE TABLE asset_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        service TEXT,
        description TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: audit_log  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "audit_log";
CREATE TABLE audit_log (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       type TEXT NOT NULL,
       payload TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );

INSERT OR IGNORE INTO "audit_log" ("id", "type", "payload", "created_at") VALUES (1, 'QARSAN_STEAL', '{"actorId": "3b492980-54ed-46a3-9704-c6896deabdd0", "targetId": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "stolen": {"codes": 10, "silver": 3, "gold": 1}, "totalStolenValue": 14}', '2026-04-05 20:15:53');

-- ────────────────────────────────────────────────────────────
-- TABLE: audit_logs  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "audit_logs";
CREATE TABLE audit_logs (
       id TEXT PRIMARY KEY,
       actor_user_id TEXT,
       actor_role TEXT,
       action TEXT NOT NULL,
       type TEXT,
       payload TEXT,
       target_type TEXT,
       target_id TEXT,
       metadata TEXT,
       ip_address TEXT,
       user_agent TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );


-- ────────────────────────────────────────────────────────────
-- TABLE: auth_sessions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "auth_sessions";
CREATE TABLE auth_sessions (
       session_id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       token_hash TEXT NOT NULL,
       expires_at DATETIME NOT NULL,
       revoked BOOLEAN DEFAULT 0,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     , token TEXT);

CREATE UNIQUE INDEX auth_sessions_token_idx ON auth_sessions(token);


-- ────────────────────────────────────────────────────────────
-- TABLE: automode_sessions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "automode_sessions";
CREATE TABLE automode_sessions (
      id             TEXT    PRIMARY KEY,
      user_id        TEXT    NOT NULL,
      started_at     INTEGER NOT NULL,
      last_heartbeat INTEGER,
      duration_ms    INTEGER NOT NULL DEFAULT 0,
      rewarded       INTEGER NOT NULL DEFAULT 0,
      cancelled      INTEGER NOT NULL DEFAULT 0,
      completed_at   INTEGER
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: balance_projection  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "balance_projection";
CREATE TABLE balance_projection (
       user_id TEXT,
       asset_type TEXT,
       amount INTEGER DEFAULT 0,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (user_id, asset_type)
     );

INSERT OR IGNORE INTO "balance_projection" ("user_id", "asset_type", "amount", "updated_at") VALUES ('system_user', 'code_points', 55, '2026-03-31 13:05:38');

-- ────────────────────────────────────────────────────────────
-- TABLE: balances  (14 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "balances";
CREATE TABLE balances (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      codes_count INT DEFAULT 0,
      silver_count INT DEFAULT 0,
      gold_count INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('48fe846d-7204-4f7b-b4b7-a378470902d6', 0, 0, 0, '2026-03-30 21:16:21');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('857a610a-3707-4410-a538-e657f8b117df', 0, 0, 0, '2026-03-30 21:19:26');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('f36573b7-befa-4fde-8168-1455921ddb10', 0, 0, 0, '2026-03-30 21:20:27');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('fb763bec-7330-40f9-aa2e-ffe0a328169d', 0, 0, 0, '2026-03-30 21:29:30');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('55dc9e00-d14a-4c5d-8996-5561059c7b81', 0, 0, 0, '2026-03-30 22:12:16');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('65079e2e-6145-472f-b0b7-eeab9f99f9d3', 0, 0, 0, '2026-03-30 22:16:02');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', 0, 2, 0, '2026-04-04 13:55:55');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('67b9100c-fe51-44e3-a291-a7686228953c', 0, 0, 0, '2026-04-03 12:40:40');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('685e87dd-3217-4a59-95e7-3f9cc8626009', 0, 0, 0, '2026-04-03 15:34:23');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('16292c0f-968e-437e-8505-4833a3b3c078', 0, 0, 0, '2026-04-04 04:54:40');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('3d8ee4be-e4c6-4436-8ad0-486f1f332661', 0, 0, 0, '2026-04-04 05:01:53');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('c9d56f8c-ed76-4991-8ef0-02acbfc5ee56', 0, 0, 0, '2026-04-04 05:29:02');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('f59de3db-6f56-4e8a-8a58-8f964f095823', 0, 0, 0, '2026-04-04 14:03:04');
INSERT OR IGNORE INTO "balances" ("user_id", "codes_count", "silver_count", "gold_count", "updated_at") VALUES ('93c35895-bc77-4f52-ae95-6f6d69cd797d', 0, 0, 0, '2026-04-06 08:10:31');

-- ────────────────────────────────────────────────────────────
-- TABLE: bankode_codes  (84 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "bankode_codes";
CREATE TABLE bankode_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        code_type TEXT DEFAULT 'standard',
        value INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        generated_by TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        redeemed_by TEXT,
        redeemed_at DATETIME,
        expires_at DATETIME
      );

INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (1, 'RPYG-V5YX-V92W', 'standard', 100, 'active', 'system', '2026-03-30 21:08:56', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (2, 'JZGW-YJMT-5AN3', 'standard', 100, 'active', 'system', '2026-03-30 21:13:56', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (3, 'KVWN-2P8Q-C536', 'standard', 100, 'active', 'system', '2026-03-30 21:20:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (4, 'QZ3W-9753-3LQJ', 'uncommon', 5000, 'active', 'system', '2026-03-30 21:25:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (5, '98KS-B9EN-UU9M', 'uncommon', 100, 'active', 'system', '2026-03-30 21:30:44', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (6, 'B78L-PH3L-6UNF', 'standard', 100, 'active', 'system', '2026-03-30 21:35:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (7, 'G66X-JRFZ-FHD2', 'standard', 2000, 'active', 'system', '2026-03-30 21:40:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (8, 'BDFW-H99V-FUX8', 'standard', 2000, 'active', 'system', '2026-03-30 21:45:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (9, 'LUPM-YZSE-X4FS', 'standard', 100, 'active', 'system', '2026-03-30 21:50:44', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (10, 'EPAA-VCDX-FYUA', 'standard', 100, 'active', 'system', '2026-03-30 21:55:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (11, 'P7CV-R523-J9EE', 'standard', 1000, 'active', 'system', '2026-03-30 22:00:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (12, 'EFZK-M334-4GC5', 'standard', 100, 'active', 'system', '2026-03-30 22:05:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (13, '7CBV-U25J-6UUK', 'uncommon', 100, 'active', 'system', '2026-03-30 22:10:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (14, '2XW8-EKKP-EAWP', 'uncommon', 100, 'active', 'system', '2026-03-30 22:15:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (15, '2WUT-2C2F-5YC9', 'standard', 100, 'active', 'system', '2026-03-30 22:20:48', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (16, 'ZBJQ-JSX5-GB9L', 'standard', 100, 'active', 'system', '2026-03-30 22:25:45', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (17, '8UL9-MQTS-UTFK', 'standard', 1000, 'active', 'system', '2026-03-30 22:32:48', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (18, 'Y88K-6WD7-MQU5', 'uncommon', 100, 'active', 'system', '2026-03-30 22:37:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (19, '38S8-PXXW-DPK8', 'standard', 100, 'active', 'system', '2026-03-30 22:42:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (20, 'KU72-PHMP-ZWBF', 'uncommon', 2000, 'active', 'system', '2026-03-30 22:47:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (21, '5XDL-BWFH-VREE', 'standard', 100, 'active', 'system', '2026-03-30 22:52:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (22, 'H6P2-W5HJ-FPRX', 'rare', 100, 'active', 'system', '2026-03-30 22:57:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (23, '5QUP-5FFR-9ZXV', 'standard', 1000, 'active', 'system', '2026-03-30 23:02:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (24, 'ZRLR-A6TV-Y7JQ', 'standard', 100, 'active', 'system', '2026-03-30 23:07:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (25, 'SERZ-VWQ6-GBV4', 'standard', 100, 'active', 'system', '2026-03-30 23:12:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (26, 'ZHF7-V5F7-QT3B', 'standard', 1000, 'active', 'system', '2026-03-30 23:17:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (27, 'LKLU-FCJY-RJN9', 'uncommon', 100, 'active', 'system', '2026-03-30 23:22:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (28, '43GY-GRTY-NLDS', 'standard', 100, 'active', 'system', '2026-03-30 23:27:41', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (29, '5AVX-QFRV-V3JE', 'standard', 100, 'active', 'system', '2026-03-30 23:32:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (30, 'CZD3-G78M-3BPZ', 'standard', 100, 'active', 'system', '2026-03-30 23:37:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (31, 'XY33-BPWT-DBUL', 'standard', 1000, 'active', 'system', '2026-03-30 23:42:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (32, 'GTB5-L4AM-4MK9', 'uncommon', 100, 'active', 'system', '2026-03-30 23:47:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (33, 'RSDU-TLPB-TQQL', 'standard', 10000, 'active', 'system', '2026-03-30 23:52:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (34, '5LMK-43PB-52NN', 'rare', 100, 'active', 'system', '2026-03-30 23:57:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (35, 'PFL2-AADL-WVPU', 'standard', 100, 'active', 'system', '2026-03-31 00:02:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (36, 'VK52-Z534-7TCR', 'rare', 100, 'active', 'system', '2026-03-31 00:07:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (37, 'F36S-QGHT-FC8D', 'rare', 2000, 'active', 'system', '2026-03-31 00:12:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (38, 'UKZB-CZBU-SYNG', 'standard', 100, 'active', 'system', '2026-03-31 00:17:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (39, 'RYL5-A8YX-MBKT', 'standard', 2000, 'active', 'system', '2026-03-31 00:22:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (40, 'N9S5-QTWU-5DPT', 'standard', 2000, 'active', 'system', '2026-03-31 00:27:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (41, 'CSJ5-ERUZ-LGVY', 'standard', 100, 'active', 'system', '2026-03-31 00:32:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (42, 'FGBD-H889-8BHE', 'standard', 1000, 'active', 'system', '2026-03-31 00:37:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (43, 'Q7M2-NYHA-AGJ2', 'legendary', 5000, 'active', 'system', '2026-03-31 00:42:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (44, 'X36Q-EPJA-VXFP', 'standard', 100, 'active', 'system', '2026-03-31 00:47:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (45, 'RAQM-4X6W-WDEN', 'standard', 100, 'active', 'system', '2026-03-31 00:52:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (46, 'QPBY-EVBM-9XZW', 'standard', 100, 'active', 'system', '2026-03-31 00:57:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (47, 'NM86-JVM9-U77J', 'standard', 100, 'active', 'system', '2026-03-31 01:02:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (48, 'H5SB-L5BB-8VF6', 'standard', 100, 'active', 'system', '2026-03-31 01:07:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (49, 'CPNE-V2U5-46XU', 'uncommon', 100, 'active', 'system', '2026-03-31 01:12:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (50, '2QMR-MMMZ-2E42', 'standard', 1000, 'active', 'system', '2026-03-31 01:17:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (51, 'XYC8-KZKN-LVYD', 'epic', 5000, 'active', 'system', '2026-03-31 01:22:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (52, 'KRCW-MZ5G-K5N3', 'standard', 1000, 'active', 'system', '2026-03-31 01:27:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (53, 'HJWC-Y2L2-TG5F', 'standard', 100, 'active', 'system', '2026-03-31 01:32:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (54, 'MTKT-8L8Y-N9TG', 'standard', 100, 'active', 'system', '2026-03-31 01:37:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (55, '36YR-GLJZ-Z5AT', 'legendary', 100, 'active', 'system', '2026-03-31 01:42:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (56, 'QM7G-WG3W-82K2', 'standard', 100, 'active', 'system', '2026-03-31 01:47:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (57, 'JG3E-CLFC-AMHS', 'standard', 100, 'active', 'system', '2026-03-31 01:52:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (58, 'WTFF-R2LY-NBZN', 'rare', 100, 'active', 'system', '2026-03-31 01:57:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (59, 'JCAU-FW5M-XTUC', 'standard', 100, 'active', 'system', '2026-03-31 02:02:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (60, 'HYTM-3CDN-LKXW', 'standard', 100, 'active', 'system', '2026-03-31 02:07:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (61, 'W8ES-7B9Q-JL6G', 'standard', 100, 'active', 'system', '2026-03-31 02:12:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (62, 'EUU8-XYFE-HW4D', 'standard', 100, 'active', 'system', '2026-03-31 02:17:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (63, 'FM8D-VLXL-QSJY', 'standard', 100, 'active', 'system', '2026-03-31 02:22:43', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (64, '45MA-YB9U-B9JA', 'epic', 1000, 'active', 'system', '2026-03-31 02:27:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (65, 'T6EU-8X8C-5MFY', 'standard', 2000, 'active', 'system', '2026-03-31 02:32:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (66, 'EUFQ-R46C-2XVN', 'epic', 1000, 'active', 'system', '2026-03-31 02:37:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (67, 'XPBK-3QGU-CUKK', 'standard', 100, 'active', 'system', '2026-03-31 02:42:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (68, 'MLPU-6YKJ-RECZ', 'standard', 1000, 'active', 'system', '2026-03-31 02:47:42', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (69, 'MTEH-Z3LN-SPWJ', 'standard', 100, 'active', 'system', '2026-03-31 03:25:02', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (70, '7VA7-ZSG2-N5ZP', 'standard', 100, 'active', 'system', '2026-03-31 03:30:02', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (71, 'SQ5C-NC3M-NXTE', 'standard', 2000, 'active', 'system', '2026-03-31 03:35:02', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (72, 'JUCC-ZVUK-C926', 'standard', 100, 'active', 'system', '2026-03-31 03:40:03', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (73, 'Z78W-KASG-GXYH', 'standard', 100, 'active', 'system', '2026-03-31 03:45:03', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (74, 'U94U-SCGF-QQZK', 'standard', 100, 'active', 'system', '2026-03-31 03:50:38', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (75, 'QL25-P7KY-LNR3', 'standard', 1000, 'active', 'system', '2026-03-31 08:55:00', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (76, 'GA5S-HCBB-Q8QH', 'uncommon', 5000, 'active', 'system', '2026-03-31 08:59:57', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (77, 'XHYV-8MZA-TG4M', 'epic', 100, 'active', 'system', '2026-03-31 09:04:56', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (78, 'T24P-FBWE-Q6X9', 'standard', 100, 'active', 'system', '2026-03-31 09:09:56', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (79, 'E2T5-76V9-V4SW', 'standard', 100, 'active', 'system', '2026-03-31 09:14:56', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (80, 'S9ZV-MD9R-A8ZP', 'standard', 100, 'active', 'system', '2026-03-31 09:19:56', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (81, 'SLSY-AP78-2XWU', 'standard', 1000, 'active', 'system', '2026-03-31 09:24:57', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (82, 'YW34-6MWG-RPVE', 'standard', 100, 'active', 'system', '2026-03-31 09:29:57', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (83, 'YC2P-B64K-EB4K', 'standard', 2000, 'active', 'system', '2026-03-31 09:34:57', NULL, NULL, NULL);
INSERT OR IGNORE INTO "bankode_codes" ("id", "code", "code_type", "value", "status", "generated_by", "generated_at", "redeemed_by", "redeemed_at", "expires_at") VALUES (84, 'AJYD-UW98-S9UV', 'standard', 100, 'active', 'system', '2026-03-31 09:40:39', NULL, NULL, NULL);

-- ────────────────────────────────────────────────────────────
-- TABLE: bankode_password_sessions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "bankode_password_sessions";
CREATE TABLE bankode_password_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: bankode_transactions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "bankode_transactions";
CREATE TABLE bankode_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        code TEXT,
        amount INTEGER,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: bankode_users  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "bankode_users";
CREATE TABLE bankode_users (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      gate_password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: bankode_wallets  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "bankode_wallets";
CREATE TABLE bankode_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        balance INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        total_redeemed INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: categories  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "categories";
CREATE TABLE categories (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL,
        slug       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: codes  (123 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "codes";
CREATE TABLE codes (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      type TEXT DEFAULT 'normal',
      spent BOOLEAN DEFAULT 0,
      is_compressed BOOLEAN DEFAULT 0,
      compressed_at DATETIME,
      meta TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      next_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_codes_user ON codes(user_id);
CREATE INDEX idx_codes_user_type ON codes(user_id, type);
CREATE UNIQUE INDEX uniq_codes_code ON codes(code);

INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('7244cdbe-4dcf-47f5-9d21-060356029188', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'TN4F-WE3Q-QNYT-LV8S-SGWY-835G-P2', 'codes', 0, 0, NULL, NULL, '2026-03-21 18:03:59', '2026-03-21 18:03:59', '2026-03-21 18:03:59');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('f91025ca-f777-4231-bf6d-307ef871dd6b', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'YC9U-MM8K-XM9G-5UQH-GDLT-K53U-P3', 'codes', 0, 0, NULL, NULL, '2026-03-21 18:07:25', '2026-03-21 18:07:25', '2026-03-21 18:07:25');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('058e171f-4349-4713-91af-7249b559ffd2', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'B3NS-5EWC-FFMY-S42G-DWXV-6XQK-P4', 'codes', 0, 0, NULL, NULL, '2026-03-21 18:13:55', '2026-03-21 18:13:55', '2026-03-21 18:13:55');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('4839189f-511c-41b9-b1dd-2e8e81df86c1', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'BEU7-2RDU-RP2A-FGCM-5GXS-BBPN-P6', 'codes', 0, 0, NULL, NULL, '2026-03-21 18:54:02', '2026-03-21 18:54:02', '2026-03-21 18:54:02');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('855392d5-ac5b-44a9-81c4-b1a45b8d76dc', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'YUUT-R7KP-NHH9-R6JV-GJS9-N9SE-P7', 'codes', 0, 0, NULL, NULL, '2026-03-21 18:59:02', '2026-03-21 18:59:02', '2026-03-21 18:59:02');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('e88f852f-0647-4c39-ba9b-7c029b29b200', '5210eb01-c83d-454a-8fa7-a19ad172467c', '5ZYV-VJ33-FW45-NJZR-4L68-VDAJ-P8', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:04:02', '2026-03-21 19:04:02', '2026-03-21 19:04:02');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('742713b7-76fc-4730-9bd5-0231405b0bbf', '5210eb01-c83d-454a-8fa7-a19ad172467c', '8NBE-6D6Y-BCB3-W9LX-GAP2-GG3G-P9', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:09:02', '2026-03-21 19:09:02', '2026-03-21 19:09:02');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5895137d-193a-4938-8103-814fcaf5c37b', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'UVWA-MAEF-FFE9-N6YQ-F8DU-GZEA-P0', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:14:32', '2026-03-21 19:14:32', '2026-03-21 19:14:32');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('16db6989-b1ee-4ce0-b369-b268e9a3237b', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'CRRA-ELW7-3YCG-JQV5-SMKE-PJYU-P1', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:19:32', '2026-03-21 19:19:32', '2026-03-21 19:19:32');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('60a67aba-8d75-4192-b6f4-248dfa19bee8', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'GUBV-N42C-AQVX-BP2U-ZUR8-2YUD-P2', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:25:03', '2026-03-21 19:25:03', '2026-03-21 19:25:03');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('e788bada-d9af-44bf-90cd-c0b73c33769f', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'J6CR-CXN6-YHPD-XF5L-UY2R-LUQV-P3', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:30:32', '2026-03-21 19:30:32', '2026-03-21 19:30:32');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5a4e211f-0125-4685-af4d-addd5c9e948f', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'L9RR-TUJG-B874-UDJ4-Q2LG-9PYW-P4', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:48:05', '2026-03-21 19:48:05', '2026-03-21 19:48:05');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('12958fd8-d2fe-43ee-ba10-25b06b61a829', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'LFNA-6KSH-9LKW-QMRA-4SAB-MH8Y-P5', 'codes', 0, 0, NULL, NULL, '2026-03-21 19:57:20', '2026-03-21 19:57:20', '2026-03-21 19:57:20');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a7548b32-6f48-4dc0-84aa-45334a2566ce', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'YQX2-NUVQ-YW73-UXCT-7HY9-8WD8-P6', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:07:53', '2026-03-21 20:07:53', '2026-03-21 20:07:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('1434bcbd-158c-4f84-aebf-27c6b210c23f', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'YZK2-UVKT-5V8S-85AT-HDMC-2WXM-P7', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:13:23', '2026-03-21 20:13:23', '2026-03-21 20:13:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('f9da46cd-47c2-4bd9-9127-d4f1f8586181', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'VTMN-W66L-SFM3-B2UU-PA5M-KCV7-P8', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:18:53', '2026-03-21 20:18:53', '2026-03-21 20:18:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5008e84b-19a1-40c7-9b42-24a666302f08', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'QSTZ-PE8Y-N9E9-QNGY-R25J-ULC9-P9', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:24:23', '2026-03-21 20:24:23', '2026-03-21 20:24:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('7187876b-21fd-4a5e-8a10-6e97e85a0f35', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'X266-QF4K-BTLQ-RNHH-7XZR-A88V-P0', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:29:53', '2026-03-21 20:29:53', '2026-03-21 20:29:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('aaad01b5-9ede-4c0c-aa4c-8c48b0d2f988', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'HM7R-YWEE-PAUE-KEYP-KFE7-GEZE-P1', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:34:53', '2026-03-21 20:34:53', '2026-03-21 20:34:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('19743041-7cb7-42f4-981c-74259cc10e86', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'CFJH-8AJV-F9D7-HQFN-K3EV-JBGB-P2', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:40:23', '2026-03-21 20:40:23', '2026-03-21 20:40:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ff0c5cd3-95b8-4721-a6a8-fe7666dd6297', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2GN5-JSZX-5RSJ-FHCM-J8TG-YXD8-P3', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:45:23', '2026-03-21 20:45:23', '2026-03-21 20:45:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('3056447a-c23b-4862-ae8e-57b9493e33db', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'KZ3G-U7B9-HCNR-PPD9-EF2T-UXPP-P4', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:50:23', '2026-03-21 20:50:23', '2026-03-21 20:50:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('8992a324-47ad-4d71-a51a-23fcf818d1ff', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'FAAP-LCBZ-RJUQ-BZ58-D6V6-82LR-P5', 'codes', 0, 0, NULL, NULL, '2026-03-21 20:55:23', '2026-03-21 20:55:23', '2026-03-21 20:55:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('362f701f-f929-4dc7-ba9b-5fa736b92785', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'DEYQ-8BFP-AG8A-BFWF-4FJH-FYKF-P6', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:00:53', '2026-03-21 21:00:53', '2026-03-21 21:00:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5399bfe7-3312-45e4-a120-39233f6cfa94', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'CDLZ-9JRD-ZBSK-Y85T-R4TA-9Q9N-P7', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:05:53', '2026-03-21 21:05:53', '2026-03-21 21:05:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('956735e6-e745-4a60-a87f-98f479e639df', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'VSQ4-N86E-J2FY-5MFE-LQ5J-MTFR-P8', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:10:56', '2026-03-21 21:10:56', '2026-03-21 21:10:56');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('4fa14c8c-96c6-4eec-b14f-85aee885cfdb', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'P854-27NA-TEB7-CB3C-T6CL-6K6G-P9', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:16:23', '2026-03-21 21:16:23', '2026-03-21 21:16:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('19c75b63-2074-44b9-88a3-dfbd0d752aa5', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'ZX54-PHZH-ZKUC-SHQ6-ZBPL-BRM3-P0', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:21:23', '2026-03-21 21:21:23', '2026-03-21 21:21:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('c56b1d15-9426-404c-bdff-10265ef95724', '5210eb01-c83d-454a-8fa7-a19ad172467c', '49ZP-UX6H-7FZL-4G44-QDBA-KUVC-P1', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:26:23', '2026-03-21 21:26:23', '2026-03-21 21:26:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('e35cdd8a-47ee-4fe3-be36-93a5a44a5720', '5210eb01-c83d-454a-8fa7-a19ad172467c', '4RHT-LHEL-YG9U-J8SW-3WGB-PYMY-P2', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:31:53', '2026-03-21 21:31:53', '2026-03-21 21:31:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('50eae03e-1088-43ec-aad7-26c2d5a95f44', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'MJPE-BPUZ-MJ38-VWHS-6NVX-AWL9-P3', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:37:23', '2026-03-21 21:37:23', '2026-03-21 21:37:23');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a60941f3-cfa0-42c9-b963-fafd944a7447', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'HYMD-QF37-U7SM-Y6DJ-E3SG-BJSY-P4', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:42:53', '2026-03-21 21:42:53', '2026-03-21 21:42:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('19df5614-d549-4d27-947d-cab8f6253ea5', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'HCUV-93ZJ-DTVH-WDQ7-GBJH-7PFX-P5', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:47:53', '2026-03-21 21:47:53', '2026-03-21 21:47:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('63f2fa06-2ad9-44a2-a4a4-211d342178c1', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'J3NZ-KNCP-EC56-HQPT-WQHC-HB9H-P6', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:53:25', '2026-03-21 21:53:25', '2026-03-21 21:53:25');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('2cb09958-f3b3-460f-9049-1f3a6bafad43', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'PBJN-5YFU-GBQ8-SMK6-J8QL-GCAB-P7', 'codes', 0, 0, NULL, NULL, '2026-03-21 21:58:53', '2026-03-21 21:58:53', '2026-03-21 21:58:53');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ea066e16-125b-4a8a-8d4a-6aadc7f2c10b', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'JY32-BL4K-G8N3-36B6-A3XT-EPMS-P8', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:04:10', '2026-03-21 22:04:10', '2026-03-21 22:04:10');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('2b00f4c9-bdd6-439c-a634-37a85a17cf84', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'KDYT-Q7Y4-79Q2-L5TM-PXXQ-D5A9-P9', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:09:10', '2026-03-21 22:09:10', '2026-03-21 22:09:10');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('6686aaaa-2bfd-4c7e-b27e-227c5c9497b2', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'Y2XJ-2MYV-LHGE-WJTF-2PGY-XPMU-P0', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:15:10', '2026-03-21 22:15:10', '2026-03-21 22:15:10');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('56ee29ed-5985-41f0-88f7-24faf676735c', '5210eb01-c83d-454a-8fa7-a19ad172467c', '57YC-VJ23-K2CC-3FG7-AZ4R-K6NT-P1', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:20:09', '2026-03-21 22:20:09', '2026-03-21 22:20:09');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('eb3d5567-2661-45b8-8fbc-87c869235d04', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'DY7C-VL2T-B7GQ-RCH2-NA4S-UBSA-P2', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:26:09', '2026-03-21 22:26:09', '2026-03-21 22:26:09');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a0caba2f-b48d-4f3d-8882-f61f39eddec2', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'U478-YKJ2-XVC6-N77D-TBSH-ML57-P3', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:31:50', '2026-03-21 22:31:50', '2026-03-21 22:31:50');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('39c80966-4091-4907-b745-3b643b354cc5', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'A9YB-TKRS-PE8M-UTXC-MAXE-XLUV-P4', 'codes', 0, 0, NULL, NULL, '2026-03-21 22:37:31', '2026-03-21 22:37:31', '2026-03-21 22:37:31');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5009ca39-8b48-4561-adab-23931ccb4952', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'VDHX-QKS3-WH9D-E5CA-YC8K-2JEV-P5', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:06:51', '2026-03-21 23:06:51', '2026-03-21 23:06:51');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a3ea6ea3-bd05-4818-b3fe-4245a724f855', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'JV9C-BDBF-KKPF-TYCS-72DM-YD3C-P6', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:12:21', '2026-03-21 23:12:21', '2026-03-21 23:12:21');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('b2cf0352-95d6-4b22-be50-bda31c24ccb4', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2J4Z-EX32-BWUQ-GZZK-2TGM-EM5T-P7', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:17:21', '2026-03-21 23:17:21', '2026-03-21 23:17:21');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ce7484e3-2743-4dc0-99a0-21afaa666b7b', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'PLKC-JWRD-XPWJ-3K43-K4N2-P453-P8', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:22:22', '2026-03-21 23:22:22', '2026-03-21 23:22:22');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('cdb033be-ecdb-4076-aa8e-57cf9980a43d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '3SSD-SK73-ME8H-7JJ2-CGNM-TYUS-P9', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:27:26', '2026-03-21 23:27:26', '2026-03-21 23:27:26');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('27fc6b8f-88f4-43cd-a714-07924008ecf7', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'P7A4-WHWT-RJQW-QMTV-NF3U-WU8W-P0', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:32:58', '2026-03-21 23:32:58', '2026-03-21 23:32:58');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5641d65a-002c-4819-8389-7f250653eeff', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'KSAS-ABE3-QLCL-LEZS-SZHR-GXWJ-P1', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:38:30', '2026-03-21 23:38:30', '2026-03-21 23:38:30');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5654c44c-6149-4808-9a92-085fb4f8ca5e', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'H2G5-9J46-7STU-NJ9H-CAFU-T3G6-P2', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:43:36', '2026-03-21 23:43:36', '2026-03-21 23:43:36');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a2e88a85-7b6f-49b3-8076-640b3194f8b8', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'JNLC-X5GP-UD4K-J8RZ-5VAB-8CEP-P3', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:48:57', '2026-03-21 23:48:57', '2026-03-21 23:48:57');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('d9d678f6-dccd-4edf-a2ee-d9b706847fe2', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'Q9Q6-DB6F-W4FW-VLEV-F3QN-NG7J-P4', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:53:59', '2026-03-21 23:53:59', '2026-03-21 23:53:59');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('c40fa19f-763c-4d5d-a8cc-540dae4091ec', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'DBAQ-6XRX-Q63L-EWVW-H9UL-5QAK-P5', 'codes', 0, 0, NULL, NULL, '2026-03-21 23:59:26', '2026-03-21 23:59:26', '2026-03-21 23:59:26');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('33a61093-f2b3-4ed8-82c2-2b98db0a694a', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'Q7BZ-7QNY-C6ZX-9XYL-SNQC-DXZ8-P6', 'codes', 0, 0, NULL, NULL, '2026-03-22 00:04:57', '2026-03-22 00:04:57', '2026-03-22 00:04:57');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('6128f9c6-65fe-402d-a29f-1548ee903b5d', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'CP2H-3B6R-ZDM5-E8ZQ-7CWJ-JDVV-P7', 'codes', 0, 0, NULL, NULL, '2026-03-22 00:10:08', '2026-03-22 00:10:08', '2026-03-22 00:10:08');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('018b32f3-0ba4-41f5-bfa4-54524b8b2086', '5210eb01-c83d-454a-8fa7-a19ad172467c', '7WMH-LMEP-RFK7-E2US-6XLD-7UJL-P8', 'codes', 0, 0, NULL, NULL, '2026-03-22 00:12:34', '2026-03-22 00:12:34', '2026-03-22 00:12:34');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ec0595a6-aeed-4eec-a773-687afb37f5e2', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'PJ3G-2XUN-TB84-8C55-EME5-U5HU-P0', 'codes', 0, 0, NULL, NULL, '2026-03-22 01:48:39', '2026-03-22 01:48:39', '2026-03-22 01:48:39');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ad62c2e5-fc88-4c14-a182-ce94de4178b8', '5210eb01-c83d-454a-8fa7-a19ad172467c', '9W2A-QNC2-PDF4-T6ET-76NN-MXAT-P1', 'codes', 0, 0, NULL, NULL, '2026-03-22 01:54:12', '2026-03-22 01:54:12', '2026-03-22 01:54:12');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ce49e4d4-bc1f-45b5-8549-d9815e5f9b24', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'W7N7-LJXZ-BVUJ-LANQ-Y7XH-9H6C-P2', 'codes', 0, 0, NULL, NULL, '2026-03-22 01:59:22', '2026-03-22 01:59:22', '2026-03-22 01:59:22');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('83591024-8752-4f29-be1c-f324ad10c7ff', '5210eb01-c83d-454a-8fa7-a19ad172467c', '8X8A-NSUV-D6UD-CWPB-MZ3E-9DLX-P3', 'codes', 0, 0, NULL, NULL, '2026-03-22 02:04:28', '2026-03-22 02:04:28', '2026-03-22 02:04:28');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('0a5b51be-1257-42db-ac64-db4efaf965d0', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'QVVN-BJJF-RRAT-9WMU-ENHG-PPCU-P4', 'codes', 0, 0, NULL, NULL, '2026-03-22 02:09:39', '2026-03-22 02:09:39', '2026-03-22 02:09:39');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('7b12da28-81f5-45e3-b826-3976383b30ee', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'JF79-PNW8-AEVH-Q96Z-U7VT-2K86-P5', 'codes', 0, 0, NULL, NULL, '2026-03-22 02:15:11', '2026-03-22 02:15:11', '2026-03-22 02:15:11');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('6618773b-4e2e-4a20-bd88-593c3ce028ab', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'M7VG-JF9U-6JM6-WV7R-RLDV-XERM-P6', 'codes', 0, 0, NULL, NULL, '2026-03-22 02:20:41', '2026-03-22 02:20:41', '2026-03-22 02:20:41');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('02c2dd70-8d6f-4639-b218-38848585dcb5', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'VJBY-UDL5-PKK7-NPRY-7GMJ-2YRB-P6', 'codes', 0, 0, NULL, NULL, '2026-03-22 11:22:52', '2026-03-22 11:22:52', '2026-03-22 11:22:52');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('2bfb5414-22ee-4c4f-8e0c-cd7e95ba8060', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'GJ3N-GNFS-A4UY-NXY2-N2EM-ZBKL-P7', 'codes', 0, 0, NULL, NULL, '2026-03-22 11:27:58', '2026-03-22 11:27:58', '2026-03-22 11:27:58');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('537f5bd0-ef86-41d0-8b3b-9e3b4986d078', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'SWB7-USPN-DRY3-2A5M-C43S-5J2U-P8', 'codes', 0, 0, NULL, NULL, '2026-03-22 11:33:07', '2026-03-22 11:33:07', '2026-03-22 11:33:07');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('30afd3c8-82c4-4a8e-8bc2-6d403d9687e1', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'PJLP-472V-FUBT-Z4AN-SNEZ-6LLJ-P9', 'codes', 0, 0, NULL, NULL, '2026-03-22 13:58:42', '2026-03-22 13:58:42', '2026-03-22 13:58:42');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('f0c4d2d0-89f5-4fba-8406-83982468d0d5', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'ULBC-VG56-T7YW-RM4S-CQH6-ZURG-P0', 'codes', 0, 0, NULL, NULL, '2026-03-22 14:41:15', '2026-03-22 14:41:15', '2026-03-22 14:41:15');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('37bc980a-c6a1-40b1-bef9-f5fa9a948a9e', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'LFE8-D2SN-LER2-MWB2-YCR4-7TTG-P1', 'codes', 0, 0, NULL, NULL, '2026-03-22 14:42:33', '2026-03-22 14:42:33', '2026-03-22 14:42:33');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('c6494fb8-5db4-40af-956b-306b82e48e93', '5210eb01-c83d-454a-8fa7-a19ad172467c', 'B5E7-WSPA-J9VT-U5UD-488S-8K6Q-P2', 'codes', 0, 0, NULL, NULL, '2026-03-22 14:48:41', '2026-03-22 14:48:41', '2026-03-22 14:48:41');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ad439406-1bf2-4749-9801-63648abd90a1', '3b492980-54ed-46a3-9704-c6896deabdd0', 'NAWH-30V9-RG3M-VLV7-7NL7-G817-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:36', '2026-04-05 20:15:36', '2026-04-05 20:15:36');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('0d8b95a7-ef7f-4d80-b28c-5e8577d1e88d', '3b492980-54ed-46a3-9704-c6896deabdd0', 'FJBS-DTLQ-L4SN-VT7T-1ILV-160D-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:36', '2026-04-05 20:15:36', '2026-04-05 20:15:36');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5f3f5f56-99eb-4ca6-aa52-09c1d98e9511', '3b492980-54ed-46a3-9704-c6896deabdd0', 'QW5Y-TQF3-XPVT-V9SW-DAT0-BC2I-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:36', '2026-04-05 20:15:36', '2026-04-05 20:15:36');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('89082861-9ae6-45db-8fd2-9d491bdf16b2', '3b492980-54ed-46a3-9704-c6896deabdd0', 'PLUF-9YIZ-LA99-SBJ5-YE1R-A5BH-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:36', '2026-04-05 20:15:36', '2026-04-05 20:15:36');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('9d9a7c69-11e0-4697-8f49-c1d5a0e7ab00', '3b492980-54ed-46a3-9704-c6896deabdd0', 'BOFB-J74T-40KX-7EM3-H9QQ-C1G5-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:36', '2026-04-05 20:15:36', '2026-04-05 20:15:36');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('02cd3687-1f37-4f84-8b54-1558515a11b1', '3b492980-54ed-46a3-9704-c6896deabdd0', 'RU81-CJIX-BULZ-F3T3-EIZ5-0XT9-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('959b8e0e-946e-4588-8821-3d0f59638a0d', '3b492980-54ed-46a3-9704-c6896deabdd0', '4YB4-R9J2-5N6W-K0CD-23FC-BF9K-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('d007ad54-0a72-41c0-9a13-1b31a5986468', '3b492980-54ed-46a3-9704-c6896deabdd0', '5FSY-MXRB-XVTT-U3LT-183M-JYWT-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('1ea26212-44dc-4b17-a8d2-37b3a3c670a9', '3b492980-54ed-46a3-9704-c6896deabdd0', 'T01W-WH08-2HD3-APPG-D0D6-X2CJ-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('89e9aae8-9329-4f7f-ab0d-a972d049d4f8', '3b492980-54ed-46a3-9704-c6896deabdd0', 'SNBE-KKY0-V6EH-EGQH-2TVJ-OEQM-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('672f1a00-8dcf-4bbe-a4c4-aad84404c2ad', '3b492980-54ed-46a3-9704-c6896deabdd0', 'JYR2-Q2R4-4BHI-3609-IOIU-C9RV-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ec5ff8b6-3648-4426-85ae-43f649c3b825', '3b492980-54ed-46a3-9704-c6896deabdd0', 'CJI3-Q2N6-8V01-3IUA-YQ8E-VTA5-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('bc86cc72-444f-4b68-9f50-1e1e165ee820', '3b492980-54ed-46a3-9704-c6896deabdd0', '7VXM-DSL5-4VIX-27OC-AU4J-MWOD-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('c465302a-a4c2-49c1-8f26-e9176fffeed4', '3b492980-54ed-46a3-9704-c6896deabdd0', '0BG4-3L9V-LU34-RES4-39AF-6A5U-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('f4c8aa09-c65e-48f0-96a7-c0bb10b63963', '3b492980-54ed-46a3-9704-c6896deabdd0', 'ZNTC-DLMD-I4CO-766K-63R3-EFDU-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('278c8990-08c4-4a41-9d4a-f789f50a03c2', '3b492980-54ed-46a3-9704-c6896deabdd0', 'XPRH-KNDF-QE77-IULP-S5F0-LBC9-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('78327a03-eeed-4e89-a4d3-bde8fef39167', '3b492980-54ed-46a3-9704-c6896deabdd0', '9KR8-BNAA-N2V9-QCHX-OPAE-R6A0-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('b5328e23-42d4-47b5-9f42-e82e68829a4e', '3b492980-54ed-46a3-9704-c6896deabdd0', 'K3QY-DZF8-LJS8-5RF1-3KZZ-4MBB-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('85de097d-d31c-4711-8dd2-8876448825d3', '3b492980-54ed-46a3-9704-c6896deabdd0', 'IF3U-1293-SFA3-BNVS-CNYH-Z3YY-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('17f73fcd-30ef-469c-a897-c56e88f9bc3f', '3b492980-54ed-46a3-9704-c6896deabdd0', 'BMEU-JFPF-XQKX-3M73-9HZV-MXT4-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:37', '2026-04-05 20:15:37', '2026-04-05 20:15:37');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('364da65d-58a4-4926-9e2a-c04082b2eab7', '3b492980-54ed-46a3-9704-c6896deabdd0', '9M27-0H53-C8WU-KFW1-1IG0-EOA2-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:38', '2026-04-05 20:15:38', '2026-04-05 20:15:38');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('ad2d2fd4-664f-459f-884a-7eea1ccc0a51', '3b492980-54ed-46a3-9704-c6896deabdd0', 'J1FW-KQSO-8XLW-N3MI-AQ31-NOM7-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:38', '2026-04-05 20:15:38', '2026-04-05 20:15:38');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('7f89bcfa-6844-4017-bc2a-89867a77aa42', '3b492980-54ed-46a3-9704-c6896deabdd0', 'Z9XQ-WIY9-VNNB-AXDI-J1NI-INUV-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:38', '2026-04-05 20:15:38', '2026-04-05 20:15:38');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('4c4d0196-f5f3-4eb6-b98e-dbded72f6fd8', '3b492980-54ed-46a3-9704-c6896deabdd0', 'LH9W-FYHA-IE5N-UF5P-0J6D-LYLY-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:38', '2026-04-05 20:15:38', '2026-04-05 20:15:38');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('3ac6ecbf-9fc6-4128-8017-c380b2789de4', '3b492980-54ed-46a3-9704-c6896deabdd0', '6GVC-IEVU-VLR0-XFO9-O477-0Z4X-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:39', '2026-04-05 20:15:39', '2026-04-05 20:15:39');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('bb531d4f-86dd-4742-aecf-dfb1d93f8051', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', '5PTA-TNS6-WZV9-2L4T-9I85-PI1K-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:39', '2026-04-05 20:15:39', '2026-04-05 20:15:39');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('8ba17ef5-a9bb-4a84-bb94-dd745f5cb425', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'F4IL-5UY6-YIW0-G7PL-TITE-VIXR-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:39', '2026-04-05 20:15:39', '2026-04-05 20:15:39');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('3e6665a0-fd00-4464-a0c8-979abb9a0fad', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', '12GU-LFYC-Z75K-Y80I-0S63-0KNG-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:39', '2026-04-05 20:15:39', '2026-04-05 20:15:39');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('18daae00-8594-47da-a05a-4a99c2ae6e5b', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'HAEO-NKT2-NHBB-P501-I09G-PADU-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('9d029f75-929a-44e2-84f1-78011ce09b76', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'APQU-B5PM-AD1C-BUWG-1O1A-DMPW-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('e8fe9be4-6cc9-413f-9fe9-8762c1340eec', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'LUZ8-ADT8-E9F3-K371-XMPM-P8JZ-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('12cac153-c314-41ad-ae14-424fb79d7426', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', '46E1-YN8F-EJJZ-0A8N-ETG3-U6WQ-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('d2cfa82b-07e6-4303-9de1-e79590884ade', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'XIO3-6A80-RG96-IOX0-6R06-GIZ2-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('c2a3db23-d08d-4f89-93df-4e3a24a976b9', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', '1UUX-RJ5B-4XS9-EKSM-M20U-LNK2-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('67eb226c-f1d4-4e47-a608-484ba2209ac9', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'LTGM-IWNM-DQLB-4F9A-0HEE-SIYU-P2', 'codes', 1, 0, NULL, NULL, '2026-04-05 20:15:40', '2026-04-05 20:15:40', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('5cad40a1-ab75-4e6d-a856-9e4c63875e82', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', '90VT-HV75-J9GV-A3ZT-LUFN-AWHJ-P2', 'silver', 1, 0, NULL, NULL, '2026-04-05 20:15:41', '2026-04-05 20:15:41', '2026-04-05 20:15:41');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a419cfc4-4774-44fa-b055-a3ea0d41ba39', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'OAA3-VWCM-8N8U-8NHF-0ZFU-O4WE-P2', 'silver', 1, 0, NULL, NULL, '2026-04-05 20:15:41', '2026-04-05 20:15:41', '2026-04-05 20:15:41');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('a6463c14-bc30-4bf7-bf39-41171f2e74b8', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'M2FT-41Q7-XKVZ-T8UZ-BU6C-ENSC-P2', 'silver', 1, 0, NULL, NULL, '2026-04-05 20:15:41', '2026-04-05 20:15:41', '2026-04-05 20:15:41');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('2a7c3d62-6a36-46db-9b8b-45b07f5c1185', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', '496N-L353-WND9-IUMG-M97L-QR8S-P2', 'gold', 1, 0, NULL, NULL, '2026-04-05 20:15:42', '2026-04-05 20:15:42', '2026-04-05 20:15:42');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('860de549-a9d2-4d90-85a1-123b9e661433', '3b492980-54ed-46a3-9704-c6896deabdd0', 'A7JZ-4I0G-Z0TJ-CBQO-29IL-516T-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:49', '2026-04-05 20:15:49', '2026-04-05 20:15:49');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('038c9de1-8bb4-483e-a35e-d798fcf1e9fb', '3b492980-54ed-46a3-9704-c6896deabdd0', 'FG41-BAKE-EDJS-HYU6-I7L5-8NZT-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:49', '2026-04-05 20:15:49', '2026-04-05 20:15:49');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('83833bcd-f9df-4dfd-8f0c-bf37fa3816a2', '3b492980-54ed-46a3-9704-c6896deabdd0', 'BJ79-ZJBM-8DFW-03B2-31MR-XEZO-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:49', '2026-04-05 20:15:49', '2026-04-05 20:15:49');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('63273374-ec82-4393-801e-66982e9d50be', '3b492980-54ed-46a3-9704-c6896deabdd0', '9ACY-SHG6-0TRT-PEDA-0L3K-7FVW-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:49', '2026-04-05 20:15:49', '2026-04-05 20:15:49');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('2fc82559-30c3-4151-8af4-edf52d8fa0dd', '3b492980-54ed-46a3-9704-c6896deabdd0', 'UPAB-A2KJ-2EK6-AU7Y-06RM-562P-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:49', '2026-04-05 20:15:49', '2026-04-05 20:15:49');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('d6a3cbbe-9cda-40cb-9850-9d99eaf2c01e', '3b492980-54ed-46a3-9704-c6896deabdd0', '3SNU-XUN1-O9EM-IFBR-ME40-2ZPG-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:49', '2026-04-05 20:15:49', '2026-04-05 20:15:49');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('6101c995-fa21-4700-a59a-5cf341c15956', '3b492980-54ed-46a3-9704-c6896deabdd0', 'AABK-O958-Q89O-8HAJ-3ZBT-RNDW-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:50', '2026-04-05 20:15:50', '2026-04-05 20:15:50');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('429a8477-34fc-464c-8bee-5a8720a38c53', '3b492980-54ed-46a3-9704-c6896deabdd0', '904F-M96N-Y6YN-D54G-44JG-7AGY-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:50', '2026-04-05 20:15:50', '2026-04-05 20:15:50');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('fb0b6b95-1fc6-4325-8ee3-d1fcc1745b01', '3b492980-54ed-46a3-9704-c6896deabdd0', 'B9EA-R9M9-YT9U-CU74-O3S8-HYA1-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:50', '2026-04-05 20:15:50', '2026-04-05 20:15:50');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('b12c9cba-7765-4ffa-bb70-9b6038f7d22b', '3b492980-54ed-46a3-9704-c6896deabdd0', 'FO5H-00FE-H1KZ-OVA2-X6I2-21DH-P2', 'codes', 0, 0, NULL, NULL, '2026-04-05 20:15:50', '2026-04-05 20:15:50', '2026-04-05 20:15:50');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('295a67f3-9e7f-4cb3-8649-e5a59ac9fd9d', '3b492980-54ed-46a3-9704-c6896deabdd0', 'OIFB-G6XN-5LPB-TUC1-2SIW-9OUV-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:51', '2026-04-05 20:15:51', '2026-04-05 20:15:51');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('4a0431a0-a612-4e71-b38c-b6fb5eb629b4', '3b492980-54ed-46a3-9704-c6896deabdd0', '95VC-EN7B-6M2F-9F5C-PYU9-EUVJ-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:51', '2026-04-05 20:15:51', '2026-04-05 20:15:51');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('c54a6153-d1d5-4df7-8dc7-469a20a98f80', '3b492980-54ed-46a3-9704-c6896deabdd0', 'P1EJ-1VN7-8XMP-R71O-9UJR-UODC-P2', 'silver', 0, 0, NULL, NULL, '2026-04-05 20:15:51', '2026-04-05 20:15:51', '2026-04-05 20:15:51');
INSERT OR IGNORE INTO "codes" ("id", "user_id", "code", "type", "spent", "is_compressed", "compressed_at", "meta", "generated_at", "next_at", "created_at") VALUES ('33f11e02-eea6-4e22-ad13-71fd5ca7945c', '3b492980-54ed-46a3-9704-c6896deabdd0', 'D131-OWZ1-CVPZ-1DPK-2MXC-YUKJ-P2', 'gold', 0, 0, NULL, NULL, '2026-04-05 20:15:52', '2026-04-05 20:15:52', '2026-04-05 20:15:52');

-- ────────────────────────────────────────────────────────────
-- TABLE: device_roles  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "device_roles";
CREATE TABLE device_roles (
      user_id TEXT PRIMARY KEY,
      primary_session TEXT NOT NULL,
      primary_label TEXT,
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "device_roles" ("user_id", "primary_session", "primary_label", "last_heartbeat") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', '3e9b798a-5a8e-4d7d-a1ac-4fd41d12937c', 'Android Tablet', '2026-04-05 16:18:30');

-- ────────────────────────────────────────────────────────────
-- TABLE: drmail_messages  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "drmail_messages";
CREATE TABLE drmail_messages (
      id              UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id       UUID REFERENCES drmail_messages(id) ON DELETE CASCADE,
      subject         TEXT NOT NULL DEFAULT 'Message from Admin',
      body            TEXT NOT NULL,
      is_read         BOOLEAN NOT NULL DEFAULT FALSE,
      sender_is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_drmail_parent    ON drmail_messages(parent_id);
CREATE INDEX idx_drmail_recipient ON drmail_messages(recipient_id, created_at DESC);
CREATE INDEX idx_drmail_sender    ON drmail_messages(sender_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: e7ki_conversations  (3 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "e7ki_conversations";
CREATE TABLE e7ki_conversations (
    id TEXT PRIMARY KEY,
    participant_ids TEXT NOT NULL, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  , title TEXT DEFAULT 'Untitled Chat');

CREATE INDEX idx_conversations_updated ON e7ki_conversations(updated_at DESC);

INSERT OR IGNORE INTO "e7ki_conversations" ("id", "participant_ids", "created_at", "updated_at", "title") VALUES ('ca87aee9-c132-4c65-9a77-07ae949b28ac', '["d64317c1-ed96-4ac4-8a75-46cf48180e05","5210eb01-c83d-454a-8fa7-a19ad172467c"]', '2026-03-20 12:55:46', '2026-03-20 12:55:47', 'Test Chat');
INSERT OR IGNORE INTO "e7ki_conversations" ("id", "participant_ids", "created_at", "updated_at", "title") VALUES ('62ee6ed9-e7b3-4e97-8c01-0dc4bfbc7038', '["d64317c1-ed96-4ac4-8a75-46cf48180e05","5210eb01-c83d-454a-8fa7-a19ad172467c"]', '2026-03-20 13:23:21', '2026-03-20 13:23:21', 'Test Chat');
INSERT OR IGNORE INTO "e7ki_conversations" ("id", "participant_ids", "created_at", "updated_at", "title") VALUES ('428ac632-402b-42d1-85ee-83c15f80bd9f', '["d64317c1-ed96-4ac4-8a75-46cf48180e05","5210eb01-c83d-454a-8fa7-a19ad172467c"]', '2026-03-20 13:25:29', '2026-03-20 13:25:30', 'Test Chat');

-- ────────────────────────────────────────────────────────────
-- TABLE: e7ki_media  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "e7ki_media";
CREATE TABLE e7ki_media (
    id TEXT PRIMARY KEY,
    message_id TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES e7ki_messages(id) ON DELETE SET NULL
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: e7ki_messages  (5 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "e7ki_messages";
CREATE TABLE e7ki_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,  -- Changed from conversation_id to match client
    sender_id TEXT NOT NULL,
    sender_username TEXT,   -- Added for client display
    content TEXT,
    type TEXT DEFAULT 'text', -- Changed from content_type to match client
    media_url TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, read
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES e7ki_conversations(id)
  );

CREATE INDEX idx_messages_chat ON e7ki_messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON e7ki_messages(sender_id);

INSERT OR IGNORE INTO "e7ki_messages" ("id", "chat_id", "sender_id", "sender_username", "content", "type", "media_url", "status", "created_at") VALUES ('84439646-5244-4a07-aa9c-8902df71cdee', 'ca87aee9-c132-4c65-9a77-07ae949b28ac', 'd64317c1-ed96-4ac4-8a75-46cf48180e05', NULL, 'Hello User B! This is a real-time test.', 'text', NULL, 'sent', '2026-03-20 12:55:47');
INSERT OR IGNORE INTO "e7ki_messages" ("id", "chat_id", "sender_id", "sender_username", "content", "type", "media_url", "status", "created_at") VALUES ('f15935de-ecc0-4173-8346-b479021246da', '62ee6ed9-e7b3-4e97-8c01-0dc4bfbc7038', 'd64317c1-ed96-4ac4-8a75-46cf48180e05', NULL, 'Hello User B! This is a real-time test.', 'text', NULL, 'sent', '2026-03-20 13:23:21');
INSERT OR IGNORE INTO "e7ki_messages" ("id", "chat_id", "sender_id", "sender_username", "content", "type", "media_url", "status", "created_at") VALUES ('4d1b6316-cbb1-40f5-822e-0c4753a587f8', '62ee6ed9-e7b3-4e97-8c01-0dc4bfbc7038', '5210eb01-c83d-454a-8fa7-a19ad172467c', NULL, 'Hi User A! I received your message perfectly.', 'text', NULL, 'sent', '2026-03-20 13:23:21');
INSERT OR IGNORE INTO "e7ki_messages" ("id", "chat_id", "sender_id", "sender_username", "content", "type", "media_url", "status", "created_at") VALUES ('17a474bf-28b9-4718-aa97-b5b211f7ea78', '428ac632-402b-42d1-85ee-83c15f80bd9f', 'd64317c1-ed96-4ac4-8a75-46cf48180e05', NULL, 'Hello User B! This is a real-time test.', 'text', NULL, 'sent', '2026-03-20 13:25:30');
INSERT OR IGNORE INTO "e7ki_messages" ("id", "chat_id", "sender_id", "sender_username", "content", "type", "media_url", "status", "created_at") VALUES ('df918d21-303e-454e-b933-cb7aec6f64d3', '428ac632-402b-42d1-85ee-83c15f80bd9f', '5210eb01-c83d-454a-8fa7-a19ad172467c', NULL, 'Hi User A! I received your message perfectly.', 'text', NULL, 'sent', '2026-03-20 13:25:30');

-- ────────────────────────────────────────────────────────────
-- TABLE: e7ki_reactions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "e7ki_reactions";
CREATE TABLE e7ki_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES e7ki_messages(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id, reaction)
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: event_offsets  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "event_offsets";
CREATE TABLE event_offsets (
       key TEXT PRIMARY KEY,
       last_id INTEGER DEFAULT 0,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );

INSERT OR IGNORE INTO "event_offsets" ("key", "last_id", "updated_at") VALUES ('default', 0, '2026-03-08 17:44:27');

-- ────────────────────────────────────────────────────────────
-- TABLE: event_store  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "event_store";
CREATE TABLE event_store (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       event_type TEXT NOT NULL,
       payload TEXT DEFAULT '{}',
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );


-- ────────────────────────────────────────────────────────────
-- TABLE: event_vault  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "event_vault";
CREATE TABLE event_vault (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      actor_user_id TEXT,
      target_user_id TEXT,
      amount NUMERIC,
      asset_id TEXT,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tx_hash TEXT UNIQUE
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: events  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "events";
CREATE TABLE events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      meta TEXT,
      seen BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: farragna_comments  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "farragna_comments";
CREATE TABLE farragna_comments (
      id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      video_id UUID NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: farragna_like_transactions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "farragna_like_transactions";
CREATE TABLE farragna_like_transactions (
      id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      giver_id TEXT NOT NULL,
      video_id UUID NOT NULL,
      like_type TEXT NOT NULL,
      codes_value INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(giver_id, video_id, like_type)
    );

CREATE INDEX idx_farragna_like_tx_giver ON farragna_like_transactions(giver_id);
CREATE INDEX idx_farragna_like_tx_video ON farragna_like_transactions(video_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: farragna_likes  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "farragna_likes";
CREATE TABLE farragna_likes (
      id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      user_id TEXT NOT NULL,
      video_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, video_id)
    );

CREATE INDEX idx_farragna_likes_video ON farragna_likes(video_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: farragna_videos  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "farragna_videos";
CREATE TABLE farragna_videos (
      id TEXT PRIMARY KEY,
      owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      stream_uid TEXT UNIQUE NOT NULL,
      playback_url TEXT,
      status TEXT NOT NULL,
      duration INTEGER,
      size BIGINT,
      views_count INTEGER DEFAULT 0,
      rewards_earned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , url TEXT, thumbnail_url TEXT, caption TEXT DEFAULT 'Untitled', category TEXT DEFAULT 'entertainment', cloud_public_id TEXT, likes INTEGER NOT NULL DEFAULT 0, comments_count INTEGER NOT NULL DEFAULT 0, likes_breakdown TEXT DEFAULT '{"like":0,"super":0,"mega":0,"drd":0}');

CREATE INDEX idx_farragna_videos_created ON farragna_videos(created_at DESC);
CREATE INDEX idx_farragna_videos_status ON farragna_videos(status);
CREATE INDEX idx_farragna_videos_stream_uid ON farragna_videos(stream_uid);


-- ────────────────────────────────────────────────────────────
-- TABLE: farragna_views  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "farragna_views";
CREATE TABLE farragna_views (
      id TEXT PRIMARY KEY,
      video_id TEXT REFERENCES farragna_videos(id) ON DELETE CASCADE,
      viewer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (video_id, viewer_id)
    );

CREATE INDEX idx_farragna_views_video ON farragna_views(video_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: gamble_ledger  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "gamble_ledger";
CREATE TABLE gamble_ledger (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: gamble_players  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "gamble_players";
CREATE TABLE gamble_players (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    score INTEGER DEFAULT 0,
    turn_order INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: gamble_rooms  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "gamble_rooms";
CREATE TABLE gamble_rooms (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    game_name TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    num_players_target INTEGER NOT NULL,
    num_players_joined INTEGER NOT NULL DEFAULT 0,
    entry_fee INTEGER NOT NULL DEFAULT 100,
    prize_pool INTEGER NOT NULL,
    creator_id TEXT NOT NULL,
    winner_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: game_scores  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "game_scores";
CREATE TABLE game_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_name TEXT NOT NULL REFERENCES games(name),
      score INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: games  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "games";
CREATE TABLE games (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: identity_state  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "identity_state";
CREATE TABLE identity_state (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: interaction_events  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "interaction_events";
CREATE TABLE interaction_events (
        bucket_key    TEXT PRIMARY KEY,
        from_user_id  TEXT NOT NULL,
        to_user_id    TEXT NOT NULL,
        event_type    TEXT NOT NULL,
        bucket_date   TEXT NOT NULL,
        count         INTEGER NOT NULL DEFAULT 1,
        total_codes   INTEGER NOT NULL DEFAULT 0,
        last_at       DATETIME DEFAULT CURRENT_TIMESTAMP
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: ledger  (86 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "ledger";
CREATE TABLE ledger (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL,
      tx_hash TEXT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
      asset_type TEXT NOT NULL,
      amount INT NOT NULL CHECK (amount > 0),
      reference TEXT,
      meta TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE UNIQUE INDEX ledger_tx_unique ON ledger (tx_id, user_id, direction);

INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'c0aab2c8-9d90-48ba-acbf-c342c0fd60af', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-08 19:10:41');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '48a1a9c2-de6a-4079-bdb9-9bbc9c38c685', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 18:03:59');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '76f5e4d1-4d61-40eb-a37b-50dd94c6e629', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 18:07:25');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'cb85e712-af16-4629-ac03-7bf024f3e3db', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 18:13:55');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'd6e07083-c413-455c-be48-414566a5d6cb', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 18:54:02');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '9b6f9f13-2f80-46d8-bec7-e7c493e37055', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 18:59:02');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '5c97e0be-69b0-4a4e-bce0-18486bb735c6', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:04:02');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '7f03b3fc-b137-40e8-943f-b1a9acdfee9f', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:09:02');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '7f1aef93-4f8c-4711-8260-7e2504137bbb', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:14:32');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '823f74f6-21a2-440d-8aaa-ca6ab24ee6b5', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:19:32');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'b121caae-cace-4537-ae41-48f82509f4c8', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:25:03');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'ee23c3f1-e49c-4a54-88ac-486a676e48d9', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:30:32');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '71cf8b30-3f63-447c-aca4-02fc227d1bae', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:48:05');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'fa800a56-25c6-4cbe-ab51-692fcb3180f5', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 19:57:20');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '4dd12df9-caeb-4c0b-ad9e-640152e6ec24', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:07:54');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'f480684b-992a-43c9-b5ea-58bd2cc82190', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:13:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '838258df-ba89-4be1-bf0d-4c5c19ceeb48', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:18:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '4f66580f-50ec-40fe-9dca-ea057e9afada', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:24:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'e07552e5-a2a6-4846-a3a2-9eaa36a90e93', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:29:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '1ca3f63e-cc5a-473e-9102-98c2a1f423d9', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:34:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '392bda1a-5c23-4c80-8aa8-3029a60b0a04', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:40:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'd0deca2f-c729-49f2-a412-0a7a843080bf', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:45:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '58db9924-99f8-41cb-8e91-f683123a9284', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:50:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'a6a85497-39c1-4095-86cf-db57c3ac1652', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 20:55:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'bd0bebaa-1d9c-4821-8f0b-9d343bb2d157', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:00:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '8f4286f4-0b01-4cba-aa0f-14b3d8f8676f', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:05:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '371bc3bd-578d-46b7-b728-80b8119b7c52', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:10:56');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'd6cf85de-34d4-4e6e-9af0-340de018d1d8', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:16:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '3f40aefe-d183-4a16-8e0e-5d92f884a680', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:21:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '90819854-d9f8-40f4-beae-a05234a9ea9e', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:26:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '741c5690-188d-40f1-9c39-264766a99c31', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:31:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'bbd58eed-0630-4146-9f78-16b865a74288', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:37:23');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'f1eeab86-c3fa-47c1-9dd4-029f591375ad', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:42:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '56fc214c-ae8a-4835-a6db-e15b30cae95e', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:47:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '1c33b93d-131f-4778-8575-4d9b9a3d2645', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:53:25');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '35333ef9-7f64-4ec3-88f2-fde43c28e588', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 21:58:53');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '0bf96194-2d3f-4984-a8bd-13c8db7bd130', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:04:10');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'c9bd8129-b6ba-4e0b-bdac-63817161493b', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:09:10');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '8e8a9154-2614-4275-9107-394ee22acc01', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:15:10');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'd1caeaa7-0bd5-4126-9a4e-c94878399f63', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:20:09');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '97f648d0-4e92-4038-bbcb-d2f750dd6e6b', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:26:09');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '46fee296-d18e-4d13-b6f6-8b1e8bd551f9', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:31:50');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'de372deb-64ff-4a83-a407-05dd8bdf0e28', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 22:37:34');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'b02d4ace-3760-4cc6-a99f-af1804146629', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:06:51');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '8da75c9f-2a0d-468e-becd-fe6c03496594', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:12:21');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '8296407e-46c6-4081-adfb-772638df11d8', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:17:22');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '7e374a23-2950-47c2-8e6a-0dffc26de9ca', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:22:22');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'e84df46f-937e-4ee6-b347-2d84ac0ab5aa', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:27:26');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '24483204-984d-4bdf-bc32-2e3e802f040b', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:32:58');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'e22a8f07-96a6-41a3-ae35-732a6b61b1b9', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:38:30');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'f0bb8acd-87ce-4606-a856-b286b13e7015', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:43:36');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'eaf2d60c-1ab3-48e3-b087-89e35b884c03', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:48:57');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '3ce9da0e-916c-4352-91a2-ee5dc420852d', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:53:59');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '01a5b98e-4967-4bc8-b6f6-43b587b66d6e', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-21 23:59:26');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '5ddd610b-4fff-4b89-8fef-d1ba5917c6ff', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 00:04:57');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '270a93f6-ddaf-4d63-becd-4523bd5b6e8a', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 00:10:08');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'e0652c56-8965-4ff6-99c6-b8ce8db3a060', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 00:12:34');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'a644fecc-3fa1-4987-846e-0f3b5af82d2a', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 01:48:39');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'ca2f1959-aec7-426e-8a85-f7ff4850c5db', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 01:54:12');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'ec4927ba-c2ba-4c80-8460-962a142ede4c', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 01:59:22');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '1399a156-f7a8-4076-b11c-1c1f803a8946', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 02:04:28');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'dd6749d2-064d-4d0c-98d3-1ddbf93da065', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 02:09:39');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '0017a345-3d75-4ee4-9643-9f10b3c3d98b', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 02:15:11');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '4e50a639-f441-4383-a6a8-231570622715', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 02:20:41');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '73680d8f-4547-4edd-9c71-22275e50fc24', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 11:22:52');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '8e45d3cb-dcb8-403b-affb-3426e93900ad', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 11:27:58');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'b4f5088c-e478-4452-b87f-c210e56987cd', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 11:33:07');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '31593279-ea41-4860-92c7-ea13491e0cb5', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 13:58:42');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'dc25a203-83c3-40ac-abc8-dc996481afa6', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 14:41:15');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, '748f4181-737d-4d0f-a0d2-5ca89cf00626', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 14:42:33');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'c2a103f9-1fac-4940-b29e-4ce48fdeb297', NULL, '5210eb01-c83d-454a-8fa7-a19ad172467c', 'credit', 'codes', 1, 'claim', NULL, '2026-03-22 14:48:41');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'de0929bb-4785-4e98-90ef-f72e4fb52164', NULL, '46c36cee-fe3a-43a7-a323-d286ac10eee0', 'debit', 'codes', 1, 'transfer_out', NULL, '2026-04-03 16:08:41');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'de0929bb-4785-4e98-90ef-f72e4fb52164', NULL, '685e87dd-3217-4a59-95e7-3f9cc8626009', 'credit', 'codes', 1, 'transfer_in', NULL, '2026-04-03 16:08:41');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'b60fa7db-e3b9-49fe-837e-f0c88c6a8f88', NULL, '685e87dd-3217-4a59-95e7-3f9cc8626009', 'debit', 'codes', 1, 'transfer_out', NULL, '2026-04-03 16:36:44');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES (NULL, 'b60fa7db-e3b9-49fe-837e-f0c88c6a8f88', NULL, '46c36cee-fe3a-43a7-a323-d286ac10eee0', 'credit', 'codes', 1, 'transfer_in', NULL, '2026-04-03 16:36:45');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('c60c5f91-e8bd-4d92-a805-aef76a18c0ee', '2bfa8dbe-af92-4b81-ba2f-8fef4d3c3081', NULL, '3b492980-54ed-46a3-9704-c6896deabdd0', 'credit', 'codes', 20, 'SEED_ALICE', '{}', '2026-04-05 20:15:38');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('af69a978-f426-4511-85c2-2d283b4f4609', '918c323f-5c8e-4fb1-bcb3-db3a3db5be5a', NULL, '3b492980-54ed-46a3-9704-c6896deabdd0', 'credit', 'silver', 5, 'SEED_ALICE', '{}', '2026-04-05 20:15:39');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('71fac9a3-8150-495f-b0a8-96c798d446b3', 'c0b8cb46-c773-43a4-9794-bf2191166f92', NULL, 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'credit', 'codes', 10, 'SEED_BOB', '{}', '2026-04-05 20:15:40');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('8c7ffc3c-fd8c-4f35-9817-8723899eda68', 'ed42d1cb-9706-481a-bd4e-62bcf7d62046', NULL, 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'credit', 'silver', 3, 'SEED_BOB', '{}', '2026-04-05 20:15:41');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('3e1aef39-0e74-4dee-9ec5-35b7766eb2d9', 'd3f3dd22-a2b3-4522-a4f7-53f922312eef', NULL, 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'credit', 'gold', 1, 'SEED_BOB', '{}', '2026-04-05 20:15:42');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('f16c608a-db63-4632-991b-82930a039ee6', 'd931553a-252f-48cb-bc72-67519c79edd2', NULL, 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'debit', 'codes', 10, 'QARSAN_STOLEN', '{"op": "qarsan_steal", "actor": "3b492980-54ed-46a3-9704-c6896deabdd0", "target": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "asset": "codes"}', '2026-04-05 20:15:48');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('4d59df16-dba8-4e8f-b8c7-481d9ed8df56', 'd931553a-252f-48cb-bc72-67519c79edd2', NULL, '3b492980-54ed-46a3-9704-c6896deabdd0', 'credit', 'codes', 10, 'QARSAN_STEAL_GAIN', '{"op": "qarsan_steal", "actor": "3b492980-54ed-46a3-9704-c6896deabdd0", "target": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "asset": "codes"}', '2026-04-05 20:15:48');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('e1990525-8c9f-4094-ab0e-7569183fff49', 'd8bbec83-d3ce-4fed-b065-91414e7daeb7', NULL, 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'debit', 'silver', 3, 'QARSAN_STOLEN', '{"op": "qarsan_steal", "actor": "3b492980-54ed-46a3-9704-c6896deabdd0", "target": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "asset": "silver"}', '2026-04-05 20:15:51');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('ff09776b-bd92-4071-8310-4c1a6659659f', 'd8bbec83-d3ce-4fed-b065-91414e7daeb7', NULL, '3b492980-54ed-46a3-9704-c6896deabdd0', 'credit', 'silver', 3, 'QARSAN_STEAL_GAIN', '{"op": "qarsan_steal", "actor": "3b492980-54ed-46a3-9704-c6896deabdd0", "target": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "asset": "silver"}', '2026-04-05 20:15:51');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('76ca1a7b-fce5-47e9-883d-4b9b202939c0', 'd74ca45a-f26e-4c18-8225-2761e7616097', NULL, 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'debit', 'gold', 1, 'QARSAN_STOLEN', '{"op": "qarsan_steal", "actor": "3b492980-54ed-46a3-9704-c6896deabdd0", "target": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "asset": "gold"}', '2026-04-05 20:15:52');
INSERT OR IGNORE INTO "ledger" ("id", "tx_id", "tx_hash", "user_id", "direction", "asset_type", "amount", "reference", "meta", "created_at") VALUES ('cbd73071-1830-474e-b2ea-76ae297fe36a', 'd74ca45a-f26e-4c18-8225-2761e7616097', NULL, '3b492980-54ed-46a3-9704-c6896deabdd0', 'credit', 'gold', 1, 'QARSAN_STEAL_GAIN', '{"op": "qarsan_steal", "actor": "3b492980-54ed-46a3-9704-c6896deabdd0", "target": "fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb", "asset": "gold"}', '2026-04-05 20:15:52');

-- ────────────────────────────────────────────────────────────
-- TABLE: ledger_events  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "ledger_events";
CREATE TABLE ledger_events (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       event_type TEXT NOT NULL,
       asset_type TEXT NOT NULL,
       amount INTEGER NOT NULL,
       metadata TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );


-- ────────────────────────────────────────────────────────────
-- TABLE: pebalaash_orders  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "pebalaash_orders";
CREATE TABLE pebalaash_orders (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      product_id   INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'codes',
      amount_paid  INTEGER NOT NULL,
      price_codes  INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'completed',
      customer_info JSONB,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "pebalaash_orders" ("id", "user_id", "product_id", "product_name", "payment_type", "amount_paid", "price_codes", "status", "customer_info", "created_at") VALUES ('c06d1f3a-4fe8-4002-8bf1-e014725aaaf8', '46c36cee-fe3a-43a7-a323-d286ac10eee0', 1, 'Test Gift Bundle', 'codes', 50, 50, 'completed', '{"name":"Dia Ahmed","address":"123 Test St","city":"Cairo","country":"Egypt","phone":"+201234567890"}', '2026-04-06 08:28:25');

-- ────────────────────────────────────────────────────────────
-- TABLE: pebalaash_ratings  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "pebalaash_ratings";
CREATE TABLE pebalaash_ratings (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, product_id)
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: pebalaash_wallet_items  (2 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "pebalaash_wallet_items";
CREATE TABLE pebalaash_wallet_items (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        order_id     TEXT NOT NULL,
        product_id   INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        image_url    TEXT,
        status       TEXT NOT NULL DEFAULT 'pending',
        from_gift    INTEGER NOT NULL DEFAULT 0,
        gifted_from  TEXT,
        gift_note    TEXT,
        acquired_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

INSERT OR IGNORE INTO "pebalaash_wallet_items" ("id", "user_id", "order_id", "product_id", "product_name", "image_url", "status", "from_gift", "gifted_from", "gift_note", "acquired_at", "updated_at") VALUES ('87687f32-f275-42c6-bf01-d3fb1151a0e5', '46c36cee-fe3a-43a7-a323-d286ac10eee0', 'c06d1f3a-4fe8-4002-8bf1-e014725aaaf8', 1, 'Test Gift Bundle', NULL, 'gifted', 0, NULL, NULL, '2026-04-06 08:28:25', '2026-04-06 08:28:45');
INSERT OR IGNORE INTO "pebalaash_wallet_items" ("id", "user_id", "order_id", "product_id", "product_name", "image_url", "status", "from_gift", "gifted_from", "gift_note", "acquired_at", "updated_at") VALUES ('d902a729-6473-4a4f-a1db-4b331f915fb9', '93c35895-bc77-4f52-ae95-6f6d69cd797d', 'c06d1f3a-4fe8-4002-8bf1-e014725aaaf8', 1, 'Test Gift Bundle', NULL, 'pending', 1, '46c36cee-fe3a-43a7-a323-d286ac10eee0', 'Happy gifting! 🎁 From the test suite', '2026-04-06 08:28:45', '2026-04-06 08:28:45');

-- ────────────────────────────────────────────────────────────
-- TABLE: processed_transactions  (2 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "processed_transactions";
CREATE TABLE processed_transactions (
      tx_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "processed_transactions" ("tx_id", "created_at") VALUES ('de0929bb-4785-4e98-90ef-f72e4fb52164', '2026-04-03 16:08:40');
INSERT OR IGNORE INTO "processed_transactions" ("tx_id", "created_at") VALUES ('b60fa7db-e3b9-49fe-837e-f0c88c6a8f88', '2026-04-03 16:36:43');

-- ────────────────────────────────────────────────────────────
-- TABLE: products  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "products";
CREATE TABLE products (
        id           INTEGER PRIMARY KEY,
        name         TEXT NOT NULL,
        description  TEXT,
        price_codes  INTEGER NOT NULL DEFAULT 0,
        image_url    TEXT,
        category_id  INTEGER,
        stock        INTEGER NOT NULL DEFAULT 0,
        sold_count   INTEGER NOT NULL DEFAULT 0,
        avg_rating   REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        country_code TEXT DEFAULT 'ALL',
        created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

INSERT OR IGNORE INTO "products" ("id", "name", "description", "price_codes", "image_url", "category_id", "stock", "sold_count", "avg_rating", "rating_count", "country_code", "created_at") VALUES (1, 'Test Gift Bundle', '', 50, '', NULL, 98, 1, 0.0, 0, 'ALL', '2026-04-06 08:22:41');

-- ────────────────────────────────────────────────────────────
-- TABLE: qarsan_dog_notifications  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "qarsan_dog_notifications";
CREATE TABLE qarsan_dog_notifications (
  id          TEXT PRIMARY KEY,
  from_user   TEXT NOT NULL,
  to_user     TEXT NOT NULL,
  message     TEXT,
  seen        INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX idx_notif_created ON qarsan_dog_notifications (created_at)
;
CREATE INDEX idx_notif_seen ON qarsan_dog_notifications (seen)
;
CREATE INDEX idx_notif_to_user ON qarsan_dog_notifications (to_user);


-- ────────────────────────────────────────────────────────────
-- TABLE: qarsan_state  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "qarsan_state";
CREATE TABLE qarsan_state (
       user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
       mode TEXT DEFAULT 'OFF',
       wallet_balance INTEGER DEFAULT 0,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );


-- ────────────────────────────────────────────────────────────
-- TABLE: qarsan_steal_log  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "qarsan_steal_log";
CREATE TABLE qarsan_steal_log (
  id            TEXT PRIMARY KEY,
  actor_id      TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  codes_stolen  INTEGER NOT NULL DEFAULT 0,
  silver_stolen INTEGER NOT NULL DEFAULT 0,
  gold_stolen   INTEGER NOT NULL DEFAULT 0,
  wallet_stolen INTEGER NOT NULL DEFAULT 0,
  total_stolen  INTEGER NOT NULL DEFAULT 0,
  tx_id         TEXT,
  created_at    DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX idx_steal_log_actor ON qarsan_steal_log (actor_id)
;
CREATE INDEX idx_steal_log_created ON qarsan_steal_log (created_at);
CREATE INDEX idx_steal_log_target ON qarsan_steal_log (target_id);

INSERT OR IGNORE INTO "qarsan_steal_log" ("id", "actor_id", "target_id", "codes_stolen", "silver_stolen", "gold_stolen", "wallet_stolen", "total_stolen", "tx_id", "created_at") VALUES ('3f13ff14-7023-4868-817f-8a796ec517d9', '3b492980-54ed-46a3-9704-c6896deabdd0', 'fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 10, 3, 1, 0, 14, '5b43c489-ab55-427b-aa8b-facaa305fe35', '2026-04-05 20:15:53');

-- ────────────────────────────────────────────────────────────
-- TABLE: qarsan_steal_rate_limit  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "qarsan_steal_rate_limit";
CREATE TABLE qarsan_steal_rate_limit (
  actor_id      TEXT NOT NULL,
  last_steal_at DATETIME NOT NULL,
  PRIMARY KEY (actor_id)
);

INSERT OR IGNORE INTO "qarsan_steal_rate_limit" ("actor_id", "last_steal_at") VALUES ('3b492980-54ed-46a3-9704-c6896deabdd0', '2026-04-05 20:15:53');

-- ────────────────────────────────────────────────────────────
-- TABLE: qarsan_virtual_users  (5 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "qarsan_virtual_users";
CREATE TABLE qarsan_virtual_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      dog_state TEXT,
      qarsan_mode TEXT DEFAULT 'OFF',
      balance INT DEFAULT 0,
      qarsan_wallet INT DEFAULT 0,
      last_fed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "qarsan_virtual_users" ("id", "email", "name", "dog_state", "qarsan_mode", "balance", "qarsan_wallet", "last_fed_at", "created_at") VALUES ('b30a87a8-3292-45f1-bb0d-a3740df5d0b7', 'bot1@qarsan.ai', 'Qarsan Bot 1', 'SLEEPING', 'RANGED', 150, 50, '2026-03-20 12:26:59', '2026-03-21 14:26:59');
INSERT OR IGNORE INTO "qarsan_virtual_users" ("id", "email", "name", "dog_state", "qarsan_mode", "balance", "qarsan_wallet", "last_fed_at", "created_at") VALUES ('8caf15ee-6d67-4187-97c4-ce78285fbb13', 'bot2@qarsan.ai', 'Qarsan Bot 2', 'ACTIVE', 'OFF', 200, 0, '2026-03-20 12:26:59', '2026-03-21 14:26:59');
INSERT OR IGNORE INTO "qarsan_virtual_users" ("id", "email", "name", "dog_state", "qarsan_mode", "balance", "qarsan_wallet", "last_fed_at", "created_at") VALUES ('01ce27c2-990f-4083-9394-c234ab1f9fb2', 'trap.user@qarsan.ai', 'Trap User', 'ACTIVE', 'EXPOSURE', 300, 100, '2026-03-20 12:26:59', '2026-03-21 14:26:59');
INSERT OR IGNORE INTO "qarsan_virtual_users" ("id", "email", "name", "dog_state", "qarsan_mode", "balance", "qarsan_wallet", "last_fed_at", "created_at") VALUES ('593bb51c-2fe5-41c9-b66c-3928cefb6eab', 'decoy@qarsan.ai', 'Decoy Account', 'SLEEPING', 'EXPOSURE', 120, 20, '2026-03-20 12:26:59', '2026-03-21 14:26:59');
INSERT OR IGNORE INTO "qarsan_virtual_users" ("id", "email", "name", "dog_state", "qarsan_mode", "balance", "qarsan_wallet", "last_fed_at", "created_at") VALUES ('7dc39efb-bffb-4eca-992f-9035a14343c8', 'honeypot@qarsan.ai', 'Honey Pot', 'SLEEPING', 'RANGED', 80, 40, '2026-03-20 12:26:59', '2026-03-21 14:26:59');

-- ────────────────────────────────────────────────────────────
-- TABLE: qr_link_tokens  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "qr_link_tokens";
CREATE TABLE qr_link_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: reward_events  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "reward_events";
CREATE TABLE reward_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      meta TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "reward_events" ("id", "user_id", "amount", "type", "meta", "created_at") VALUES ('db46343e-dbd8-477a-8afb-5b5cbdbc22ee', '46c36cee-fe3a-43a7-a323-d286ac10eee0', -50, 'asset', '{"type":"pebalaash_purchase","orderId":"c06d1f3a-4fe8-4002-8bf1-e014725aaaf8","productId":1,"productName":"Test Gift Bundle","paymentType":"codes","customerName":"Dia Ahmed"}', '2026-04-06 08:28:24');

-- ────────────────────────────────────────────────────────────
-- TABLE: samma3ny_songs  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "samma3ny_songs";
CREATE TABLE samma3ny_songs (
      id TEXT PRIMARY KEY,
      name TEXT,
      position INTEGER,
      metadata TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: service_mirrors  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "service_mirrors";
CREATE TABLE service_mirrors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        service TEXT NOT NULL,
        codes INTEGER DEFAULT 0,
        silver INTEGER DEFAULT 0,
        gold INTEGER DEFAULT 0,
        last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, service)
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: session_state  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "session_state";
CREATE TABLE session_state (
      user_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "session_state" ("user_id", "state_json", "updated_at") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', '{"extraModeActive":false,"soundMuted":false,"codeDisplay":"WX4Z-64WC-MW89-8T9U-QK8U-9WSL-P4","extraCodeBar":"","activeSection":"home","updatedAt":1775405919438}', '2026-04-05 16:18:40');

-- ────────────────────────────────────────────────────────────
-- TABLE: sessions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "sessions";
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER DEFAULT (unixepoch()), expires_at INTEGER);


-- ────────────────────────────────────────────────────────────
-- TABLE: shots  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "shots";
CREATE TABLE shots (
      id           SERIAL PRIMARY KEY,
      shot_uid     TEXT UNIQUE NOT NULL,
      image_data   TEXT NOT NULL,
      track_title  TEXT,
      campaign_url TEXT,
      user_hint    TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
      email_sent   BOOLEAN NOT NULL DEFAULT FALSE
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: sync_events  (2 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "sync_events";
CREATE TABLE sync_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      delta_codes INT DEFAULT 0,
      delta_silver INT DEFAULT 0,
      delta_gold INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "sync_events" ("id", "user_id", "delta_codes", "delta_silver", "delta_gold", "created_at") VALUES ('ef87aaeb-c40b-bd45-08aa-48c8c43ba197', '5210eb01-c83d-454a-8fa7-a19ad172467c', 72, 0, 0, '2026-03-08 19:10:42');
INSERT OR IGNORE INTO "sync_events" ("id", "user_id", "delta_codes", "delta_silver", "delta_gold", "created_at") VALUES ('227b4a81-6ba2-12b9-d063-46a13ac07e5d', '5210eb01-c83d-454a-8fa7-a19ad172467c', 72, 0, 0, '2026-03-08 19:10:42');

-- ────────────────────────────────────────────────────────────
-- TABLE: transactions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "transactions";
CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(id),
      receiver_id TEXT NOT NULL REFERENCES users(id),
      asset_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: used_codes  (71 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "used_codes";
CREATE TABLE used_codes (
      code_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('bcdf4e82aaf26fc200a40befa7e578d5544a27b977144936c995a4e385da7f3d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-08 19:10:41');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('9db7521666735e4407397265641346717d6298a33cb0f2f12fabc494e3d5702e', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 18:03:59');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('42008397c596b39c9e2ec396c7bd813e6045f7e618147bbf842f9011f1f2ef84', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 18:07:25');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('20a6979095cd9a92ccbb5d4f0c6e2347460edc7f02284ca2cf980ef51808080f', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 18:13:55');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('ca9aa117c10c649fe7fe120296bbaa22613a6637d56787f2df33839db950094f', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 18:54:02');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('bf9c13a4ff6e36bc9e0e922b5aa7e83c9bda299e5f6b30ffd8f6780bfc374941', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 18:59:02');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('858d801b444ac7aa332982ed2df4170d8950d6960d817041872d0124911907f8', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:04:02');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('2135b8a0b9583431503c7c77a228adcb92d473c631f7550755a1d9e780aac610', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:09:02');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('de329b5c2fabf067a2594eb116bd631181ae07297ad22584389b3f8bf0d51428', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:14:32');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('a0fb257270b12b6986df43770def699d5d2a312a9bf0aa61b8987823b6fb5e4e', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:19:32');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c34a0a81b66127621ea4cb5614fdcabc95327fab35596cb531136846881b8968', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:25:03');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('e317bb325ac05509b09ba71b6c197b1b33beb053b7263844a38fc1588ae79232', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:30:32');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('5b1414adf0447ce3f874dfbf20d4745869eaaaf7b3febd92be2138d9170134ea', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:48:05');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('9c40391f641497f1ec24e1a220dbf6b14ee2737c82affe3a6b5263ad6fb0fc9d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 19:57:20');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('179e39b40b068c616368aeab76d3849b20f9b3549d08fa5a5cfb0aa376543048', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:07:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('0e85aa97921205f9ba1cf939eccc5cd8c0b9ac2a12650d52235e9d6e2f6595da', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:13:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('05c9000a66697a9d9ac00c0bd3b6384e0ca3bb353518ba67d1f3116374b78df9', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:18:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('161195af61ac3e34b5a87a98230c3407df584e9da2d4f2cce1d0abd7ffa1146a', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:24:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('f150c7974accf0400aa216cfa7a331eb858cafb7855334eb0082a4e3a4a3ea8a', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:29:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('a4128c7591884856519f947b9519e3302083dad3b8f113aa90b7beb9dbfc65ac', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:34:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('4821f290bfabfe7dd7f5d5e3a24fab0b58da5a47a4fbd0606294817702505922', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:40:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('e10d8dd69e03fa6fa98ad43e24565dfecaeb7540166aad6b091230f8c329dea2', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:45:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('3f029479309fd90811094d78adfa7658a51b215c5b76bfec674185821eaa9dfb', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:50:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('5d17c92aa3ba1696e2794d7dbda2f6459ac0dd6a559ce25e91f2281558d7215d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 20:55:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('fcce5f7b86b74d7c31336e97cd7d901f911f91d3ae51d84c5172fbd96bcdcf80', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:00:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('e9be006bd65e731bf2d966b7dae88bbbbdcba5f05aa154d76b715bb44813e7d3', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:05:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('051a374d1715d8641e7bfea045a3965fdb526464e1f068105ba9d4b60deeee46', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:10:56');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('174ec555063bec2d00b5df5acf684a3da4beca469a39b99544d05cdf39b04f12', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:16:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('6ada7ae9d88aa45ff8083ee1c54860f3701929d4fa563f64ce326426c1631afd', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:21:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('73c2ae01cb6b72564016e2d2db79f7e1e791571cbd7b158ae2bcddc5cd2451e3', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:26:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('8e90f6c1e41b02c618e65792fd2680ce4e2c3b069b7228081d1c9881c59c5379', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:31:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('9bfb23ee7ae132f847bcfe272ab5caaf19c6c2927bf4b13642767dcd5f22c290', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:37:23');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('20d8a18809344617ce4df68fc3310e2bd097ca740220ad0f9043ef36a4c73bee', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:42:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c138d172bdc32b5c64cc4b5f9814b39bd587a5e2d7211cd57a1610e2114c7f34', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:47:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('9f9d31782604f3120f917ad51170592a32ad0aa92c6ed8eb0e2aa9f5c47885cc', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:53:25');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('3426d14c54dfcd047edfe020090da2830381d44aea0b705d1db0d453b155487b', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 21:58:53');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('10c72fd47bc1d1b968731cb08221cf8b890245a20dab899df927972d44a53610', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:04:10');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('62a70d1b590aa116e8fa48d53934c5d0300a3ddec317422c56f168e28a9db6c0', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:09:10');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('2f925a8c6ef860b16f559b884f4609ec372b0fbf9d957a06b578437156afb096', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:15:10');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c5ee67065590cb12d4610f6dceb49f6472a86729f40e4b68b22ede475bc2f27b', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:20:09');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c7940f6e7fceb7ae4071f1503f60cc70ed18166ca53cd7af9d31c1b9df694e2b', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:26:09');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('cf8c0104cbd065316d98f46e7c407604ab051cca182520037f925d4505c3d2ab', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:31:50');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('16d6d75d3c52beb283d3c084cf43b5785bc725458e94360999ced58f0effe3cc', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 22:37:25');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('92d82f38cded6078812e939fcd70f1ec59665b545583dda1a07ddc47c5eccf4c', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:06:51');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('75a5114a80d251221c56f066981dd3805ac8c5aded23ba25dc713cf0efc4a880', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:12:21');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('1eeceacbe8dc4d8c4d3e9d19c0ac01c4526600dc9e46fb23001afb0251571787', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:17:21');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('16112ab2c8a5410547d7d69e22efef597a6bde99666dbf08c5ae52dd5d876298', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:22:22');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c8f42721d534eb09e1d19bda160ab60c8b9d3db40da850ec1418722c0d382cd4', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:27:26');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('8c98ff6c3a63b3685f085b086a861441a9405131da4710bc9aa14b0a846761cf', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:32:58');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('329b863c3113b9f617b3eb9094da1db49394af5f9aa75c308d8f3b20a5f6dcc8', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:38:30');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('5c7ce8ce7c4e7ac32edc4cf57402d72ce1927ab4c6fa7a90e2d811f9ab0e93a8', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:43:36');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('2f945dae196bd00b99fd9af32b8b3660be4fd9795119a294bd59f092410ca370', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:48:57');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('14ccbec6eeb239901af192e5367de7556af700dac568d0714f000c7690c93c7d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:53:59');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('0bd12e2872ed714c7f60792c401c76588e2acf3d265d64eeb7c9cc9eeb0bdd85', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-21 23:59:26');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('b0824b0f5b1d18058261c027603ea21d9cd6df7d2468f9a8ce17fae121637a0d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 00:04:57');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('7653f9c9780139e13833555306dd8e6558a3d61cd0c645c73d6632938abf08c1', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 00:10:08');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('dbeeb370abd7472e1c0c7b139916e1c04e61f5e857b8a35888a0b64e6f7e3cfc', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 00:12:34');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('5596beb402904260392e1965e64670e2b90f609ff4c35e0b3b8ee9acf08dfee6', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 01:48:39');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('2c8f9ea191491a97a33b1966465b74701209e7ef97830af91cf11a0da59c3bf3', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 01:54:12');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('dc0bf0375c896940216c6b2780a1500ab51ae8f792951306079238c37ea2ec60', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 01:59:22');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('1a57fc3540e87e101eadcd78e0c2fd0f622a32a3dab8c512a5b98b4afd463f88', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 02:04:28');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('63a2f74ed696eceb83a54846cf5ad9db07fe5dfb226d247303917ab28a27658d', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 02:09:39');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('7c183d027e8ddaa4859e71d1fe25df01ac17cbe1cba548c6d417d41c68e81a64', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 02:15:11');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('25ff4f6f85f8a34a6062f9f0c6319d8bf47bb70444e46496073f8cb1beafc4ca', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 02:20:41');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c1bfff161cb95a38b86ff397842b9fc228ff82471c39bbffa3b38e75a1f87782', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 11:22:51');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('6f716afdff19bda8f0e58fc625cadf55a29dda6b985d5c5f06dd20eb7fcf51d1', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 11:27:58');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('65bab458a2dd4ca3a051b48eb7c2e46bdcd562358456d3743f7ef8612a301e97', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 11:33:07');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('a9d1f65ba0c7b40b30f9efc5835e8d1c48d317624d1846ed76b20f30a5e044e7', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 13:58:42');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('e2ea84fa4df9f0b1c0de2603d685734c4879df9a197c08187783ec2bbb840323', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 14:41:15');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('00c8e72a326857645ea3b30ff21671d73b5f9fb91fe9636b1b05eacf5d4a9051', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 14:42:33');
INSERT OR IGNORE INTO "used_codes" ("code_hash", "user_id", "used_at") VALUES ('c59359967c68044b018a14aab2120b245a798247f457cef769abab3739b98ebc', '5210eb01-c83d-454a-8fa7-a19ad172467c', '2026-03-22 14:48:40');

-- ────────────────────────────────────────────────────────────
-- TABLE: user_assets  (11 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "user_assets";
CREATE TABLE user_assets (
      user_id TEXT NOT NULL, 
      asset_id TEXT NOT NULL, codes_count INTEGER DEFAULT 0, silver_balance INTEGER DEFAULT 0, gold_balance INTEGER DEFAULT 0, version INTEGER DEFAULT 1, 
      PRIMARY KEY(user_id, asset_id)
    );

INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('d64317c1-ed96-4ac4-8a75-46cf48180e05', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('5210eb01-c83d-454a-8fa7-a19ad172467c', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('52d35cc0-17f7-4e81-a5f9-10cd389ea40c', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('67b9100c-fe51-44e3-a291-a7686228953c', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('685e87dd-3217-4a59-95e7-3f9cc8626009', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('16292c0f-968e-437e-8505-4833a3b3c078', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('3d8ee4be-e4c6-4436-8ad0-486f1f332661', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('c9d56f8c-ed76-4991-8ef0-02acbfc5ee56', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('f59de3db-6f56-4e8a-8a58-8f964f095823', 'init', 0, 0, 0, 1);
INSERT OR IGNORE INTO "user_assets" ("user_id", "asset_id", "codes_count", "silver_balance", "gold_balance", "version") VALUES ('93c35895-bc77-4f52-ae95-6f6d69cd797d', 'init', 0, 0, 0, 1);

-- ────────────────────────────────────────────────────────────
-- TABLE: user_rewards  (1 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "user_rewards";
CREATE TABLE user_rewards (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO "user_rewards" ("user_id", "balance", "last_updated") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', 450, '2026-04-06 08:28:24');

-- ────────────────────────────────────────────────────────────
-- TABLE: user_sessions  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "user_sessions";
CREATE TABLE user_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT UNIQUE NOT NULL,
      user_id      TEXT NOT NULL,
      device_type  TEXT,
      device_name  TEXT,
      ip_address   TEXT,
      is_active    BOOLEAN DEFAULT TRUE,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active  DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at     DATETIME
    );

CREATE INDEX idx_user_sessions_session ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);


-- ────────────────────────────────────────────────────────────
-- TABLE: users  (20 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "users";
CREATE TABLE users (
      id TEXT PRIMARY KEY, 
      email TEXT UNIQUE, 
      username TEXT UNIQUE,
      user_type TEXT DEFAULT 'user',
      password_hash TEXT,
      codes_count INT DEFAULT 0,
      silver_count INT DEFAULT 0,
      gold_count INT DEFAULT 0,
      last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_sync_hash TEXT,
      is_untrusted BOOLEAN DEFAULT 0,
      flagged_reason TEXT
    , religion TEXT, country TEXT, phone TEXT);

INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('d64317c1-ed96-4ac4-8a75-46cf48180e05', 'test@example.com', NULL, 'user', '$2b$08$upeP9yxDCau4JOCFzEDWbep7tqYsdVGfDWjPGhtwbMp4UovIaeRdm', 0, 0, 0, '2026-03-08 17:46:45', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('5210eb01-c83d-454a-8fa7-a19ad172467c', 'drd2020@gmail.com', NULL, 'user', '$2b$08$1PKLHjYN3honm1rsRi/34.yjQssZ6ascGliIcTXobpV5AgqcVLVHO', 215, 0, 0, '2026-03-22 14:48:40', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', 'dia201244@gmail.com', 'dodo', 'user', '$2b$10$jj7zRFM0pudh1rh8S4lu4.vcMzuyVUv52poZn8e7RyGTC4nEUuXnK', 0, 2, 0, '2026-04-03 15:36:45', NULL, 0, NULL, 'Islam', 'AE', '+971525883540');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('52d35cc0-17f7-4e81-a5f9-10cd389ea40c', 'test_1774447239081@test.com', 'testuser_1774447239081', 'user', '$2b$10$/f9exWCKcqll36Bzjx2elu0q3h/uFK5DG3XHn6/jqJi6zmbhvw0.K', 0, 0, 0, '2026-03-25 14:00:41', NULL, 0, NULL, 'Other', 'US', '+11234567890');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('48fe846d-7204-4f7b-b4b7-a378470902d6', 'test1774905379699@example.com', 'testuser1774905379699', 'user', '$2a$10$JvfTXOccftl66Tkg020Kh.TxTsTWgccLnCSGTozYY6pFiYtGNDvtu', 0, 0, 0, '2026-03-30 21:16:20', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('857a610a-3707-4410-a538-e657f8b117df', 'test1774905564158@example.com', 'testuser1774905564158', 'user', '$2a$10$vhwjKyFnxzD.P0rB9cHKZOvvSPhNRj4U.EKv2TvbK9DJtrcmJISI.', 0, 0, 0, '2026-03-30 21:19:25', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('f36573b7-befa-4fde-8168-1455921ddb10', 'test1774905625066@example.com', 'testuser1774905625066', 'user', '$2a$10$SDyHKSd6vN89As0E/YxiF.XEYb5.qf1br48YOFeMSIbuOt..l/zHC', 0, 0, 0, '2026-03-30 21:20:25', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('fb763bec-7330-40f9-aa2e-ffe0a328169d', 'test1774906167653@example.com', 'testuser1774906167653', 'user', '$2a$10$Y2HK7vs7NtJ.WY5pS2ygTu4lMPQ.gNCEWuoLqAzJllpVVqHP5YksG', 0, 0, 0, '2026-03-30 21:29:28', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('55dc9e00-d14a-4c5d-8996-5561059c7b81', 'test1774908733846@example.com', 'testuser1774908733846', 'user', '$2a$10$VmyHc1zxvA8wWBkLIFPm/e1DrtlcyRKbj9tZ6bvWoQtnhUC/YOJm2', 0, 0, 0, '2026-03-30 22:12:14', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('65079e2e-6145-472f-b0b7-eeab9f99f9d3', 'test1774908958021@example.com', 'testuser1774908958021', 'user', '$2a$10$Z/DnIA9iAeBlF7FRTQMOq.PTmZXQWwlfHCvRgZj2ubwRqpg3YE2M2', 0, 0, 0, '2026-03-30 22:16:00', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('4c80b58b-1513-424e-b12b-61cfac623187', 'test1774909696691@example.com', 'testuser1774909696691', 'user', '$2a$10$wLPVP7jrpCxM05qvVXRdT.Xea37RvAQyIutx8AU/a8aao2.EKsxdu', 0, 0, 0, '2026-03-30 22:28:21', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('67b9100c-fe51-44e3-a291-a7686228953c', 'usdaccbyvpn@gmail.com', 'Drd20', 'user', '$2b$10$POWz/9qE.Y/IqWWyq9.oSOl/S3ZfMULo8qk8MkbjvH3qf0Eionbg6', 0, 0, 0, '2026-04-03 12:40:40', NULL, 0, NULL, 'Islam', 'AF', '+971522622049');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('685e87dd-3217-4a59-95e7-3f9cc8626009', 'dia2020@gmail.com', 'dia2020', 'user', '$2b$10$Ls6jFOGebDHfERHCvNBoxO3u8rziVRHBCCAL6UJkj4KGZRxBNXr9m', 0, 0, 0, '2026-04-03 15:34:22', NULL, 0, NULL, 'Islam', 'EG', '01000000000');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('16292c0f-968e-437e-8505-4833a3b3c078', 'test@dogtest.com', 'dogtest123', 'user', '$2b$10$lOB9T8i6MlHyqrpUOq87o.o5vwSfsFmWOgtutst1rdH84gPHPVgY.', 0, 0, 0, '2026-04-04 04:54:40', NULL, 0, NULL, 'Other', 'AF', '+9300000000000');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('3d8ee4be-e4c6-4436-8ad0-486f1f332661', 'dog@test.com', 'dogtest', 'user', '$2b$10$TxDbiZYESBZ8BZ8XRDLbMeUl9triuH25K8m/R81NQrPEBFEyHh9gG', 0, 0, 0, '2026-04-04 05:01:52', NULL, 0, NULL, 'Other', 'AF', '+9300000000000');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('c9d56f8c-ed76-4991-8ef0-02acbfc5ee56', 'quickdog@test.com', 'QuickDog', 'user', '$2b$10$BegpeuGIz/3lJLjoSPPD9.oz322Dx7lyGo.YZNp5FoAVCYzh9ouky', 0, 0, 0, '2026-04-04 05:29:02', NULL, 0, NULL, 'Other', 'Australia', '+610400000000');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('f59de3db-6f56-4e8a-8a58-8f964f095823', 'dia2027@gmail.com', 'Dodi', 'user', '$2b$10$PXv0pOehn/6VmpDnzyQ24eJZugevp0BqzVKmZNaGxAGZGV2VPxfuy', 0, 0, 0, '2026-04-04 14:03:03', NULL, 0, NULL, 'Islam', 'AF', '+930000000');
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('3b492980-54ed-46a3-9704-c6896deabdd0', 'alice@test.qarsan', 'Alice_Thief', 'user', NULL, 0, 0, 0, '2026-04-05 20:15:36', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'bob@test.qarsan', 'Bob_Victim', 'user', NULL, 0, 0, 0, '2026-04-05 20:15:36', NULL, 0, NULL, NULL, NULL, NULL);
INSERT OR IGNORE INTO "users" ("id", "email", "username", "user_type", "password_hash", "codes_count", "silver_count", "gold_count", "last_sync_at", "last_sync_hash", "is_untrusted", "flagged_reason", "religion", "country", "phone") VALUES ('93c35895-bc77-4f52-ae95-6f6d69cd797d', 'pebalaash.tester2@drmail.test', 'TestRecipient', 'user', '$2b$10$UtcYlvqd2CgCn2kjYHP.l.tvd3zDZRvTNUkOcfRG454zgA3eQWhEq', 0, 0, 0, '2026-04-06 08:10:30', NULL, 0, NULL, 'Islam', 'EG', '+201000000001');

-- ────────────────────────────────────────────────────────────
-- TABLE: users_profiles  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "users_profiles";
CREATE TABLE users_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: wallets  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "wallets";
CREATE TABLE wallets (
      user_id TEXT PRIMARY KEY,
      codes BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: watchdog_state  (5 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "watchdog_state";
CREATE TABLE watchdog_state (
       user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
       dog_state TEXT DEFAULT 'ACTIVE',
       last_fed_at DATETIME,
       is_frozen BOOLEAN DEFAULT 0,
       frozen_reason TEXT,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );

INSERT OR IGNORE INTO "watchdog_state" ("user_id", "dog_state", "last_fed_at", "is_frozen", "frozen_reason", "updated_at") VALUES ('3d8ee4be-e4c6-4436-8ad0-486f1f332661', 'SLEEPING', '2026-04-03 04:05:20', 0, NULL, '2026-04-04 05:05:20');
INSERT OR IGNORE INTO "watchdog_state" ("user_id", "dog_state", "last_fed_at", "is_frozen", "frozen_reason", "updated_at") VALUES ('c9d56f8c-ed76-4991-8ef0-02acbfc5ee56', 'DEAD', '2026-03-31T05:42:41.441Z', 0, NULL, '2026-04-04 05:42:41');
INSERT OR IGNORE INTO "watchdog_state" ("user_id", "dog_state", "last_fed_at", "is_frozen", "frozen_reason", "updated_at") VALUES ('46c36cee-fe3a-43a7-a323-d286ac10eee0', 'SLEEPING', '2026-04-03 14:07:34', 0, NULL, '2026-04-04 15:07:34');
INSERT OR IGNORE INTO "watchdog_state" ("user_id", "dog_state", "last_fed_at", "is_frozen", "frozen_reason", "updated_at") VALUES ('3b492980-54ed-46a3-9704-c6896deabdd0', 'ACTIVE', '2026-04-05 18:15:43', 0, NULL, '2026-04-05 20:15:43');
INSERT OR IGNORE INTO "watchdog_state" ("user_id", "dog_state", "last_fed_at", "is_frozen", "frozen_reason", "updated_at") VALUES ('fc07b7d9-a18a-4ecd-9110-cd361b1f1bcb', 'DEAD', '2026-04-01 20:15:43', 0, NULL, '2026-04-05 20:15:43');

-- ────────────────────────────────────────────────────────────
-- TABLE: webauthn_credentials  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "webauthn_credentials";
CREATE TABLE webauthn_credentials (
        id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        user_id      TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key   TEXT NOT NULL,
        sign_count   INTEGER DEFAULT 0,
        transports   TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );


-- ────────────────────────────────────────────────────────────
-- TABLE: yahood_homes  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "yahood_homes";
CREATE TABLE yahood_homes (
      user_id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      defense_level INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );


-- ────────────────────────────────────────────────────────────
-- TABLE: yahood_lands  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "yahood_lands";
CREATE TABLE yahood_lands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_meters INTEGER DEFAULT 100,
      price_paid_codes INTEGER NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

CREATE INDEX idx_yahood_lands_location ON yahood_lands(lat, lng);
CREATE INDEX idx_yahood_lands_owner ON yahood_lands(owner_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: yahood_pending_treasures  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "yahood_pending_treasures";
CREATE TABLE yahood_pending_treasures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      asset_type TEXT CHECK(asset_type IN ('codes', 'silver', 'gold')),
      amount INTEGER NOT NULL,
      found_lat REAL NOT NULL,
      found_lng REAL NOT NULL,
      found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'claimed', 'stolen')),
      stolen_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (stolen_by) REFERENCES users(id)
    );

CREATE INDEX idx_yahood_pending_status ON yahood_pending_treasures(status);
CREATE INDEX idx_yahood_pending_user ON yahood_pending_treasures(user_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: yahood_player_locations  (0 rows)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "yahood_player_locations";
CREATE TABLE yahood_player_locations (
      user_id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );


COMMIT;
PRAGMA foreign_keys = ON;


-- ============================================================
-- SUMMARY
-- Tables : 77
-- Total rows backed up: 445
-- ============================================================

-- ============================================================
-- MIGRATION NOTES
-- ============================================================
-- To restore to a NEW SQLite / Turso database:
--   1. Run this entire file via the Turso CLI:
--        turso db shell <new-db-name> < drd2027_backup.sql
--      OR via sqlite3:
--        sqlite3 new.db < drd2027_backup.sql
--
-- To migrate to PostgreSQL:
--   1. Replace: "TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob...)))"
--      with:    "UUID PRIMARY KEY DEFAULT gen_random_uuid()"
--   2. Replace: "INTEGER" autoincrement → "SERIAL"
--   3. Replace: "CURRENT_TIMESTAMP" → "NOW()"
--   4. Remove:  PRAGMA statements
--   5. Replace: INSERT OR IGNORE → INSERT ON CONFLICT DO NOTHING
--   6. Run via psql: psql <connection_string> -f drd2027_backup.sql
--
-- To migrate to PlanetScale / MySQL:
--   1. Replace UUID generation with UUID()
--   2. Replace TEXT → VARCHAR(255) where needed
--   3. Replace BOOLEAN → TINYINT(1)
--
-- To migrate to Neon / Supabase (PostgreSQL-compatible):
--   Follow the PostgreSQL steps above.
--   Neon connection string format:
--   postgresql://user:pass@host.neon.tech/dbname?sslmode=require
-- ============================================================
