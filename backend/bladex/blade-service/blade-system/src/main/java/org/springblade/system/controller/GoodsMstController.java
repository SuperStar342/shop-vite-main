package org.springblade.system.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.github.xiaoymin.knife4j.annotations.ApiOperationSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springblade.core.boot.ctrl.BladeController;
import org.springblade.core.tool.api.R;
import org.springblade.core.tool.utils.BeanUtil;
import org.springblade.core.tool.utils.Func;
import org.springblade.system.pojo.entity.GoodsMst;
import org.springblade.system.pojo.vo.GoodsMstVO;
import org.springblade.system.service.IGoodsMstService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@AllArgsConstructor
@RequestMapping("/goods-mst")
@Tag(name = "材料资料管理", description = "材料资料管理")
public class GoodsMstController extends BladeController {

	private final IGoodsMstService goodsMstService;

	@GetMapping("/detail")
	@ApiOperationSupport(order = 1)
	@Operation(summary = "详情", description = "根据id查询")
	public R<GoodsMstVO> detail(@RequestParam Integer id) {
		GoodsMst detail = goodsMstService.getById(id);
		return R.data(Objects.requireNonNull(BeanUtil.copyProperties(detail, GoodsMstVO.class)));
	}

	@GetMapping("/list")
	@Parameters({
		@Parameter(name = "goodsCode", description = "材料编码", in = ParameterIn.QUERY, schema = @Schema(type = "string")),
		@Parameter(name = "goodsName", description = "材料名称", in = ParameterIn.QUERY, schema = @Schema(type = "string")),
		@Parameter(name = "sortCode", description = "类别代码", in = ParameterIn.QUERY, schema = @Schema(type = "string"))
	})
	@ApiOperationSupport(order = 2)
	@Operation(summary = "分页", description = "传入查询条件")
	public R<IPage<GoodsMstVO>> list(
		@RequestParam(required = false) String goodsCode,
		@RequestParam(required = false) String goodsName,
		@RequestParam(required = false) String sortCode,
		@RequestParam(defaultValue = "1") Integer current,
		@RequestParam(defaultValue = "20") Integer size) {

		Page<GoodsMst> page = new Page<>(current, size);
		QueryWrapper<GoodsMst> wrapper = new QueryWrapper<>();
		if (Func.isNotBlank(goodsCode)) {
			wrapper.like("fGoodsCode", goodsCode);
		}
		if (Func.isNotBlank(goodsName)) {
			wrapper.like("fGoodsName", goodsName);
		}
		if (Func.isNotBlank(sortCode)) {
			wrapper.eq("fSortCode", sortCode);
		}
		wrapper.orderByDesc("fGoodsID");

		Page<GoodsMst> result = goodsMstService.page(page, wrapper);
		List<GoodsMstVO> voList = result.getRecords().stream()
			.map(item -> BeanUtil.copyProperties(item, GoodsMstVO.class))
			.collect(Collectors.toList());

		Page<GoodsMstVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
		voPage.setRecords(voList);
		return R.data(voPage);
	}

	@PostMapping("/submit")
	@ApiOperationSupport(order = 3)
	@Operation(summary = "新增或修改", description = "传入goodsMst")
	public R submit(@Valid @RequestBody GoodsMst goodsMst) {
		return R.status(goodsMstService.saveOrUpdate(goodsMst));
	}

	@PostMapping("/remove")
	@ApiOperationSupport(order = 4)
	@Operation(summary = "物理删除", description = "传入ids")
	public R remove(@Parameter(description = "主键集合", required = true) @RequestParam String ids) {
		List<Integer> idList = Func.toIntList(ids);
		return R.status(goodsMstService.removeByIds(idList));
	}
}
