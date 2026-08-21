-- 采购管理挂到「首页」下方 + 物料类别演示数据
-- 库：shop_vite（业务表）/ blade（若菜单在此库也执行相同 UPDATE）

-- 1) 菜单：采购管理作为「首页」子菜单
UPDATE blade_menu
SET parent_id = 2081960438830845954,
    sort = 3
WHERE id = 2083134009698754601;

-- 2) 遗留触发器依赖表（若缺失会导致 INSERT 失败）
CREATE TABLE IF NOT EXISTS t_BOMM_GoodsMst LIKE blade_bomm_goodsmst;
CREATE TABLE IF NOT EXISTS t_BOMD_BOMmritem (fGoodsID int NOT NULL, PRIMARY KEY (fGoodsID));
CREATE TABLE IF NOT EXISTS t_BOMD_BOMitem (
  fGoodsID int NOT NULL,
  fSubGoodsID int NULL,
  fUnitCode varchar(6) NULL,
  KEY (fGoodsID),
  KEY (fSubGoodsID)
);
CREATE TABLE IF NOT EXISTS t_BOMD_fgptlist (fPtGoodsID int NOT NULL, KEY (fPtGoodsID));
CREATE TABLE IF NOT EXISTS t_BOMM_GoodsExtendPropMst (fGoodsID int NOT NULL, PRIMARY KEY (fGoodsID));
CREATE TABLE IF NOT EXISTS t_BOMM_GoodsMst_PicForCRM (fGoodsCode varchar(50) NOT NULL, PRIMARY KEY (fGoodsCode));

-- 3) 演示类别树（fIfCategory=1），按需执行
INSERT INTO blade_bomm_goodsmst (
  fGoodsID, fGoodsType, fGoodsCode, fGoodsName, fBelongTo, fSharedIndex, fIfUse, fRemark,
  fQCMode, fDaysOfChk, fDaysBefPur, fIfCategory, fStdUnit, fBusinessUnit, fStkUnit,
  fBrandCode, fSortCode, fEdition, fCDate, fCFlag
) VALUES
(1, 'C', '3', '全部', 0, 0, '1', '根节点', '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '3', 1.00, NOW(), '4'),
(2, 'C', '301', '材料', 1, 1, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '301', 1.00, NOW(), '4'),
(3, 'C', '30101', '天然材料', 2, 1, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '30101', 1.00, NOW(), '4'),
(4, 'C', '30102', '辅料品', 2, 2, '1', NULL, '1', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '30102', 1.00, NOW(), '4'),
(5, 'C', '30103', '木材', 2, 3, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '30103', 1.00, NOW(), '4'),
(6, 'C', '30104', '人造板', 2, 4, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '30104', 1.00, NOW(), '4'),
(7, 'C', '30105', '紧固件', 2, 5, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '30105', 1.00, NOW(), '4'),
(8, 'C', '3010101', '皮革类', 3, 1, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '3010101', 1.00, NOW(), '4'),
(9, 'C', '3010102', '纱线', 3, 2, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '3010102', 1.00, NOW(), '4'),
(10, 'C', '3010501', '螺钉', 7, 1, '1', NULL, '2', 0, 0, '1', 'PCS', 'PCS', 'PCS', '', '3010501', 1.00, NOW(), '4')
ON DUPLICATE KEY UPDATE fGoodsName = VALUES(fGoodsName), fBelongTo = VALUES(fBelongTo);
