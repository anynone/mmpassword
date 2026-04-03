## ADDED Requirements

### Requirement: MMP1 Encryption Pipeline

系统 SHALL 实现与 mmpassword 客户端完全兼容的加密管道。

加密流程 MUST 为：
1. 将 Vault 对象序列化为 UTF-8 JSON（camelCase 字段名）
2. 生成 16 字节随机 Salt（CSPRNG）
3. 生成 12 字节随机 Nonce（CSPRNG）
4. Argon2id 密钥派生：password=共享密码, salt, m_cost=65536, t_cost=3, p_cost=4, output=32字节, version=0x13
5. ChaCha20-Poly1305 AEAD 加密：key=派生密钥, nonce, plaintext=JSON字节
6. 构建二进制：MMP1(4B) + version_u16LE(2B) + reserved_u16LE(2B) + salt(16B) + nonce(12B) + ciphertext+tag(variable)
7. Base64 标准编码返回

#### Scenario: Encrypted output decryptable by client

- **WHEN** 服务端加密一个 Vault 对象并返回 base64 编码
- **THEN** 客户端使用 `decrypt_vault_from_bytes` 能正确解密，得到完全一致的 Vault 结构

#### Scenario: Random salt and nonce per request

- **WHEN** 同一订阅在短时间内被拉取两次
- **THEN** 两次返回的 base64 内容不同（因为 salt 和 nonce 随机生成），但解密后的 Vault 数据相同

### Requirement: Shared Password Configuration

共享密码 SHALL 通过以下优先级获取：
1. 环境变量 `MMP_SUBSCRIPTION_PASSWORD`
2. 配置文件 config.toml 的 `[security].shared_password`
3. 编译时常量默认值

服务端 MUST 在启动时验证共享密码非空。

#### Scenario: Shared password from env var

- **WHEN** 设置环境变量 `MMP_SUBSCRIPTION_PASSWORD=my-secret`
- **THEN** 服务端使用该值作为加密密码

#### Scenario: Shared password from config

- **WHEN** 未设置环境变量但 config.toml 中 `[security].shared_password = "configured-pass"`
- **THEN** 服务端使用配置文件中的值

#### Scenario: Missing shared password

- **WHEN** 环境变量和配置文件都未设置共享密码
- **THEN** 服务端使用编译时默认值（与客户端 `vault_file.rs` 中的常量一致）

### Requirement: Vault JSON Compatibility

服务端生成的 Vault JSON MUST 与客户端 Vault 结构完全兼容。

字段序列化 SHALL 使用 camelCase：id, name, version, description, groups, entries, trash, createdAt, updatedAt。

Entry 序列化：id, title, entryType(websiteLogin/secureNote), groupId, fields, tags, favorite, createdAt, updatedAt, icon。

Field 序列化：name, value, fieldType(text/password/url/email/notes/username), protected。

Group 序列化：id, name, icon, createdAt, updatedAt。

#### Scenario: JSON field naming

- **WHEN** 服务端构建 Vault JSON
- **THEN** 所有字段名使用 camelCase（如 createdAt 而非 created_at），与客户端 `#[serde(rename_all = "camelCase")]` 一致

#### Scenario: Entry type values

- **WHEN** entry_type 为 WebsiteLogin
- **THEN** JSON 中 entryType 值为 "websiteLogin"（camelCase）
