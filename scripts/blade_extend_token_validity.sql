-- 延长 BladeX OAuth 令牌有效期（与前端 idleLogoutTime=1小时 配合）
-- 有操作时前端自动 refresh；无操作满 1 小时由前端踢回登录页
-- access: 24小时；refresh: 30天
UPDATE blade_client
SET access_token_validity = 86400,
    refresh_token_validity = 2592000
WHERE is_deleted = 0;

SELECT client_id, access_token_validity, refresh_token_validity
FROM blade_client
WHERE is_deleted = 0;
