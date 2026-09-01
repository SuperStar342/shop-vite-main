package org.springblade.modules.procurement.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import org.springblade.modules.procurement.pojo.entity.NonProdUnitPrice;

import java.util.List;
import java.util.Map;

public interface INonProdUnitPriceService {

	IPage<NonProdUnitPrice> page(IPage<NonProdUnitPrice> page, NonProdUnitPrice query, String keyword);

	NonProdUnitPrice detail(Long id);

	boolean submit(NonProdUnitPrice entity);

	boolean remove(List<Long> ids);

	List<Map<String, Object>> typeStats();
}
