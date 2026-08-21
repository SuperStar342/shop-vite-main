-- ============================================================================
-- 修复 blade_bomm_goodsmst 与触发器依赖表的排序规则冲突
-- 错误: Illegal mix of collations (utf8mb4_general_ci,IMPLICIT) and
--       (utf8mb4_unicode_ci,IMPLICIT) for operation '='
-- ============================================================================
-- 根因:
--   blade-system JDBC 连接排序规则一般为 utf8mb4_general_ci
--   blade_bomm_goodsmst 若为 utf8mb4_unicode_ci，则 WHERE fIfCategory='1'
--   以及触发器跨表比较（t_BOMM_* 桩表）会报 1267。
-- 修复: 统一为 utf8mb4_general_ci（与 Blade 连接一致）
-- ============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE shop_vite.blade_bomm_goodsmst
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE shop_vite.t_BOMM_GoodsMst
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE shop_vite.t_BOMD_BOMitem
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE shop_vite.t_BOMD_BOMmritem
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE shop_vite.t_BOMD_fgptlist
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE shop_vite.t_BOMM_GoodsExtendPropMst
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
ALTER TABLE shop_vite.t_BOMM_GoodsMst_PicForCRM
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 验证
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'shop_vite'
  AND TABLE_NAME IN (
    'blade_bomm_goodsmst',
    't_BOMM_GoodsMst',
    't_BOMD_BOMitem',
    't_BOMD_BOMmritem',
    't_BOMD_fgptlist',
    't_BOMM_GoodsExtendPropMst',
    't_BOMM_GoodsMst_PicForCRM'
  )
ORDER BY TABLE_NAME;
-- 预期：全部为 utf8mb4_general_ci
