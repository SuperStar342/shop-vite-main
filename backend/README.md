# 后端说明

本仓库后端分两块：

| 路径 | 说明 |
|------|------|
| `backend/bladex/` | **完整 BladeX 多模块工程**（auth / gateway / system / desk / ops 等），另一台电脑克隆后在此目录 `mvn` 编译启动 |
| `backend/blade-system/` | 业务改动的轻量参考副本（报工 / 商品 / 打印等），便于对照合并 |

## 推荐启动

1. 准备 Nacos / Redis / MySQL（或沿用现有环境）
2. 在 `backend/bladex` 执行：`mvn -pl blade-service/blade-system -am package -DskipTests`
3. 按 BladeX 惯例依次启动 `blade-gateway`、`blade-auth`、`blade-system` 等
4. 前端根目录：`pnpm install` → `pnpm dev`（默认端口 **5300**）

商品 SKU 物理删除依赖 `JdbcTemplate`；若库上仍有含 `is_deleted` 的唯一索引，请执行仓库根目录 `sql/blade_product_spec_uk_fix.mysql.sql`。
