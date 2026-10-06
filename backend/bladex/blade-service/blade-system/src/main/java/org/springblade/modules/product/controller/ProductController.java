package org.springblade.modules.product.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.github.xiaoymin.knife4j.annotations.ApiOperationSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springblade.core.boot.ctrl.BladeController;
import org.springblade.core.mp.support.Condition;
import org.springblade.core.mp.support.Query;
import org.springblade.core.tool.api.R;
import org.springblade.core.tool.utils.Func;
import org.springblade.modules.product.pojo.entity.Product;
import org.springblade.modules.product.pojo.vo.ProductVO;
import org.springblade.modules.product.service.IProductService;
import org.springframework.web.bind.annotation.*;

/**
 * 商品管理 · 产品（SPU）
 * <p>前端代理：/api/blade-system/product/**</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/product")
@Tag(name = "商品管理-产品")
public class ProductController extends BladeController {

	private final IProductService productService;

	@GetMapping("/list")
	@ApiOperationSupport(order = 1)
	@Operation(summary = "分页列表")
	public R<IPage<Product>> list(Product query, Query pageQuery, @RequestParam(required = false) String keyword) {
		IPage<Product> page = Condition.getPage(pageQuery);
		return R.data(productService.page(page, query == null ? new Product() : query, keyword));
	}

	@GetMapping("/detail")
	@ApiOperationSupport(order = 2)
	@Operation(summary = "详情（含规格）")
	public R<ProductVO> detail(@RequestParam Long id) {
		return R.data(productService.detail(id));
	}

	@PostMapping("/submit")
	@ApiOperationSupport(order = 3)
	@Operation(summary = "新增或修改（含规格）")
	public R<Boolean> submit(@RequestBody ProductVO vo) {
		return R.status(productService.submit(vo));
	}

	@PostMapping("/remove")
	@ApiOperationSupport(order = 4)
	@Operation(summary = "删除")
	public R<Boolean> remove(@RequestParam String ids) {
		return R.status(productService.remove(Func.toLongList(ids)));
	}

	@PostMapping("/on-shelf")
	@ApiOperationSupport(order = 5)
	@Operation(summary = "上架/下架")
	public R<Boolean> updateOnShelf(@RequestParam Long id, @RequestParam Integer isOnShelf) {
		return R.status(productService.updateOnShelf(id, isOnShelf));
	}

	@PostMapping("/audit")
	@ApiOperationSupport(order = 6)
	@Operation(summary = "审核（通过/驳回）")
	public R<Boolean> updateAuditStatus(
		@RequestParam Long id,
		@RequestParam Integer auditStatus,
		@RequestParam(required = false) String auditRemark,
		@RequestParam(required = false, defaultValue = "true") Boolean autoOnShelf
	) {
		return R.status(productService.updateAuditStatus(id, auditStatus, auditRemark, autoOnShelf));
	}

	@GetMapping("/dashboard")
	@ApiOperationSupport(order = 7)
	@Operation(summary = "商品驾驶舱统计")
	public R<java.util.Map<String, Object>> dashboard() {
		return R.data(productService.dashboard());
	}
}
