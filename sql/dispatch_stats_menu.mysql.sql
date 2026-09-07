-- 人员派工报工统计（挂在采购管理下）
SET NAMES utf8mb4;

INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754611,
  2083134009698754601,
  'dispatchStats',
  '派工报工统计',
  'menu',
  '/procurement/dispatchStats/index',
  'bar-chart-box-line',
  8,
  1,
  0,
  1,
  'views/procurement/dispatchStats/index',
  '人员派工报工统计看板：工时、完成率、计件工资',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754611 OR code = 'dispatchStats')
);

UPDATE blade_menu
SET name = '派工报工统计',
    path = '/procurement/dispatchStats/index',
    component = 'views/procurement/dispatchStats/index',
    source = 'bar-chart-box-line',
    sort = 8,
    remark = '人员派工报工统计看板：工时、完成率、计件工资'
WHERE is_deleted = 0 AND code = 'dispatchStats';

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754711,
  2083134009698754611,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754611 AND role_id = 1123598816738675201
);
