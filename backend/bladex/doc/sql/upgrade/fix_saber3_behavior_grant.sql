-- 为 saber3 客户端增加 behavior 授权类型（行为验证码登录）
-- 在业务库执行一次即可

UPDATE blade_client
SET authorized_grant_types = CONCAT(authorized_grant_types, ',behavior')
WHERE client_id = 'saber3'
  AND authorized_grant_types NOT LIKE '%behavior%';
