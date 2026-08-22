-- 延长 BladeX OAuth 令牌有效期（避免操作中途被踢回登录）
-- access: 24小时；refresh: 30天
UPDATE blade_client
SET access_token_validity = 86400,
    refresh_token_validity = 2592000
WHERE is_deleted = 0;

SELECT client_id, access_token_validity, refresh_token_validity
FROM blade_client
WHERE is_deleted = 0;
