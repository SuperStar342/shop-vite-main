# 非生产派工 · 单价设置（后端参考实现）

将本目录下 `nonprod` / `procurement` 相关 Java 合并到 BladeX `blade-system`，并执行 SQL。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/non-prod/unit-price/list` | 分页列表（keyword / dispatchTypeCode / pieceType / allowEditPrice） |
| GET | `/non-prod/unit-price/detail?id=` | 详情 |
| GET | `/non-prod/unit-price/type-stats` | 按派工类型汇总 |
| POST | `/non-prod/unit-price/submit` | 新增/修改 |
| POST | `/non-prod/unit-price/remove?ids=` | 删除（逗号分隔） |

前端代理前缀：`/api/blade-system`

菜单 code：`unitPriceSetting`（`@PreAuth`）

## 部署步骤

1. 执行 `sql/non_prod_dispatch_menu.mysql.sql`（挂到首页下）
2. 执行 `sql/blade_non_prod_unit_price.mysql.sql`（建表 + 种子）
3. 将本模块 Java 拷入 `blade-system` 并重启服务
4. 重新登录前端，打开「首页 → 非生产派工 → 单价设置」
