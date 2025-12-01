-- =====================================================
-- LICENSE MANAGEMENT - POSTGRESQL FULL SCHEMA
-- =====================================================

BEGIN;

-- UUID ve hash fonksiyonları için (gen_random_uuid vs.)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- LICENSE ANA TABLO
-- =====================================================

CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    license_type        VARCHAR(50) NOT NULL,
    company_name        VARCHAR(150) NOT NULL,
    company_id          VARCHAR(50) NOT NULL,
    customer_email      VARCHAR(150),
    expiry_date         DATE NOT NULL,
    max_users           INT NOT NULL CHECK (max_users > 0),
    max_assets          INT NOT NULL CHECK (max_assets > 0),
    environment         VARCHAR(50) NOT NULL,
    support_level       VARCHAR(50) NOT NULL,
    data_center         VARCHAR(50) NOT NULL,
    license_key_prefix  VARCHAR(50) NOT NULL,

    -- Status yönetimi
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT chk_license_status
        CHECK (status IN ('DRAFT', 'SIGNED', 'EXPIRED', 'REVOKED')),

    -- İmzalama alanları
    license_payload     JSONB,
    payload_hash        VARCHAR(256),
    signature           TEXT,
    version             INT NOT NULL DEFAULT 1,

    -- Audit alanları
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) NOT NULL,
    signed_at           TIMESTAMPTZ,
    signed_by           VARCHAR(100)
);

-- =====================================================
-- LICENSE HISTORY (AUDIT / VERSIYON)
-- =====================================================

CREATE TABLE IF NOT EXISTS license_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id     UUID NOT NULL,
    version        INT NOT NULL,
    status         VARCHAR(20) NOT NULL,
    license_payload JSONB,
    payload_hash   VARCHAR(256),
    signature      TEXT,
    action         VARCHAR(50) NOT NULL,  -- CREATED | SIGNED | UPDATED | REVOKED | EXPIRED
    action_by      VARCHAR(100) NOT NULL,
    action_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_license_history_license
        FOREIGN KEY (license_id)
        REFERENCES licenses (id)
        ON DELETE CASCADE
);

-- =====================================================
-- KULLANICI & ROL YAPISI (AUTH / RBAC)
-- =====================================================

-- Uygulama kullanıcıları
CREATE TABLE IF NOT EXISTS app_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- admin, operator, viewer gibi base role alanı (kolay filtre için)
    base_role       VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Roller (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE, -- ADMIN, OPERATOR, VIEWER
    description VARCHAR(255)
);

-- Kullanıcı-Rol çoktan çoğa ilişkisi
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

-- Permission yapısı (isteğe bağlı genişleyebilir)
CREATE TABLE IF NOT EXISTS permissions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE, -- LICENSE_VIEW, LICENSE_EDIT, USER_MANAGE, ...
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);

-- =====================================================
-- AUTH İÇİN TOKEN / SESSION & LOGIN AUDIT
-- =====================================================

-- Refresh token saklama tablosu
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    token           VARCHAR(500) NOT NULL,
    user_agent      VARCHAR(255),
    ip_address      VARCHAR(50),
    is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE CASCADE
);

-- Login / Logout & başarısız denemeler için audit
CREATE TABLE IF NOT EXISTS login_audit (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID,
    email           VARCHAR(150),
    ip_address      VARCHAR(50),
    user_agent      VARCHAR(255),
    action          VARCHAR(50) NOT NULL, -- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
    message         VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_login_audit_user
        FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE SET NULL
);

-- =====================================================
-- LİSANS & KULLANICI İLİŞKİLERİ
-- =====================================================

-- Belirli lisansın hangi kullanıcılar için geçerli olduğu (opsiyonel)
CREATE TABLE IF NOT EXISTS license_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id  UUID NOT NULL,
    user_id     UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_license_users_license
        FOREIGN KEY (license_id) REFERENCES licenses (id) ON DELETE CASCADE,
    CONSTRAINT fk_license_users_user
        FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE CASCADE,
    CONSTRAINT uq_license_users UNIQUE (license_id, user_id)
);

-- =====================================================
-- INDEXLER
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_licenses_status
    ON licenses (status);

CREATE INDEX IF NOT EXISTS idx_licenses_company_id
    ON licenses (company_id);

CREATE INDEX IF NOT EXISTS idx_license_history_license_id
    ON license_history (license_id);

CREATE INDEX IF NOT EXISTS idx_app_users_email
    ON app_users (email);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_login_audit_user_id
    ON login_audit (user_id);

CREATE INDEX IF NOT EXISTS idx_license_users_license_id
    ON license_users (license_id);

-- =====================================================
-- JOB TARAFINDAN KULLANILACAK VIEW
-- =====================================================

CREATE OR REPLACE VIEW vw_draft_licenses_for_signing AS
SELECT *
FROM licenses
WHERE status = 'DRAFT';

COMMIT;


