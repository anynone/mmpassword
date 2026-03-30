## 1. Store 层：编辑状态与虚拟 Entry

- [x] 1.1 在 vaultStore 中定义 `EditingState` 类型（viewing / editing / creating）和 `EntryFormData` 类型，新增 `editingState` 和 `virtualEntry` 状态字段
- [x] 1.2 实现 store actions：`startEditing(entry)`、`startCreating(groupId?)`、`cancelEditing()`、`saveEditing()`、`saveCreating()`
- [x] 1.3 实现 `hasUnsavedChanges()` 计算逻辑：对比当前 formData 与原始 entry 数据（编辑模式）或检查 formData 是否为空（创建模式）

## 2. 确认对话框组件

- [x] 2.1 创建 `ConfirmDialog` 组件，复用现有 Modal，支持三按钮（不保存/保存/取消），通过 props 接收回调
- [x] 2.2 实现 `useNavigationGuard` hook：检查 `hasUnsavedChanges()`，若为 true 则拦截并显示确认对话框，处理三种回调结果

## 3. EntryDetail 面板改造

- [x] 3.1 重构 EntryDetail 组件，根据 `editingState.mode` 分三路渲染：viewing（现有只读逻辑）、editing、creating
- [x] 3.2 从 EntryEditForm 中抽取 `EntryFormFields` 纯表单组件（不含 Modal 包裹），供编辑/创建模式复用
- [x] 3.3 实现编辑模式：渲染 EntryFormFields（预填充 entry 数据），隐藏 entry type 选择器，底部 Cancel + Save Changes 按钮
- [x] 3.4 实现创建模式：渲染 EntryFormFields（空表单），显示 entry type 选择器，默认选中当前 group，底部 Cancel + Create Entry 按钮
- [x] 3.5 实现保存/取消逻辑：调用 store actions，成功后切回 viewing 模式，显示 toast 提示

## 4. EntryList 虚拟 Entry 支持

- [x] 4.1 在 EntryList 中支持渲染虚拟 entry 占位符（显示在列表顶部，特殊样式如斜体 + "New Entry" 默认文本）
- [x] 4.2 点击"+"按钮改为调用 `startCreating()`，而非打开弹窗
- [x] 4.3 右键菜单"Edit"改为调用 `startEditing(entry)`，而非打开弹窗

## 5. 导航守卫集成

- [x] 5.1 EntryList 中点击其他 entry 前调用 navigation guard，处理确认后切换
- [x] 5.2 EntryList 点击"+"前调用 navigation guard，处理确认后进入创建模式
- [x] 5.3 SideNavBar 切换 group 前调用 navigation guard，处理确认后切换

## 6. MainScreen 清理

- [x] 6.1 移除 MainScreen 中的 `isEditModalOpen`、`editingEntry` 状态和 `handleCreateEntry`、`handleEditEntry` 弹窗逻辑
- [x] 6.2 移除 EntryEditForm 的 Modal 引用（保留 EntryFormFields 纯表单组件）
- [x] 6.3 清理 MainScreen 中传递给子组件的不再需要的 props

## 7. 验证

- [x] 7.1 验证查看 → 编辑 → 保存 → 查看 完整流程
- [x] 7.2 验证查看 → 编辑 → 取消 → 查看 完整流程
- [x] 7.3 验证新建 → 填写 → 保存 → 列表出现新 entry 完整流程
- [x] 7.4 验证新建 → 取消 → 虚拟 entry 消失
- [x] 7.5 验证编辑中切换 entry/新建/切换 group 的确认对话框三按钮行为
- [x] 7.6 验证未修改表单时导航不弹出确认
- [x] 7.7 验证密码生成、字段增删、类型选择在编辑/创建模式下正常工作
