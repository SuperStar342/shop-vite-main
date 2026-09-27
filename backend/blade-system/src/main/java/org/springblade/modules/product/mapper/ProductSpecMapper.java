package org.springblade.modules.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springblade.modules.product.pojo.entity.ProductSpec;

@Mapper
public interface ProductSpecMapper extends BaseMapper<ProductSpec> {

	/**
	 * 物理删除某商品下全部 SKU（绕过逻辑删除，避免 uk_spec_code 残留冲突）
	 */
	@Delete("DELETE FROM blade_product_spec WHERE product_id = #{productId}")
	int physicalDeleteByProductId(@Param("productId") Long productId);

	/**
	 * 物理清理指定编码且已逻辑删除的 SKU
	 */
	@Delete("DELETE FROM blade_product_spec WHERE is_deleted = 1 AND spec_code = #{specCode}")
	int physicalDeleteSoftDeletedByCode(@Param("specCode") String specCode);
}
