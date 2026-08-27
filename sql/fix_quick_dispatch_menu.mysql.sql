-- 修复：派工报工菜单曾误用 id=4607，覆盖「按工单派工 / quickDispatch」
-- 执行顺序：先本脚本恢复快捷派工，再执行 dispatch_report_menu.mysql.sql（id=4610）
SET NAMES utf8mb4;

-- 1) 恢复按工单派工（快捷派工）菜单
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754607,
  2083134009698754601,
  'quickDispatch',
  '按工单派工',
  'menu',
  '/procurement/quickDispatch/index',
  'user-shared-line',
  6,
  1,
  0,
  1,
  'views/procurement/quickDispatch/index',
  '按工单选择工序与工人生成派工单（SQL Server SF）',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND code = 'quickDispatch'
);

UPDATE blade_menu
SET parent_id = 2083134009698754601,
    code = 'quickDispatch',
    name = '按工单派工',
    alias = 'menu',
    path = '/procurement/quickDispatch/index',
    source = 'user-shared-line',
    sort = 6,
    category = 1,
    action = 0,
    is_open = 1,
    component = 'views/procurement/quickDispatch/index',
    remark = '按工单选择工序与工人生成派工单（SQL Server SF）',
    is_deleted = 0
WHERE id = 2083134009698754607 OR code = 'quickDispatch';

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754707,
  2083134009698754607,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754607 AND role_id = 1123598816738675201
);

-- 2) 若 id=4607 曾被改成 dispatchReport，迁移到独立 id=4610
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754610,
  2083134009698754601,
  'dispatchReport',
  '派工报工',
  'menu',
  '/procurement/dispatchReport/index',
  'checkbox-circle-line',
  7,
  1,
  0,
  1,
  'views/procurement/dispatchReport/index',
  '派工单工序报工、一键报满与进度汇总',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND code = 'dispatchReport'
);

UPDATE blade_menu
SET parent_id = 2083134009698754601,
    code = 'dispatchReport',
    name = '派工报工',
    alias = 'menu',
    path = '/procurement/dispatchReport/index',
    source = 'checkbox-circle-line',
    sort = 7,
    category = 1,
    action = 0,
    is_open = 1,
    component = 'views/procurement/dispatchReport/index',
    remark = '派工单工序报工、一键报满与进度汇总',
    is_deleted = 0
WHERE id = 2083134009698754610 OR code = 'dispatchReport';

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754710,
  2083134009698754610,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754610 AND role_id = 1123598816738675201
);
