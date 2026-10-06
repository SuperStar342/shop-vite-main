package org.springblade.modules.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.springblade.modules.product.pojo.entity.Product;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {
}
