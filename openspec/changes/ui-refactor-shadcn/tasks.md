# Tasks

## Phase 1: 基础设施搭建

- [x] 1.1 安装 shadcn/ui 依赖 (tailwindcss-animate, class-variance-authority, tailwind-merge, react-hook-form, zod, @hookform/resolvers, sonner)
- [x] 1.2 配置 tsconfig path alias (@/*) 和 vite.config.ts resolve alias
- [x] 1.3 运行 shadcn init 生成 components.json，创建 src/lib/utils.ts (cn 函数)
- [x] 1.4 迁移 CSS 变量：globals.css 中 MD3 变量映射到 shadcn 命名，更新 tailwind.config.js
- [x] 1.5 移除 Google Fonts Material Symbols 引用，确认 lucide-react 可用

## Phase 2: 基础组件替换

- [x] 2.1 安装并替换 Button 组件 (shadcn Button)
- [x] 2.2 安装并替换 Input 组件 (shadcn Input + Label)
- [x] 2.3 安装并替换 Select 组件 (shadcn Select)
- [x] 2.4 安装并替换 Modal → Dialog 组件
- [x] 2.5 安装并替换 ConfirmDialog → AlertDialog
- [x] 2.6 安装并替换 Toggle → Switch
- [x] 2.7 安装并替换 Toast → Sonner
- [x] 2.8 适配 EmptyState 和 PasswordStrengthIndicator 到新主题

## Phase 3: 布局与页面重构

- [x] 3.1 抽取统一的 AppHeader 和 AppFooter，消除 4 处重复
- [x] 3.2 所有图标从 Material Symbols 迁移到 lucide-react
- [x] 3.3 安装 ContextMenu，重构 SideNavBar 和 EntryList 的右键菜单
- [x] 3.4 重构 EntryDetail：引入 Card + Separator
- [x] 3.5 重构 SettingsModal：引入 Tabs (vertical)
- [x] 3.6 重构 MainScreen：vault tab bar 已使用 shadcn tokens，单 tab 场景无需引入 Tabs 组件
- [x] 3.7 重构 WelcomeScreen、UnlockScreen、NewVaultScreen 使用新组件

## Phase 4: 表单与高级组件

- [x] 4.1 重构 EntryFormFields 和 EntryEditForm：使用 shadcn Input/Select/Label/Checkbox/Button
- [x] 4.2 重构 Git 组件 (5个)：使用 lucide-react 图标 + shadcn Button + shadcn 主题 tokens
- [x] 4.3 重构 GroupDialog：shadcn Button/Input/Label + lucide icon picker
- [x] 4.4 抽取 useConfirmDialog hook → 跳过，ConfirmDialog 包装组件已足够统一
- [x] 4.5 全局清理：移除旧 Button/Input/Select/IconButton、移除 Material Symbols CSS、更新 EmptyState 接受 ReactNode icon
- [x] 4.6 编译验证通过 ✓
