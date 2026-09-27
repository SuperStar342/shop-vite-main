package org.springblade.modules.product.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import org.springblade.modules.product.pojo.entity.Product;
import org.springblade.modules.product.pojo.vo.ProductVO;

import java.util.List;

public interface IProductService {

	IPage<Product> page(IPage<Product> page, Product query, String keyword);

	ProductVO detail(Long id);

	boolean submit(ProductVO vo);

	boolean remove(List<Long> ids);

	boolean updateOnShelf(Long id, Integer isOnShelf);

	boolean updateAuditStatus(Long id, Integer auditStatus, String auditRemark, Boolean autoOnShelf);

	java.util.Map<String, Object> dashboard();
}
