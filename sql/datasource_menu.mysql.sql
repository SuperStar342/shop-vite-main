-- 系统管理 - 数据源管理菜单 + SF 种子数据源
SET NAMES utf8mb4;

-- 菜单：系统管理下
INSERT INTO blade_menu (
  id, parent_id, code, name, alias, path, source, sort, category, action, is_open, component, remark, is_deleted
)
SELECT
  2083134009698754801,
  1123598815738675203,
  'datasourceManagement',
  '数据源管理',
  'menu',
  '/system/datasourceManagement/index',
  'database-2-line',
  20,
  1,
  0,
  1,
  'views/system/datasourceManagement/index',
  '动态 JDBC 数据源配置',
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_menu WHERE is_deleted = 0 AND (id = 2083134009698754801 OR code = 'datasourceManagement')
);

INSERT INTO blade_role_menu (id, menu_id, role_id)
SELECT
  2083134009698754802,
  2083134009698754801,
  1123598816738675201
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_role_menu
  WHERE menu_id = 2083134009698754801 AND role_id = 1123598816738675201
);

-- 种子：指令管理用 SF SQL Server（名称须 kebab-case 小写）
INSERT INTO blade_tenant_datasource (
  id, category, name, driver_class, url, username, password, remark,
  create_user, create_dept, create_time, update_user, update_time, status, is_deleted
)
SELECT
  2083134009698754810,
  1,
  'sqlserver-sf',
  'com.microsoft.sqlserver.jdbc.SQLServerDriver',
  'jdbc:sqlserver://192.168.20.208:60168;SelectMethod=cursor;DatabaseName=F19_ERP_TEST;encrypt=false;trustServerCertificate=true',
  'sfsys',
  'SJIE#sf25.sql',
  '指令管理 SF ERP',
  1123598821738675201,
  1123598813738675201,
  NOW(),
  1123598821738675201,
  NOW(),
  1,
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM blade_tenant_datasource WHERE is_deleted = 0 AND (id = 2083134009698754810 OR name = 'sqlserver-sf')
);
