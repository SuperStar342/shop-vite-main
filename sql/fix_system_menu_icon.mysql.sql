-- 为「系统管理」菜单设置侧边栏图标（Remix Icon）
-- 前端也会在 source 为空时自动回退为 settings-3-line

UPDATE blade_menu
SET source = 'settings-3-line'
WHERE is_deleted = 0
  AND (
    name LIKE '%系统管理%'
    OR code IN ('system', 'System', 'systemManagement', 'SystemManagement')
  )
  AND (IFNULL(source, '') = '' OR source = 'icon-caidan' OR source = 'null');
