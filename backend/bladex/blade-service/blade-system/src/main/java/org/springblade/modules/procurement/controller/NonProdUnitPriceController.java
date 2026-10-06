package org.springblade.modules.procurement.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.github.xiaoymin.knife4j.annotations.ApiOperationSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springblade.core.boot.ctrl.BladeController;
import org.springblade.core.mp.support.Condition;
import org.springblade.core.mp.support.Query;
import org.springblade.core.secure.annotation.PreAuth;
import org.springblade.core.tool.api.R;
import org.springblade.core.tool.utils.Func;
import org.springblade.modules.procurement.pojo.entity.NonProdUnitPrice;
import org.springblade.modules.procurement.service.INonProdUnitPriceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 非生产派工 · 单价设置
 * <p>合并到 BladeX blade-system 后生效。前端代理：/api/blade-system/non-prod/unit-price/**</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/non-prod/unit-price")
@Tag(name = "非生产派工-单价设置")
public class NonProdUnitPriceController extends BladeController {

	private final INonProdUnitPriceService unitPriceService;

	@GetMapping("/list")
	@PreAuth(menu = "unitPriceSetting")
	@ApiOperationSupport(order = 1)
	@Operation(summary = "分页列表")
	public R<IPage<NonProdUnitPrice>> list(NonProdUnitPrice query, Query pageQuery, @RequestParam(required = false) String keyword) {
		IPage<NonProdUnitPrice> page = Condition.getPage(pageQuery);
		return R.data(unitPriceService.page(page, query == null ? new NonProdUnitPrice() : query, keyword));
	}

	@GetMapping("/detail")
	@PreAuth(menu = "unitPriceSetting")
	@ApiOperationSupport(order = 2)
	@Operation(summary = "详情")
	public R<NonProdUnitPrice> detail(@RequestParam Long id) {
		return R.data(unitPriceService.detail(id));
	}

	@GetMapping("/type-stats")
	@PreAuth(menu = "unitPriceSetting")
	@ApiOperationSupport(order = 3)
	@Operation(summary = "按派工类型汇总")
	public R<List<Map<String, Object>>> typeStats() {
		return R.data(unitPriceService.typeStats());
	}

	@PostMapping("/submit")
	@PreAuth(menu = "unitPriceSetting")
	@ApiOperationSupport(order = 4)
	@Operation(summary = "新增或修改")
	public R<Boolean> submit(@RequestBody NonProdUnitPrice entity) {
		return R.status(unitPriceService.submit(entity));
	}

	@PostMapping("/remove")
	@PreAuth(menu = "unitPriceSetting")
	@ApiOperationSupport(order = 5)
	@Operation(summary = "删除")
	public R<Boolean> remove(@RequestParam String ids) {
		return R.status(unitPriceService.remove(Func.toLongList(ids)));
	}
}
