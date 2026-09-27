package org.springblade.modules.product.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springblade.modules.product.mapper.ProductSpecMapper;
import org.springblade.modules.product.pojo.entity.ProductSpec;
import org.springblade.modules.product.service.IProductSpecService;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductSpecServiceImpl extends ServiceImpl<ProductSpecMapper, ProductSpec> implements IProductSpecService {

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
		// 保存商品会整批替换 SKU：必须物理删除，否则逻辑删除行仍占用 uk_spec_code
		return physicalRemoveByProductId(productId);
	}

	@Override
	public boolean physicalRemoveByProductId(Long productId) {
		if (productId == null) {
			return false;
		}
		return baseMapper.physicalDeleteByProductId(productId) >= 0;
	}

	@Override
	public boolean physicalRemoveSoftDeletedByCodes(Collection<String> codes) {
		if (codes == null || codes.isEmpty()) {
			return false;
		}
		for (String code : codes) {
			if (code != null && !code.isBlank()) {
				baseMapper.physicalDeleteSoftDeletedByCode(code.trim());
			}
		}
		return true;
	}
}
