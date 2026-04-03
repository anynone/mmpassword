## ADDED Requirements

### Requirement: Web Admin SPA Structure

系统 SHALL 提供 React + Tailwind 单页应用作为管理后台，嵌入服务端二进制通过 rust-embed 提供服务。

前端 MUST 包含三个页面：Entries、Groups、Subscriptions，通过侧边栏导航切换。

#### Scenario: SPA routing

- **WHEN** 用户访问服务端根路径 `/`
- **THEN** 返回嵌入的 index.html，前端路由处理页面切换，无需服务端路由配合

#### Scenario: Static assets served

- **WHEN** 用户浏览器请求 `/assets/*.js` 或 `/assets/*.css`
- **THEN** 服务端返回嵌入的对应静态资源文件，设置正确的 Content-Type

#### Scenario: Unknown path fallback

- **WHEN** 用户直接访问非 API 路径（如 /entries、/groups）
- **THEN** 返回 index.html（SPA fallback），前端路由处理渲染

### Requirement: Entries Management Page

Entries 页面 SHALL 显示所有条目的表格，支持搜索和 CRUD 操作。

表格 MUST 显示：标题、所属分组名、标签、操作按钮（编辑、删除）。

#### Scenario: Entry list display

- **WHEN** 用户打开 Entries 页面
- **THEN** 显示条目表格，每行显示标题、分组名称、标签列表、操作按钮

#### Scenario: Search entries

- **WHEN** 用户在搜索框输入文字
- **THEN** 实时过滤表格，只显示标题匹配的条目

#### Scenario: Create entry

- **WHEN** 用户点击"新增条目"按钮
- **THEN** 弹出表单，包含标题输入、分组下拉选择、字段编辑器（动态添加/删除 name+value+fieldType）、标签输入、收藏开关

#### Scenario: Edit entry

- **WHEN** 用户点击条目的编辑按钮
- **THEN** 弹出预填充当前数据的编辑表单

#### Scenario: Delete entry

- **WHEN** 用户点击删除按钮
- **THEN** 显示确认对话框，确认后删除条目并刷新列表

#### Scenario: Dynamic field editor

- **WHEN** 用户在条目表单中操作
- **THEN** 可以添加新字段（name+value+fieldType 行）、删除已有字段、修改字段内容。fieldType 通过下拉选择（text/password/url/email/notes/username）。

### Requirement: Groups Management Page

Groups 页面 SHALL 显示所有分组的列表，支持 CRUD 操作。

每个分组 MUST 显示：名称、图标、包含条目数量、操作按钮。

#### Scenario: Group list display

- **WHEN** 用户打开 Groups 页面
- **THEN** 显示分组卡片或列表，每个分组显示名称、Material Symbols 图标、条目计数

#### Scenario: Create group

- **WHEN** 用户点击"新增分组"
- **THEN** 弹出表单，包含名称输入和图标选择器

#### Scenario: Icon picker

- **WHEN** 用户在分组表单中选择图标
- **THEN** 显示 Material Symbols 图标网格供选择，选中后预览显示

#### Scenario: Edit group name and icon

- **WHEN** 用户点击分组的编辑按钮
- **THEN** 弹出预填充的表单，可修改名称和图标

#### Scenario: Delete group

- **WHEN** 用户点击删除并确认
- **THEN** 删除分组，关联条目变为"未分组"，列表刷新

### Requirement: Subscriptions Management Page

Subscriptions 页面 SHALL 显示所有订阅链接，支持创建、编辑、删除和条目分配。

#### Scenario: Subscription list display

- **WHEN** 用户打开 Subscriptions 页面
- **THEN** 显示订阅列表，每项显示名称、URL（可复制）、过期时间、包含条目数、操作按钮

#### Scenario: Create subscription

- **WHEN** 用户点击"新增订阅"
- **THEN** 弹出表单，输入名称、描述（可选）、过期时间（可选），创建后显示生成的 URL

#### Scenario: Copy subscription URL

- **WHEN** 用户点击订阅的 URL 或复制按钮
- **THEN** URL 复制到剪贴板，显示成功提示

#### Scenario: Assign entries to subscription

- **WHEN** 用户点击订阅的"分配条目"按钮
- **THEN** 弹出条目选择器，显示所有条目的复选框列表（每项显示标题和所属分组），可全选/全不选

#### Scenario: Save entry assignment

- **WHEN** 用户勾选条目后点击保存
- **THEN** PUT 选中的 entry_ids 到服务端，刷新显示更新的条目计数

#### Scenario: Refresh subscription token

- **WHEN** 用户点击"刷新令牌"
- **THEN** 确认后生成新 token 和 URL，旧 URL 失效

#### Scenario: Delete subscription

- **WHEN** 用户点击删除并确认
- **THEN** 删除订阅及其条目关联，列表刷新

### Requirement: Entry Icon Selection in Entry Form

条目新增和编辑表单 SHALL 支持图标选择。

#### Scenario: Icon in entry form

- **WHEN** 用户在条目表单中选择图标
- **THEN** 显示 Material Symbols 图标网格，选中后显示预览
