# 沙发家具商品中心 · 数据库优化建议（UI 完成后）

当前 UI 已严格映射 `blade_product` / `blade_product_spec` 现有字段。下列为**可选**优化，非上线阻断：

## 1. 视觉资产分型（可选）
现把场景图/材质图/尺寸图统一写入 `detail_images`（URL 数组）。若需强类型检索，可新增：

```sql
ALTER TABLE blade_product
  ADD COLUMN media_assets JSON NULL COMMENT '[{type:scene|material|size|detail,url}]';
```

## 2. 审核流水（可选）
`audit_remark` / `audit_time` 仅保留最近一次。若要完整「审核记录」时间线：

```sql
CREATE TABLE blade_product_audit_log (
  id BIGINT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  audit_status TINYINT NOT NULL,
  audit_remark VARCHAR(512),
  create_user BIGINT,
  create_time DATETIME
);
```

## 3. SKU 轴配置（可选）
矩阵目前用 `color × spec_name`。若要固定「颜色×尺寸」双轴字典，可增加规格字典表，避免自由文本不一致。

## 4. 完整度缓存（可选）
驾驶舱完整度为实时估算。商品量大时可物化 `completeness_score` 字段，在 submit 时回写。

**结论**：现结构已支撑 SPU/SKU、审核双状态、MinIO 媒体与矩阵/批量生成；先跑通业务再按需加表。
