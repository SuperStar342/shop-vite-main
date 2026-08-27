# blade-system 报工模块（参考实现）

本目录为 **派工报工** 前端接口的后端参考实现，需合并到 BladeX `blade-system` 服务中。

## 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/work-report/submit-dispatch` | 单笔派工上下文报工 |
| POST | `/work-report/submit-batch` | 批量/一键报工 |
| GET  | `/work-report/batch-prep` | 批量报工准备（未完成工序 + 人员 + 单价金额） |
| GET  | `/work-report/records` | 报工记录查询 |
| GET  | `/work-report/stats` | 报工 KPI |
| GET  | `/work-report/pending` | 待报任务 |
| POST | `/work-report/submit` | 任务列表报工 |
| GET  | `/work-report/mo-progress` | 制令进度 |
| GET  | `/work-report/scan` | 扫码定位任务 |

## 业务校验

1. 派工单须 **已审核**（`cFlag = 1`）
2. `reportQty <= pendingQty`（人员待报 = planQty - fnQty）
3. `passQty + defectQty + reworkQty = reportQty`
4. 有不良品时须填写 `defectReason`

## SQL Server SF 集成

`WorkReportServiceImpl` 中标注了 `TODO`：回写 `WT` 派工明细完工数、人员完工数，并写入报工记录表（表名以 SF 实际为准）。

## 菜单

执行 `sql/dispatch_report_menu.mysql.sql` 增加「派工报工」菜单（code: `dispatchReport`）。
