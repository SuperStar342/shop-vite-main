package org.springblade.modules.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springblade.core.log.exception.ServiceException;
import org.springblade.core.tool.utils.Func;
import org.springblade.core.tool.utils.StringUtil;
import org.springblade.modules.product.mapper.ProductMapper;
import org.springblade.modules.product.pojo.entity.Product;
import org.springblade.modules.product.pojo.entity.ProductSpec;
import org.springblade.modules.product.pojo.vo.ProductVO;
import org.springblade.modules.product.service.IProductService;
import org.springblade.modules.product.service.IProductSpecService;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements IProductService {

	private final ProductMapper productMapper;
	private final IProductSpecService productSpecService;

	@Override
	public IPage<Product> page(IPage<Product> page, Product query, String keyword) {
		LambdaQueryWrapper<Product> qw = Wrappers.<Product>lambdaQuery()
			.eq(Product::getIsDeleted, 0)
			.eq(query.getProductStatus() != null, Product::getProductStatus, query.getProductStatus())
			.eq(query.getAuditStatus() != null, Product::getAuditStatus, query.getAuditStatus())
			.eq(query.getIsOnShelf() != null, Product::getIsOnShelf, query.getIsOnShelf())
			.eq(query.getCategoryId() != null, Product::getCategoryId, query.getCategoryId())
			.eq(query.getProductType() != null, Product::getProductType, query.getProductType())
			.eq(StringUtil.isNotBlank(query.getBrand()), Product::getBrand, query.getBrand())
			.like(StringUtil.isNotBlank(query.getCategoryPath()), Product::getCategoryPath, query.getCategoryPath())
			.and(StringUtil.isNotBlank(keyword), w -> w
				.like(Product::getProductName, keyword)
				.or().like(Product::getProductCode, keyword)
				.or().like(Product::getKeywords, keyword)
			)
			.orderByDesc(Product::getSortWeight)
			.orderByDesc(Product::getUpdateTime);
		IPage<Product> result = productMapper.selectPage(page, qw);
		fillSpecStock(result.getRecords());
		return result;
	}

	private void fillSpecStock(List<Product> records) {
		if (records == null || records.isEmpty()) {
			return;
		}
		List<Long> ids = records.stream().map(Product::getId).collect(Collectors.toList());
		List<ProductSpec> specs = productSpecService.list(
			Wrappers.<ProductSpec>lambdaQuery()
				.in(ProductSpec::getProductId, ids)
				.eq(ProductSpec::getIsDeleted, 0)
		);
		Map<Long, Integer> stockMap = new HashMap<>();
		Map<Long, Integer> countMap = new HashMap<>();
		for (ProductSpec spec : specs) {
			stockMap.merge(spec.getProductId(), Func.toInt(spec.getSpecStock(), 0), Integer::sum);
			countMap.merge(spec.getProductId(), 1, Integer::sum);
		}
		for (Product product : records) {
			product.setSpecStock(stockMap.getOrDefault(product.getId(), 0));
			product.setSpecCount(countMap.getOrDefault(product.getId(), 0));
		}
	}

	@Override
	public java.util.Map<String, Object> dashboard() {
		List<Product> all = productMapper.selectList(
			Wrappers.<Product>lambdaQuery().eq(Product::getIsDeleted, 0)
		);
		int total = all.size();
		int onSale = 0, draft = 0, pending = 0, rejected = 0, missing = 0, stop = 0;
		int scoreSum = 0;
		for (Product p : all) {
			int ps = Func.toInt(p.getProductStatus(), 0);
			int as = p.getAuditStatus() == null ? -1 : p.getAuditStatus();
			if (ps == 1) onSale++;
			else if (ps == 0) draft++;
			else if (ps == 2 || ps == 3) stop++;
			if (as == 0) pending++;
			if (as == 2) rejected++;
			boolean miss = StringUtil.isBlank(p.getMainImage())
				|| p.getMemberPrice() == null && p.getRetailPrice() == null
				|| StringUtil.isBlank(p.getCategoryPath());
			if (miss) missing++;
			int score = 0;
			if (StringUtil.isNotBlank(p.getProductName()) && StringUtil.isNotBlank(p.getProductCode())) score += 20;
			if (StringUtil.isNotBlank(p.getMainImage())) score += 20;
			if (p.getMemberPrice() != null || p.getRetailPrice() != null) score += 15;
			if (StringUtil.isNotBlank(p.getCategoryPath())) score += 10;
			if (StringUtil.isNotBlank(p.getBrand())) score += 10;
			if (StringUtil.isNotBlank(p.getVideoUrl())) score += 10;
			if (StringUtil.isNotBlank(p.getModel3dUrl())) score += 10;
			if (p.getDetailImages() != null && !p.getDetailImages().isEmpty()) score += 5;
			scoreSum += Math.min(score, 100);
		}
		java.util.Map<String, Object> map = new HashMap<>();
		map.put("total", total);
		map.put("onSale", onSale);
		map.put("draft", draft);
		map.put("pending", pending);
		map.put("rejected", rejected);
		map.put("stopped", stop);
		map.put("missing", missing);
		map.put("avgCompleteness", total == 0 ? 0 : Math.round((float) scoreSum / total));
		return map;
	}

	@Override
	public ProductVO detail(Long id) {
		Product product = productMapper.selectById(id);
		if (product == null || Func.toInt(product.getIsDeleted(), 0) == 1) {
			throw new ServiceException("产品不存在");
		}
		ProductVO vo = new ProductVO();
		BeanUtils.copyProperties(product, vo);
		vo.setSpecs(productSpecService.listByProductId(id));
		return vo;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean submit(ProductVO vo) {
		if (vo == null) {
			throw new ServiceException("提交数据为空");
		}
		if (StringUtil.isBlank(vo.getProductCode())) {
			throw new ServiceException("产品编码不能为空");
		}
		if (StringUtil.isBlank(vo.getProductName())) {
			throw new ServiceException("产品名称不能为空");
		}

		Product existed = productMapper.selectOne(
			Wrappers.<Product>lambdaQuery()
				.eq(Product::getProductCode, vo.getProductCode())
				.eq(Product::getIsDeleted, 0)
				.last("LIMIT 1")
		);
		if (existed != null && (vo.getId() == null || !existed.getId().equals(vo.getId()))) {
			throw new ServiceException("产品编码已存在");
		}

		Product product = new Product();
		BeanUtils.copyProperties(vo, product);

		if (Func.toInt(product.getAuditStatus(), -1) == 0) {
			product.setAuditRemark("");
		}

		boolean ok;
		if (product.getId() == null) {
			if (product.getProductStatus() == null) {
				product.setProductStatus(0);
			}
			if (product.getAuditStatus() == null) {
				product.setAuditStatus(-1);
			}
			if (product.getIsOnShelf() == null) {
				product.setIsOnShelf(0);
			}
			if (product.getIsRecommended() == null) {
				product.setIsRecommended(0);
			}
			if (product.getIsNew() == null) {
				product.setIsNew(0);
			}
			if (product.getIsHot() == null) {
				product.setIsHot(0);
			}
			if (product.getSortWeight() == null) {
				product.setSortWeight(0);
			}
			if (product.getMinOrderQty() == null) {
				product.setMinOrderQty(1);
			}
			ok = productMapper.insert(product) > 0;
		} else {
			Product db = productMapper.selectById(product.getId());
			if (db == null || Func.toInt(db.getIsDeleted(), 0) == 1) {
				throw new ServiceException("产品不存在");
			}
			ok = productMapper.updateById(product) > 0;
		}

		if (ok && vo.getSpecs() != null) {
			syncSpecs(product.getId(), vo.getSpecs());
		}
		return ok;
	}

	/**
	 * 整批替换 SKU：物理清理本商品旧行后按编码校验再插入。
	 * BladeX 默认逻辑删除会留下 is_deleted=1 的记录，继续占用 uk_spec_code，导致再次保存 Duplicate entry。
	 */
	private void syncSpecs(Long productId, List<ProductSpec> specs) {
		java.util.LinkedHashSet<String> codes = new java.util.LinkedHashSet<>();
		for (ProductSpec spec : specs) {
			if (StringUtil.isBlank(spec.getSpecCode())) {
				throw new ServiceException("SKU 编码不能为空");
			}
			String code = spec.getSpecCode().trim();
			spec.setSpecCode(code);
			if (!codes.add(code)) {
				throw new ServiceException("SKU 编码重复：" + code);
			}
		}

		// 先清掉本商品全部 SKU（含历史逻辑删除行）
		productSpecService.physicalRemoveByProductId(productId);
		// 再清掉其他商品留下的、同编码逻辑删除残留，避免唯一索引冲突
		if (!codes.isEmpty()) {
			productSpecService.physicalRemoveSoftDeletedByCodes(codes);
		}

		for (String code : codes) {
			long occupied = productSpecService.count(
				Wrappers.<ProductSpec>lambdaQuery()
					.eq(ProductSpec::getSpecCode, code)
					.eq(ProductSpec::getIsDeleted, 0)
			);
			if (occupied > 0) {
				throw new ServiceException("SKU 编码已存在：" + code);
			}
		}

		for (ProductSpec spec : specs) {
			spec.setId(null);
			spec.setProductId(productId);
			spec.setIsDeleted(0);
			if (spec.getSpecStock() == null) {
				spec.setSpecStock(0);
			}
			if (spec.getIsDefault() == null) {
				spec.setIsDefault(0);
			}
			if (spec.getSpecStatus() == null) {
				spec.setSpecStatus(1);
			}
		}
		if (!specs.isEmpty()) {
			productSpecService.saveBatch(specs);
		}
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean remove(List<Long> ids) {
		if (ids == null || ids.isEmpty()) {
			throw new ServiceException("请选择要删除的记录");
		}
		for (Long id : ids) {
			Product product = productMapper.selectById(id);
			if (product != null) {
				product.setIsDeleted(1);
				productMapper.updateById(product);
				productSpecService.removeByProductId(id);
			}
		}
		return true;
	}

	@Override
	public boolean updateOnShelf(Long id, Integer isOnShelf) {
		Product product = productMapper.selectById(id);
		if (product == null || Func.toInt(product.getIsDeleted(), 0) == 1) {
			throw new ServiceException("产品不存在");
		}
		product.setIsOnShelf(isOnShelf);
		if (isOnShelf != null && isOnShelf == 1 && Func.toInt(product.getProductStatus(), 0) == 0) {
			product.setProductStatus(1);
		}
		return productMapper.updateById(product) > 0;
	}

	@Override
	public boolean updateAuditStatus(Long id, Integer auditStatus, String auditRemark, Boolean autoOnShelf) {
		Product product = productMapper.selectById(id);
		if (product == null || Func.toInt(product.getIsDeleted(), 0) == 1) {
			throw new ServiceException("产品不存在");
		}
		if (auditStatus == null || (auditStatus != 1 && auditStatus != 2)) {
			throw new ServiceException("审核状态无效");
		}
		if (auditStatus == 2 && StringUtil.isBlank(auditRemark)) {
			throw new ServiceException("驳回时请填写原因");
		}
		product.setAuditStatus(auditStatus);
		product.setAuditRemark(auditRemark == null ? "" : auditRemark.trim());
		product.setAuditTime(new java.util.Date());
		if (auditStatus == 1) {
			product.setProductStatus(1);
			if (Boolean.TRUE.equals(autoOnShelf)) {
				product.setIsOnShelf(1);
			}
		} else {
			product.setIsOnShelf(0);
			if (Func.toInt(product.getProductStatus(), 0) == 1) {
				product.setProductStatus(0);
			}
		}
		return productMapper.updateById(product) > 0;
	}
}
