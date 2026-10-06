package org.springblade.modules.product.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springblade.modules.product.mapper.ProductSpecMapper;
import org.springblade.modules.product.pojo.entity.ProductSpec;
import org.springblade.modules.product.service.IProductSpecService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductSpecServiceImpl extends ServiceImpl<ProductSpecMapper, ProductSpec> implements IProductSpecService {

	private final JdbcTemplate jdbcTemplate;

	@Override
	public List<ProductSpec> listByProductId(Long productId) {
		return baseMapper.selectList(
			Wrappers.<ProductSpec>lambdaQuery()
				.eq(ProductSpec::getProductId, productId)
				.eq(ProductSpec::getIsDeleted, 0)
				.orderByAsc(ProductSpec::getIsDefault)
				.orderByAsc(ProductSpec::getId)
		);
	}

	@Override
	public boolean removeByProductId(Long productId) {
		return physicalRemoveByProductId(productId);
	}

	/**
	 * 走 JdbcTemplate 物理删除，彻底绕过 MP 逻辑删除拦截器
	 *（自定义 @Delete 在部分 BladeX 版本仍会被改写成 UPDATE is_deleted=1）。
	 */
	@Override
	public boolean physicalRemoveByProductId(Long productId) {
		if (productId == null) {
			return false;
		}
		jdbcTemplate.update("DELETE FROM blade_product_spec WHERE product_id = ?", productId);
		return true;
	}

	@Override
	public boolean physicalRemoveSoftDeletedByCodes(Collection<String> codes) {
		if (codes == null || codes.isEmpty()) {
			return false;
		}
		for (String code : codes) {
			if (code != null && !code.isBlank()) {
				jdbcTemplate.update(
					"DELETE FROM blade_product_spec WHERE is_deleted <> 0 AND spec_code = ?",
					code.trim()
				);
			}
		}
		// 空编码逻辑删除残留也会堵住 uk(tenant_id,'',1)
		jdbcTemplate.update("DELETE FROM blade_product_spec WHERE is_deleted <> 0 AND (spec_code IS NULL OR spec_code = '')");
		return true;
	}
}
