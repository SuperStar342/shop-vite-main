package org.springblade.modules.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.springblade.modules.product.pojo.entity.ProductSpec;

/**
 * SKU Mapper。物理删除请走 {@code ProductSpecServiceImpl} 中的 JdbcTemplate，
 * 避免 MyBatis-Plus 逻辑删除拦截器把 DELETE 改写成 UPDATE。
 */
@Mapper
public interface ProductSpecMapper extends BaseMapper<ProductSpec> {
}
