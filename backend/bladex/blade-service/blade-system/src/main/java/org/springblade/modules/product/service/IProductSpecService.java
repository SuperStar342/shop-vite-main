package org.springblade.modules.product.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.springblade.modules.product.pojo.entity.ProductSpec;

import java.util.List;

public interface IProductSpecService extends IService<ProductSpec> {

	List<ProductSpec> listByProductId(Long productId);

	boolean removeByProductId(Long productId);

	/** 物理删除商品下全部 SKU（含已逻辑删除行） */
	boolean physicalRemoveByProductId(Long productId);

	/** 物理清理已逻辑删除且编码命中的 SKU */
	boolean physicalRemoveSoftDeletedByCodes(java.util.Collection<String> codes);
}
