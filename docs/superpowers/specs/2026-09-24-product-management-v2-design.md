# 商品管理（新版）设计

日期：2026-09-24
状态：待审阅

## 1. 目标与范围

在保留现有旧版“商品管理”页面的前提下，新增“商品管理（新版）”菜单。新版以本地 MySQL `shop_vite` 的 `product`、`product_spec` 表为核心数据模型，并提供真实的资源上传、商品审核、上架管理和多 SKU 管理。

页面以参考图为视觉基准：同一工作台左侧编辑商品、右侧浏览和筛选商品列表。实现采用 Vue 3、Element Plus、SpringBlade 和已启动的 `blade-resource` 文件服务，不引入新的 UI 或上传框架。

首期包含：

- 商品 SPU 的新增、编辑、详情、复制、逻辑删除和分页查询。
- 多 SKU 的新增、编辑、删除、复制、默认规格、价格、库存、尺寸和材质维护。
- 商品主图、详情图、宣传视频与 3D 文件的真实上传、媒体绑定、预览、删除和排序。
- 品牌、分类路径的可输入选择；选项由现有未删除商品聚合，不新增分类或品牌字典表。
- 草稿、提交审核、审核通过、审核驳回、上架、下架和批量上下架。
- 新增审核记录表，保存操作历史与驳回原因。

首期不包含独立的品牌管理、分类管理、库存流水、销售订单、资源物理删除和多级审批流。

## 2. 已确认决策

| 项目 | 决定 |
|---|---|
| 菜单 | 新建“商品管理（新版）”，保留旧商品管理页面 |
| 数据库 | 本地 MySQL `shop_vite` |
| 商品核心表 | 使用用户提供的 `product`、`product_spec` 设计 |
| 文件上传 | 复用已启动的 `blade-resource` 与对象存储，使用真实上传 |
| 分类与品牌 | 编辑页自由输入 + 从已存商品聚合建议；不建字典表 |
| SKU | 一个商品支持多条 SKU，并维护独立价格、库存、图片与规格属性 |
| 审核 | 简单动作流：提交、通过、驳回；驳回原因必填 |
| 审核记录 | 新建 `product_audit_log`，不改变两张核心表的字段定义 |
| 布局 | 方案 A：左编辑、右列表的单页双栏工作台 |

## 3. 数据模型

### 3.1 核心表

`product` 和 `product_spec` 按提供的字段创建，但迁移 SQL 必须非破坏性：只使用 `CREATE TABLE IF NOT EXISTS`、索引和必要的种子菜单；不得包含 `DROP TABLE`。

商品媒体使用现有资源附件服务上传，文件实体归属 `product:<product_id>`。`product` 中的媒体 URL 字段作为展示与业务绑定字段：

| 字段 | 取值 |
|---|---|
| `main_image` | 主图附件 URL |
| `detail_images` | 详情图 URL 数组 JSON |
| `video_url` | 视频附件 URL |
| `model_3d_url` | 3D 文件附件 URL |

产品主图与 SKU 图片均保存 URL；附件服务保存文件元数据和对象存储地址。

### 3.2 审核记录表

```sql
CREATE TABLE IF NOT EXISTS product_audit_log (
  audit_log_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '审核记录主键',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  action TINYINT NOT NULL COMMENT '1提交审核 2通过 3驳回 4上架 5下架',
  audit_status TINYINT NOT NULL COMMENT '动作后的审核状态：0待审核 1已通过 2已驳回',
  reason VARCHAR(512) DEFAULT NULL COMMENT '驳回原因或操作说明',
  operator_id BIGINT DEFAULT NULL COMMENT '操作人ID',
  operator_name VARCHAR(64) DEFAULT NULL COMMENT '操作人名称快照',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (audit_log_id),
  KEY idx_product_audit_log_product_time (product_id, create_time),
  KEY idx_product_audit_log_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品审核与状态操作记录';
```

产品编码 `product_code` 和 SKU 编码 `spec_code` 均全局唯一。一个商品必须有且仅有一个 `is_default = 1` 的有效 SKU；商品保存时后端负责校验并在事务中同步 SKU。

## 4. 业务规则

1. 新建商品保存为草稿：`product_status = 0`、`audit_status = 0`、`is_on_shelf = 0`。
2. 保存草稿可反复编辑；已审核商品修改关键字段或 SKU 后，自动改回待审核并下架。
3. 提交审核只允许待审核、未删除商品执行；动作写入审核日志。
4. 审核通过把 `audit_status` 设为 1；审核驳回把状态设为 2，并要求非空驳回原因。
5. 只有审核通过的商品可上架；上架、下架均写审核日志。
6. 商品删除使用逻辑删除，不物理删除资源附件，避免影响被其他记录引用的文件。
7. 列表起售价、库存、主 SKU 取默认 SKU；没有可用 SKU 时回落产品级零售价和 0 库存。
8. 上传完成并返回 URL 后才能绑定产品媒体；失败时不写入产品字段。

## 5. 后端接口

后端模块放在现有 SpringBlade `blade-system` 中，新增产品模块。返回格式沿用项目现有 `R<T>` 与分页格式。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/product-v2/page` | 商品分页；支持关键词、品牌、分类、产品状态、审核状态、上架状态 |
| GET | `/product-v2/{productId}` | 商品详情，含 SKU、媒体和最近审核记录 |
| POST | `/product-v2` | 新建商品与 SKU |
| PUT | `/product-v2/{productId}` | 更新商品与 SKU，事务同步 |
| DELETE | `/product-v2/{productId}` | 逻辑删除 |
| POST | `/product-v2/{productId}/copy` | 复制商品与 SKU，生成待审核副本 |
| POST | `/product-v2/{productId}/submit-audit` | 提交审核 |
| POST | `/product-v2/{productId}/approve` | 审核通过 |
| POST | `/product-v2/{productId}/reject` | 审核驳回，Body 包含 `reason` |
| POST | `/product-v2/{productId}/shelf` | 上架 |
| POST | `/product-v2/{productId}/unshelf` | 下架 |
| POST | `/product-v2/batch/shelf` | 批量上架，Body 为产品 ID 列表 |
| POST | `/product-v2/batch/unshelf` | 批量下架，Body 为产品 ID 列表 |
| GET | `/product-v2/options/brands` | 现有品牌聚合建议 |
| GET | `/product-v2/options/categories` | 现有分类路径聚合建议 |

资源上传不复制实现，前端复用 `src/api/resource.ts` 中既有真实上传方法，调用 `blade-resource` 的附件上传接口。

## 6. 前端结构与数据流

### 6.1 页面

```text
商品管理（新版）
├─ 顶部工具条：搜索、新增商品、批量操作
├─ 左侧商品编辑区（约 45%）
│  ├─ 基础信息
│  ├─ 媒体资料
│  ├─ SKU 规格
│  ├─ 销售与运营
│  ├─ 商品详情
│  └─ SEO
└─ 右侧商品列表（约 55%）
   ├─ 筛选栏
   ├─ 商品行与操作
   └─ 分页
```

点击右侧商品行后，加载左侧编辑表单。左侧存在未保存修改时，切换商品或离开页面必须给出保存草稿、放弃或取消三选一提示。

### 6.2 编辑区

- 基础信息：名称、编码、副标题、简介、品牌、分类路径、产地、空间、场景、类型、包装类型。
- 媒体资料：显示主图、详情图、视频与 3D 槽位；使用真实附件上传；主图可设定、详情图可排序、媒体可预览或解除绑定。
- SKU 规格：编辑表格，可新增、复制、删除、设默认；维护 SKU 编码、名称、售价、会员价、库存、图片、尺寸、重量、材质、颜色、风格和环保等级。
- 销售与运营：产品级参考价、计量单位、起订量、税率、上架、推荐、新品、热销和排序权重。
- 商品详情：富文本 `product_description`。
- SEO：关键词与可检索标签。
- 底部固定动作：取消、保存草稿、提交审核。审核通过后增加上架/下架按钮；审核人员增加通过/驳回按钮。

### 6.3 列表区

列表行展示主图、产品名称、默认 SKU、品牌/分类标签、起售价、库存、上架状态和审核状态。提供编辑、复制、更多操作；更多菜单含审核和上下架动作，并受权限和状态控制。批量操作提供批量上架、批量下架和删除。

## 7. 视觉与体验要求

- 保留当前后台深色导航；工作区用浅灰蓝背景和白色圆角卡片，主色为 `#1677ff`。
- 编辑区与列表区使用 16px 间距、12px 圆角、低层级阴影；不混用新 UI 框架。
- 文本遵循深色主体文字和至少 4.5:1 对比度；数字列使用等宽数字展示。
- 所有图标使用现有 Remix/Element 图标，禁止用 emoji 作为结构性图标。
- 一项主操作（新增商品 / 保存草稿 / 提交审核）在各状态下保持明确的视觉优先级。
- 上传、保存、审核、列表加载要显示进行中状态，避免重复提交。
- 桌面优先还原参考图；宽度低于 1200px 时改为上下布局，避免横向溢出。

## 8. 错误处理与权限

### 8.1 校验

- 产品编码、SKU 编码重复时由后端返回字段级错误，前端显示在对应输入项下。
- 保存时必须有产品名称、产品编码、至少一条 SKU、唯一默认 SKU 和默认 SKU 编码。
- 提交审核要求完整基础信息、主图和至少一条可用 SKU。
- 驳回动作必须填写原因。
- 上传失败直接展示资源服务返回原因，且不写入空 URL。

### 8.2 权限

新增“商品管理（新版）”菜单及查看、编辑、审核、上架、删除、批量操作、媒体上传按钮权限。后端同时校验权限，不能只依赖前端隐藏按钮。

## 9. 验收与测试

1. 非破坏性 SQL 能在 `shop_vite` 创建三张表、索引和新版菜单，且不影响旧商品页面。
2. 商品可新建为草稿，真实上传主图、详情图、视频、3D 文件后，刷新详情仍能读取正确 URL。
3. 商品可维护多个 SKU，并且默认 SKU、价格和库存正确反映在列表。
4. 提交、通过、驳回、上架、下架的状态流转符合第 4 节；驳回原因可查询。
5. 修改已通过商品的关键字段或 SKU 后会自动下架并回到待审核。
6. 列表筛选、分页、批量上架/下架和复制商品可用。
7. 为后端状态机、SKU 默认规格规则和前端数据映射添加自动化测试；接口和真实资源服务做本地联调验收。

## 10. 风险与限制

- 资源服务保留物理文件，因此商品逻辑删除不会删除对象存储文件；后续若需回收，应新增资源引用计数或清理任务。
- 当前分类和品牌不具备统一治理能力，只能从已有产品文本聚合；需要层级分类或标准品牌时应另建字典子系统。
- `product` 表的媒体字段存 URL，资源附件表保存元数据；前端绑定媒体时需保持两者一致。
