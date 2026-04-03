## ADDED Requirements

### Requirement: Entry CRUD API

系统 SHALL 提供 REST API 管理全局密码条目。

- `POST /api/admin/entries` — 创建条目
- `GET /api/admin/entries` — 列出所有条目
- `GET /api/admin/entries/{id}` — 查询单个条目
- `PUT /api/admin/entries/{id}` — 更新条目
- `DELETE /api/admin/entries/{id}` — 删除条目

每个条目 MUST 包含：id(UUID v4), title, entryType(websiteLogin/secureNote), groupId(可空), fields(JSON数组), tags(JSON数组), favorite(布尔), icon(可空), createdAt, updatedAt。

Field 对象 MUST 包含：name, value, fieldType(text/password/url/email/notes/username), protected(布尔)。

所有管理接口 SHALL 要求 Bearer Token 认证（Authorization header）。

#### Scenario: Create entry with fields

- **WHEN** POST /api/admin/entries with body `{ "title": "GitHub", "entryType": "websiteLogin", "groupId": "uuid-group", "fields": [{"name": "Username", "value": "octocat", "fieldType": "username", "protected": false}, {"name": "Password", "value": "s3cret", "fieldType": "password", "protected": true}], "tags": ["dev"], "favorite": false }`
- **THEN** 返回 201 和创建的条目对象，包含自动生成的 id 和 createdAt/updatedAt 时间戳

#### Scenario: Create entry without group

- **WHEN** POST /api/admin/entries with groupId 为 null 或省略
- **THEN** 创建条目的 groupId 为 null，条目属于"未分组"

#### Scenario: Update entry

- **WHEN** PUT /api/admin/entries/{id} with 部分或全部字段
- **THEN** 更新指定条目，返回更新后的完整条目对象，updatedAt 自动刷新

#### Scenario: Delete entry

- **WHEN** DELETE /api/admin/entries/{id}
- **THEN** 删除条目，同时从所有 subscription_entries junction 表中移除关联记录，返回 204

#### Scenario: List all entries

- **WHEN** GET /api/admin/entries
- **THEN** 返回所有条目列表，每个条目包含完整字段和分组名称

#### Scenario: Unauthorized access

- **WHEN** 任何 /api/admin/ 请求不包含有效 Bearer Token
- **THEN** 返回 401 Unauthorized

### Requirement: Group CRUD API

系统 SHALL 提供 REST API 管理全局分组。

- `POST /api/admin/groups` — 创建分组
- `GET /api/admin/groups` — 列出所有分组
- `PUT /api/admin/groups/{id}` — 更新分组（名称、图标）
- `DELETE /api/admin/groups/{id}` — 删除分组

#### Scenario: Create group

- **WHEN** POST /api/admin/groups with `{ "name": "邮箱", "icon": "mail" }`
- **THEN** 返回 201 和创建的分组对象，包含自动生成的 id(UUID v4)

#### Scenario: Update group name

- **WHEN** PUT /api/admin/groups/{id} with `{ "name": "电子邮件", "icon": "email" }`
- **THEN** 更新分组名称和图标，返回更新后的分组对象

#### Scenario: Delete group with entries

- **WHEN** DELETE /api/admin/groups/{id} 且有 entries 引用该分组
- **THEN** 删除分组，所有关联 entries 的 group_id 设为 NULL（变为"未分组"），返回 204

#### Scenario: Delete group without entries

- **WHEN** DELETE /api/admin/groups/{id} 且无 entries 引用该分组
- **THEN** 直接删除分组，返回 204

### Requirement: Subscription CRUD API

系统 SHALL 提供 REST API 管理订阅链接。

- `POST /api/admin/subscriptions` — 创建订阅
- `GET /api/admin/subscriptions` — 列出所有订阅
- `GET /api/admin/subscriptions/{token}` — 查看订阅详情
- `PUT /api/admin/subscriptions/{token}` — 更新订阅信息（名称、描述、过期时间）
- `DELETE /api/admin/subscriptions/{token}` — 删除订阅
- `POST /api/admin/subscriptions/{token}/refresh` — 刷新令牌（生成新 token）

#### Scenario: Create subscription

- **WHEN** POST /api/admin/subscriptions with `{ "name": "团队共享", "expires_at": "2026-12-31T23:59:59Z" }`
- **THEN** 返回 201，包含自动生成的 token(>=32字符 URL-safe)、完整 URL、名称、创建时间

#### Scenario: Create subscription without expiry

- **WHEN** POST /api/admin/subscriptions with 无 expires_at 字段
- **THEN** 创建永不过期的订阅，expires_at 为 null

#### Scenario: Refresh subscription token

- **WHEN** POST /api/admin/subscriptions/{token}/refresh
- **THEN** 生成新的 token，旧 token 失效，返回新 token 和 URL

#### Scenario: Delete subscription

- **WHEN** DELETE /api/admin/subscriptions/{token}
- **THEN** 删除订阅及 subscription_entries 中的关联记录，返回 204

### Requirement: Subscription Entry Assignment

系统 SHALL 支持通过 PUT 一次性设置订阅包含的条目列表。

`PUT /api/admin/subscriptions/{token}/entries` — 设置订阅包含的条目
`GET /api/admin/subscriptions/{token}/entries` — 获取订阅包含的条目列表

#### Scenario: Set subscription entries

- **WHEN** PUT /api/admin/subscriptions/{token}/entries with `{ "entry_ids": ["id1", "id2", "id3"] }`
- **THEN** 替换订阅的所有条目关联为指定列表，返回 200 和更新后的条目列表

#### Scenario: Clear subscription entries

- **WHEN** PUT /api/admin/subscriptions/{token}/entries with `{ "entry_ids": [] }`
- **THEN** 清空订阅的所有条目关联

#### Scenario: Set with non-existent entry

- **WHEN** PUT 包含不存在的 entry_id
- **THEN** 忽略不存在的 id，只关联存在的条目

### Requirement: Client Subscription Fetch

系统 SHALL 提供无需认证的客户端拉取接口。

`GET /api/sub/{token}` — 客户端获取加密密码库

#### Scenario: Successful fetch

- **WHEN** GET /api/sub/{valid_token} 且订阅未过期
- **THEN** 返回 200，Content-Type: text/plain，Body 为 base64 编码的 .mmp 二进制数据。返回的 Vault 包含订阅选中的所有 entries 及其关联的 groups（去重）。

#### Scenario: Subscription not found

- **WHEN** GET /api/sub/{invalid_token}
- **THEN** 返回 404，Body `{ "error": "subscription not found" }`

#### Scenario: Subscription expired

- **WHEN** GET /api/sub/{token} 且订阅已过期
- **THEN** 返回 410，Body `{ "error": "subscription expired" }`

#### Scenario: Empty subscription

- **WHEN** GET /api/sub/{token} 且订阅无关联条目
- **THEN** 返回 200，Vault 的 entries 和 groups 均为空数组

#### Scenario: Group deduplication

- **WHEN** 多个选中 entries 属于同一 group
- **THEN** 返回的 Vault 中该 group 只出现一次，所有相关 entries 的 groupId 正确指向该 group

#### Scenario: Entries without group

- **WHEN** 选中的 entries 中有些 groupId 为 null
- **THEN** 这些条目在返回的 Vault 中 groupId 为 null，不出现在任何分组下
