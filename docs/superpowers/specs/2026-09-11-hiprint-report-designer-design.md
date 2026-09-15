# Hiprint 报表设计器封装设计

日期：2026-09-11  
状态：已批准（待实现）

## 背景

制令管理已接入 `vue-plugin-hiprint` 固定「生产指令单」模板的预览/打印。需要在预览前支持自定义报表设计，并封装为可复用能力，供后续其他业务页打印使用。

参考文档：[vue-plugin-hiprint](https://ccsimple.github.io/vue-plugin-hiprint/)

## 目标

1. 同一弹窗内提供 **设计 | 预览** Tab，可直接打印。
2. 封装通用组件，业务页仅传配置与数据即可接入。
3. 模板优先存 `localStorage`；预留后端读写接口，后续可平滑升级。

## 非目标（首版不做）

- 后端持久化模板、多模板切换、设计权限控制
- 独立「报表中心」路由页
- 完整复刻官方 demo 的全部 UI/高级能力

## 决策摘要

| 项 | 选择 |
|----|------|
| 模板存储 | C：本地 `localStorage` + 预留异步 load/save |
| 入口形态 | C：同一弹窗 Tab（设计 \| 预览） |
| 元素库 | B：通用元素 + 页面传入业务字段 provider |
| 封装方式 | 方案 2：通用组件 + 按报表配置 |

## 架构

```
业务页（制令等）
  └─ HiprintReportDialog
       ├─ Tab 设计：左元素 / 中 design / 右属性
       ├─ Tab 预览：getHtml(printData) + 缩放
       └─ 底栏：保存 / 恢复默认 / 打印 / 关闭
            │
            ├─ utils/hiprint/core.ts      # init / design / getJson / preview / print
            ├─ utils/hiprint/storage.ts   # localStorage + 可注入异步接口
            ├─ providers/common.ts
            ├─ providers/<biz>.ts
            └─ templates/<biz>.ts         # 默认模板 JSON
```

## 目录结构

```
src/components/hiprint/
  HiprintReportDialog.vue
src/utils/hiprint/
  core.ts
  storage.ts
  providers/
    common.ts
    instructionSheet.ts
  templates/
    instructionSheet.ts
```

现有 `src/utils/hiprint/instructionSheet.ts` 中的默认布局迁入 `templates/instructionSheet.ts`；字段映射 `mapItemsToPrintRows` 可保留在制令相关模块或同目录工具中，供业务页组装 `printData`。

## 组件 API（HiprintReportDialog）

| Prop / 事件 | 说明 |
|-------------|------|
| `v-model` / `visible` | 弹窗显隐 |
| `title` | 标题，如「生产指令单」 |
| `reportKey` | 模板存储键，如 `instruction-sheet` |
| `providers` | hiprint provider 数组（含通用 + 业务） |
| `defaultTemplate` | 无本地缓存时的默认模板 JSON |
| `printData` | 打印/预览数据，如 `{ table: rows }` |
| `onLoadTemplate?` | `(key) => Promise<template \| null>`，优先于 localStorage |
| `onSaveTemplate?` | `(key, json) => Promise<void>`，保存时额外调用 |

## 弹窗交互

- 窗口：非全屏，约 `1100px` × `88vh`。
- **设计 Tab**：左 ~200px 可拖拽元素；中纸张设计区（默认 A4 竖版）；右 ~260px 属性面板。
- **预览 Tab**：当前设计 JSON + `printData` 渲染，容器内等比缩放。
- **底栏**：保存模板、恢复默认、打印、关闭。
- 设计 → 预览：先 `getJson()` 再渲染（未保存也可预览）。
- 预览 → 设计：保留内存中模板，不丢未保存改动。
- 有未保存改动时关闭：确认是否放弃。

## 数据流

```
打开 → onLoadTemplate?.(key) ?? localStorage ?? defaultTemplate
     → hiprint.init({ providers }) → PrintTemplate.design(container)
预览/打印 → getJson() + printData → getHtml / print
保存 → localStorage[hiprint:tpl:${reportKey}] + onSaveTemplate?.(key, json)
恢复默认 → 清除本地键，重载 defaultTemplate
```

本地键名约定：`hiprint:tpl:${reportKey}`。

## 制令页接入

1. 「打印」打开 `HiprintReportDialog`，替换现有纯预览弹窗。
2. 继续用 `mapItemsToPrintRows` 组装 `printData`。
3. 默认模板由当前硬编码 panel 布局导出/迁移为 JSON。
4. 预览-only 相关逻辑迁入通用组件后删除或瘦身。

## 后续页面接入方式

传入不同的 `reportKey`、业务 `provider`、`defaultTemplate`、`printData` 即可，无需复制设计器 UI。

## 验收标准

1. 设计 Tab 可拖入通用/业务元素，右侧改属性生效。
2. 切换预览可见当前设计 + 选中制令数据。
3. 保存后再次打开仍为刚保存布局。
4. 恢复默认回到出厂指令单样式。
5. 打印结果与预览一致。
6. 封装边界清晰：其他页仅配置即可接入（本迭代只接制令）。

## 风险与注意

- hiprint 依赖 jQuery 与 DOM 就绪后再 `design` / `PrintElementTypeManager.build`。
- 元素坐标单位为 pt；纸张宽高为 mm，与现有踩坑经验保持一致。
- 动态 import `vue-plugin-hiprint` / `jquery`，避免拖慢主包。
