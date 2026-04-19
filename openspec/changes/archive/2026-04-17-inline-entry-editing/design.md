## Context

当前 mmpassword 的 entry 编辑/新增流程使用 Modal 弹窗（`EntryEditForm` 组件包裹在 `Modal size="lg"` 中，约 512px 宽）。主界面采用三栏布局：SideNavBar(w-56) + EntryList(w-72) + EntryDetail(flex-1)。右侧面板有充足的空间但仅用于只读展示，编辑操作完全依赖弹窗。

涉及的现有组件：
- `MainScreen.tsx`：持有 `isEditModalOpen`/`editingEntry` 状态，协调弹窗开关
- `EntryDetail.tsx`：只读展示 entry，点击编辑按钮触发 `onEdit` 回调打开弹窗
- `EntryEditForm.tsx`：Modal 包裹的表单组件，支持创建和编辑两种模式
- `EntryList.tsx`：列表展示，点击"+"触发 `onCreateEntry` 回调打开弹窗
- `vaultStore.ts`：Zustand store，管理 entries 和 selectedEntryId

## Goals / Non-Goals

**Goals:**
- 右侧面板支持 查看(viewing)、编辑(editing)、创建(creating) 三种模式无弹窗切换
- 创建 entry 时使用虚拟占位符，保存时才创建真实记录
- 有未保存修改时，任何导航操作前弹出确认对话框
- 充分利用右侧面板空间，表单布局不再拥挤

**Non-Goals:**
- 不修改后端 Rust 代码、Tauri IPC 命令或数据模型
- 不改变 entry 的字段类型集合（text/password/email/url/notes/username）
- 不实现拖拽排序、批量编辑等高级功能
- 不改变密码生成逻辑

## Decisions

### Decision 1: 编辑状态管理位置

**选择：在 vaultStore 中集中管理编辑状态**

在 store 中新增 `EditingState` 类型：

```typescript
type EditingState =
  | { mode: 'viewing' }
  | { mode: 'editing'; entryId: string; formData: EntryFormData }
  | { mode: 'creating'; groupId?: string; formData: EntryFormData }
```

**理由**：编辑状态需要被 EntryList、EntryDetail、SideNavBar 多个组件访问（判断是否有未保存修改），放在 store 中是最自然的选择。相比组件内 useState，集中管理可以避免 prop drilling。

**备选方案**：在 MainScreen 中用 useState 管理 → 需要大量 prop 传递，且 SideNavBar 难以感知编辑状态。

### Decision 2: 虚拟 Entry 的实现

**选择：在 store 中维护 `virtualEntry` 字段**

```typescript
interface VaultStore {
  // ...existing
  virtualEntry: VirtualEntry | null;  // 仅用于创建模式的 UI 占位
}
```

VirtualEntry 是一个纯前端概念，不调用后端 API。EntryList 在渲染时将 virtualEntry 插入到列表顶部。

**理由**：简单直接，不影响现有 entries 数组的完整性。虚拟 entry 有明确的 `isVirtual` 标记，避免与真实 entry 混淆。

### Decision 3: 确认对话框

**选择：复用现有 Modal 组件创建轻量确认对话框**

新增 `ConfirmDialog` 组件，复用 `Modal` 但固定为 `size="sm"`，标题/消息/三按钮（不保存/保存/取消）。

**理由**：项目已有 Modal 基础设施，无需引入新依赖。三按钮确认对话框是常见的 UX 模式。

### Decision 4: 表单组件复用

**选择：将 EntryEditForm 拆分为 EntryFormFields（纯表单字段）+ 外壳**

`EntryFormFields` 只包含字段输入部分（title、group、favorite、fields 列表），不含 Modal 包裹。`EntryDetail` 在编辑/创建模式下直接渲染 `EntryFormFields`。

**理由**：表单逻辑（密码生成、字段增删、类型选择）保持不变，只是展示容器从 Modal 变为右侧面板。最大化复用现有代码。

## Risks / Trade-offs

- **[复杂度增加]** 右侧面板从简单的只读展示变为三种模式切换，组件复杂度上升 → 通过清晰的 `EditingState` 状态机约束模式切换逻辑，每种模式对应独立的渲染分支
- **[边界场景多]** 未保存修改保护涉及多种导航路径 → 统一抽象为 `canNavigateAway()` 守卫函数，所有导航入口调用同一逻辑
- **[虚拟 entry 误操作]** 用户创建虚拟 entry 后直接关闭应用 → 虚拟 entry 不持久化，应用重启后自动丢失，无脏数据风险
