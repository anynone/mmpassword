# UI Refactor: Migrate to shadcn/ui

## Summary

将整个项目的 UI 从手写 Tailwind 组件全面迁移到 shadcn/ui 组件库，同时统一图标系统（lucide-react）、引入表单管理（react-hook-form + zod），并修复现有的代码重复和国际化缺失问题。

## Motivation

1. 手写组件视觉精致度不足，交互细节（动画、焦点、键盘导航）缺失
2. 右键菜单、确认对话框、Header/Footer 等模式存在大量代码重复
3. Git 相关组件和表单组件缺少国际化
4. 无统一的表单验证方案
5. Material Symbols Outlined 加载慢且与项目已安装的 lucide-react 冲突

## Tech Stack Changes

| Before | After |
|--------|-------|
| 手写 Tailwind 组件 | shadcn/ui (v3, shadcn@2.3.0) |
| Material Symbols Outlined (Google Fonts) | lucide-react (已安装) |
| 无表单库 | react-hook-form + zod |
| 自定义 Toast | Sonner |
| MD3 CSS 变量 (`--md-*`) | shadcn CSS 变量 (`--primary`, `--background`, etc.) |
| clsx | cn() (clsx + tailwind-merge) |

## Architecture

```
src/
├── components/
│   ├── ui/              ← NEW: shadcn/ui 组件 (Button, Input, Dialog, etc.)
│   ├── common/          ← 保留项目级复合组件 (EmptyState, PasswordStrength, etc.)
│   ├── layout/          ← 重构使用 shadcn 组件
│   ├── screens/         ← 重构使用 shadcn 组件
│   ├── entry/           ← 重构 + i18n
│   ├── group/           ← 重构使用 shadcn 组件
│   ├── git/             ← 重构 + i18n
│   └── settings/        ← 重构使用 shadcn 组件
├── lib/
│   └── utils.ts         ← NEW: cn() 工具函数
└── styles/
    └── globals.css      ← 重构：shadcn CSS 变量 + 保留自定义样式
```

## Phased Migration Plan

### Phase 1: 基础设施搭建
- 安装 shadcn/ui 及依赖 (tailwindcss-animate, class-variance-authority, tailwind-merge)
- 配置 tsconfig path alias (@/*)
- 配置 components.json
- 创建 lib/utils.ts (cn 函数)
- 迁移 CSS 变量：MD3 → shadcn 命名 (保持相同颜色值)
- 移除 Google Fonts Material Symbols 引用

### Phase 2: 基础组件替换
按需安装并替换所有 common/ 组件：
- Button → shadcn Button
- IconButton → shadcn Button (size="icon")
- Input → shadcn Input + Label
- Select → shadcn Select
- Modal → shadcn Dialog
- ConfirmDialog → shadcn AlertDialog
- Toast → Sonner
- Toggle → shadcn Switch
- ThemeProvider → 保留（已兼容 shadcn 的 dark class 模式）

保留并适配的自定义组件：
- PasswordStrengthIndicator（用 shadcn Progress 重写）
- EmptyState（适配新主题）

### Phase 3: 布局与页面重构
- 消除 Header/Footer 重复：统一为 AppHeader + AppFooter
- SideNavBar/EntryList：引入 shadcn ContextMenu 替换手写右键菜单
- EntryDetail：引入 shadcn Card + Separator
- MainScreen：引入 shadcn Tabs (vault 标签栏)
- SettingsModal：引入 shadcn Tabs (vertical) 替换手写侧栏导航
- 所有图标从 Material Symbols → lucide-react

### Phase 4: 表单与高级组件
- 引入 react-hook-form + zod
- EntryFormFields/EntryEditForm：使用 shadcn Form + FormField
- Git 组件 (5个)：重构 + 补充 i18n
- GroupDialog：shadcn Dialog + ToggleGroup (图标选择)
- NewVaultScreen：使用 shadcn Form，复用 PasswordStrengthIndicator
- 统一确认对话框模式：抽取 useConfirmDialog hook

## Component Mapping

| Current | shadcn/ui | Notes |
|---------|-----------|-------|
| Button (5 variants) | Button | 保持 variant 映射 |
| IconButton | Button size="icon" | 合并 |
| Input | Input + Label | 分离关注点 |
| Select | Select | 弹出式替代原生 |
| Modal | Dialog | Portal + 动画 |
| ConfirmDialog | AlertDialog | 专用确认场景 |
| Toast | Sonner | 更美观 |
| Toggle | Switch | 语义相同 |
| 手写 ContextMenu ×2 | ContextMenu | 消除重复 |
| — | ScrollArea | 新增 |
| — | Tooltip | 新增 |
| — | Skeleton | 新增 |
| — | Badge | 新增 (AboutSettings) |
| — | Separator | 新增 |
| — | Card | 新增 |
| — | Checkbox | 新增 |
| — | RadioGroup | 新增 (Git vault select) |
| — | Tabs | 新增 (Vault tabs, Settings) |
| — | Form | 新增 (rhf integration) |

## Out of Scope

- Rust 后端代码不做修改
- 功能逻辑不做变更，仅 UI 层重构
- 不升级 Tailwind 到 v4（保持 v3）
- 不引入 next-themes（当前 ThemeProvider 已够用）

## Risks

1. **shadcn CSS 变量迁移**：需要将 ~30 个 MD3 变量映射到 shadcn 命名，确保颜色一致
2. **图标迁移**：~80+ 处 Material Symbols 需替换为 lucide 图标名
3. **编译体积**：shadcn 组件是源码级引入，但 Radix UI 底层有运行时体积增加
4. **表单状态迁移**：现有 useState 管理的表单需迁移到 react-hook-form
