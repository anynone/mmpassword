## 1. 后端数据模型

- [x] 1.1 在 `src-tauri/src/models/field.rs` 中新增 `PasswordHistoryEntry` 结构体（`value: String`, `changed_at: String`）
- [x] 1.2 在 `Field` 结构体中新增 `password_history: Vec<PasswordHistoryEntry>` 字段，使用 `#[serde(default)]` 确保向后兼容
- [x] 1.3 运行 `cargo check` 验证编译通过

## 2. 后端历史记录逻辑

- [x] 2.1 在 `src-tauri/src/commands/entry.rs` 的 `update_entry` 命令中，添加新旧字段对比逻辑：按 name 匹配 password 类型字段，检测 value 变更
- [x] 2.2 当密码值变更时，构造 `PasswordHistoryEntry`（旧值 + 当前时间戳），插入新字段的 `password_history` 头部，超过 3 条则截断尾部
- [x] 2.3 确保 `save_vault_changes` 正常触发（历史记录作为 Field 的一部分随 vault 保存）

## 3. 前端类型定义

- [x] 3.1 在 `src/types/entry.ts` 中新增 `PasswordHistoryEntry` 接口（`value: string`, `changedAt: string`）
- [x] 3.2 在 `Field` 接口中新增 `passwordHistory?: PasswordHistoryEntry[]` 可选字段

## 4. 前端历史密码展示

- [x] 4.1 在 `src/components/entry/InlineField.tsx` 的 viewing 模式中，当字段类型为 password 且 `passwordHistory` 非空时，渲染历史密码区域
- [x] 4.2 每条历史密码显示遮罩值、显示/隐藏切换按钮、复制按钮、修改日期
- [x] 4.3 编辑模式下隐藏历史密码区域

## 5. 验证（手动测试）

> 以下任务需启动应用 `npm run tauri:dev` 手动验证

- [ ] 5.1 启动应用，打开一个已有条目，修改密码字段并保存，确认历史记录生成
- [ ] 5.2 再次修改密码，确认历史记录增加到 2 条
- [ ] 5.3 连续修改至超过 3 条，确认最早的历史记录被淘汰
- [ ] 5.4 打开一个旧 vault 文件（无 passwordHistory 字段），确认正常加载无报错
