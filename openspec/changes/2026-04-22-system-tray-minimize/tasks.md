# Tasks: system-tray-minimize

## Phase 1: 依赖与权限配置

### Task 1.1: 启用 tray-icon feature ✅
- **文件**: `src-tauri/Cargo.toml`
- **操作**: 将 `tauri = { version = "2", features = [] }` 改为 `tauri = { version = "2", features = ["tray-icon"] }`
- **验收**: `cargo check` 通过

### Task 1.2: 补充窗口操作权限 ✅
- **文件**: `src-tauri/capabilities/default.json`
- **操作**: 确认并添加所需权限：
  - `core:window:allow-hide`
  - `core:window:allow-show`
  - `core:window:allow-set-focus`
  - `core:window:allow-close`
  - `core:tray:allow-new` (如 default 未覆盖)
- **验收**: `cargo check` 通过，权限无报错

## Phase 2: 核心实现

### Task 2.1: 在 lib.rs 中实现托盘 + 窗口事件拦截 ✅
- **文件**: `src-tauri/src/lib.rs`
- **操作**: 在 `setup` 闭包中添加：
  1. 使用 `MenuBuilder` 创建菜单（显示主界面、分隔线、退出）
  2. 使用 `TrayIconBuilder` 创建托盘图标，绑定菜单和事件
  3. 左键点击托盘 → `window.show()` + `window.set_focus()`
  4. 菜单点击 → "show" 显示窗口 / "quit" 退出应用
  5. `on_window_event` 拦截 `CloseRequested` → `prevent_close()` + `hide()`
  6. `on_window_event` 拦截 `Minimized` → `hide()`
- **依赖**: Task 1.1, Task 1.2
- **验收**:
  - 关闭按钮 → 窗口隐藏、托盘图标出现、进程存活
  - 最小化按钮 → 窗口隐藏到托盘
  - 左键托盘 → 窗口恢复 + 聚焦
  - 右键托盘 → 菜单显示
  - 菜单退出 → 应用退出

## Phase 3: 测试验证

### Task 3.1: 多场景验证 (需手动测试)
- **操作**: 以下场景手动测试
  - [ ] 关闭 → 托盘 → 左键恢复
  - [ ] 关闭 → 托盘 → 右键菜单恢复
  - [ ] 关闭 → 托盘 → 右键菜单退出
  - [ ] 最小化 → 托盘 → 恢复
  - [ ] 自动锁定正常工作（等待超时或触发）
  - [ ] 锁定后隐藏到托盘 → 恢复显示解锁界面
  - [ ] 多次隐藏/恢复无内存泄漏或异常
- **依赖**: Task 2.1
