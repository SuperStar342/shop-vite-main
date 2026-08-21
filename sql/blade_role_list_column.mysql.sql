-- 角色列表列权限（角色管理 → 权限 → 列表权限）
-- 执行后重启 blade-system

CREATE TABLE IF NOT EXISTS `blade_role_list_column` (
  `id`              bigint       NOT NULL COMMENT '主键',
  `tenant_id`       varchar(12)  DEFAULT '000000' COMMENT '租户ID',
  `role_id`         bigint       NOT NULL COMMENT '角色ID',
  `page_code`       varchar(64)  NOT NULL COMMENT '页面编码(路由name)',
  `page_name`       varchar(64)  DEFAULT NULL COMMENT '页面名称',
  `visible_columns` varchar(2000) DEFAULT NULL COMMENT '可见列prop，逗号分隔',
  `remark`          varchar(255) DEFAULT NULL COMMENT '备注',
  `create_user`     bigint       DEFAULT NULL COMMENT '创建人',
  `create_dept`     bigint       DEFAULT NULL COMMENT '创建部门',
  `create_time`     datetime     DEFAULT NULL COMMENT '创建时间',
  `update_user`     bigint       DEFAULT NULL COMMENT '修改人',
  `update_time`     datetime     DEFAULT NULL COMMENT '修改时间',
  `status`          int          DEFAULT 1 COMMENT '状态',
  `is_deleted`      int          DEFAULT 0 COMMENT '是否已删除',
  PRIMARY KEY (`id`),
  KEY `idx_role_list_column_role` (`role_id`),
  KEY `idx_role_list_column_page` (`page_code`),
  UNIQUE KEY `uk_tenant_role_page` (`tenant_id`, `role_id`, `page_code`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色列表列权限';
