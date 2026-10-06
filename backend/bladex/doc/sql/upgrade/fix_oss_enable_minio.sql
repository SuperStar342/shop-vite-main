-- 本地开发：启用 MinIO，停用演示用七牛配置
-- 执行前请确认 MinIO 已启动（默认 http://127.0.0.1:9000），并已创建桶 bladex

UPDATE blade_oss
SET status = 2
WHERE oss_code = 'qiniu' AND tenant_id = '000000';

UPDATE blade_oss
SET status = 1,
    endpoint = 'http://127.0.0.1:9000',
    transform_endpoint = 'http://127.0.0.1:9000',
    access_key = 'minioadmin',
    secret_key = 'minioadmin',
    bucket_name = 'bladex'
WHERE oss_code = 'minio' AND tenant_id = '000000';
