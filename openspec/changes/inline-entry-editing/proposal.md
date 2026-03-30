## Why

当前 entry 的编辑和新增使用 Modal 弹窗（max-w-lg ~512px），表单内 grid-cols-12 的字段布局非常拥挤。右侧面板（flex-1）的大量空间未被利用。弹窗模式还会遮挡主界面，用户无法在编辑时同时查看 entries 列表状态，交互体验不佳。

## What Changes

- 移除 EntryEditForm 的 Modal 包裹，改为在右侧 EntryDetail 面板中直接支持**查看/编辑/创建**三种模式切换
- 编辑模式：点击编辑图标，右侧从只读状态切换为可编辑表单，保存后切回只读
- 创建模式：点击"+"按钮，Entry List 顶部插入虚拟 entry 占位符，右侧显示空编辑表单；保存时才调用后端创建真实 entry；取消时移除虚拟占位符
- 未保存修改保护：编辑/创建中切换 entry、新建或切换 group 时弹出确认对话框（不保存/保存/取消）
- entry type（Website Login / Secure Note）仅创建时可选择，编辑时不可改
- 移除 MainScreen 中的 `isEditModalOpen` 和 `editingEntry` 弹窗状态管理

## Capabilities

### New Capabilities
- `inline-entry-edit`: 右侧面板内联编辑/创建 entry，包含查看、编辑、创建三种面板状态切换
- `unsaved-changes-guard`: 未保存修改保护，在用户离开编辑状态前弹出确认对话框

### Modified Capabilities
<!-- 无已有 spec 需要修改 -->

## Impact

- **前端组件**：EntryDetail（重写为支持三种模式）、EntryList（支持虚拟 entry 显示）、MainScreen（移除弹窗状态，增加编辑状态管理）、EntryEditForm（重构为非 Modal 的内联表单）
- **数据流**：vaultStore 需要新增编辑模式状态（`editingState`），虚拟 entry 仅存在于前端 UI 层
- **不受影响**：后端 Rust 代码、Tauri IPC 命令、数据模型（Entry/Field 类型不变）、加密/存储逻辑
