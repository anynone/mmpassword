# Welcome Page Layout Optimization

## Summary

优化欢迎页面（Welcome Back）布局，消除默认窗口尺寸下的滚动条，使页面在拉伸时自适应，缩小时不出现滚动条。

## Changes

### 1. 移除订阅（Subscription）区域

从 WelcomeScreen 中移除整个 Subscription Vault 区块，包括：
- URL 输入框和 Fetch 按钮
- 订阅历史列表
- 相关 state 变量和处理函数
- `onSubscriptionFetched` prop

**注意**：不删除 store/types/i18n 中的订阅相关代码，仅从欢迎页移除入口。其他页面（MainScreen 等）的订阅功能保持不变。

### 2. 压缩间距

| 位置 | 当前 | 优化后 | 节省 |
|------|------|--------|------|
| main 区域 padding | `p-12` (48px) | `p-6 pt-8` (~24-32px) | ~40px |
| 区块间距 (mb) | `mb-12` (48px) | `mb-6` (24px) | 每处 24px |
| 标题 mb | `mb-12` | `mb-6` | 24px |
| 按钮卡片内边距 | `p-8` (32px) | `p-5` (20px) | ~24px |
| 按钮图标尺寸 | `w-14 h-14` | `w-12 h-12` | ~8px |
| 标题字号 | `text-4xl` | `text-3xl` | ~8px |

### 3. 最近记录最多显示 3 条 + "更多"弹层

- Recent Vaults 和 Recent Git Repos 各最多显示 3 条
- 超过 3 条时，显示"查看更多"按钮
- 点击"查看更多"弹出 Modal（复用现有 Modal 组件），展示完整列表
- Modal 内记录可点击选择，效果与主页面一致

### 4. 外层容器优化

- `min-h-screen` → `h-screen`，确保不超出视口
- main 区域保持 `overflow-y-auto`，作为极端情况（窗口极小）的 fallback

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/screens/WelcomeScreen.tsx` | 主要改动：移除订阅区域、压缩间距、添加"更多"弹层逻辑 |
| `src/App.tsx` | 移除 `onSubscriptionFetched` prop 传递 |

## Out of Scope

- 订阅相关的 store/types/i18n/后端代码（保留，仅移除欢迎页入口）
- 其他页面的订阅功能
- 最小窗口尺寸不做调整（保持 900x600）
