-- 反向恢复本次会话的菜单 alias / 图标改动
-- 用法: mysql --host=192.168.20.209 --user=root --password=1111 shop_vite < scripts\_reverse_session.sql
SET NAMES utf8mb4;

UPDATE blade_menu SET alias = 'menu' WHERE is_deleted = 0 AND code = 'system';
UPDATE blade_menu SET alias = 'menu' WHERE is_deleted = 0 AND code IN ('resource', 'oss', 'attach', 'sms');
UPDATE blade_menu SET source = 'folder-3-line' WHERE is_deleted = 0 AND code = 'resource';

SELECT code, alias, name, source
FROM blade_menu
WHERE is_deleted = 0 AND code IN ('system', 'resource', 'oss', 'attach', 'sms');
