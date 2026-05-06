## Why

用户在密码管理器中修改密码后，旧密码立即被覆盖。如果用户尚未在实际网站/服务器上完成密码变更，就会丢失旧密码——密码管理器中的新密码无效，旧密码也无法找回。这是密码管理器的一个真实安全风险场景，尤其发生在网站要求定期更换密码时。

## What Changes

- 在 Field 模型上新增 `passwordHistory` 字段，存储密码字段的最近历史值
- 每次密码字段值变更时，自动将旧值及时间戳记录到历史列表中
- 历史记录最多保留 3 条，FIFO 淘汰最旧记录
- 前端条目详情页展示历史密码，支持查看和复制
- 仅对 `password` 类型的字段生效

## Capabilities

### New Capabilities
- `password-history`: 密码字段变更时自动记录历史值（最多 3 条），前端可查看和复制历史密码

### Modified Capabilities
- `inline-entry-edit`: 条目编辑保存时，后端需对比新旧字段值，自动将变更的密码写入历史记录；前端需在条目详情中渲染历史密码区域

## Impact

- **数据模型**: `Field` 结构新增 `passwordHistory: Vec<PasswordHistoryEntry>`，使用 `#[serde(default)]` 兼容旧 vault 文件
- **后端**: `update_entry` 命令增加字段对比逻辑，写入历史记录
- **前端**: `InlineField` 或 `EntryDetail` 组件增加历史密码展示区域
- **文件格式**: vault `.mmp` 文件内 Field 序列化结果变化，向后兼容（老文件读取时 passwordHistory 为空）
- **Git 同步**: 无额外影响，历史密码随 vault 正常加密同步
