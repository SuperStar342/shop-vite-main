package org.springblade.system.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
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
import org.springblade.core.mp.support.Condition;
import org.springblade.core.mp.support.Query;
import org.springblade.core.secure.annotation.PreAuth;
import org.springblade.core.tool.api.R;
import org.springblade.core.tool.utils.Func;
import org.springblade.system.pojo.entity.MaterialCategory;
import org.springblade.system.pojo.vo.MaterialCategoryVO;
import org.springblade.system.service.IMaterialCategoryService;
import org.springblade.system.wrapper.MaterialCategoryWrapper;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@AllArgsConstructor
@PreAuth(menu = "materialCategory,MaterialCategoryManagement")
@RequestMapping("/material-category")
@Tag(name = "材料类别管理", description = "材料类别管理")
public class MaterialCategoryController extends BladeController {

    private final IMaterialCategoryService materialCategoryService;

    @GetMapping("/detail")
    @ApiOperationSupport(order = 1)
    @Operation(summary = "详情", description = "传入materialCategory")
    public R<MaterialCategoryVO> detail(MaterialCategory materialCategory) {
        MaterialCategory detail = materialCategoryService.getOne(Condition.getQueryWrapper(materialCategory));
        return R.data(MaterialCategoryWrapper.build().entityVO(detail));
    }

    @GetMapping("/list")
    @Parameters({
        @Parameter(name = "categoryName", description = "类别名称", in = ParameterIn.QUERY, schema = @Schema(type = "string")),
        @Parameter(name = "categoryCode", description = "类别编码", in = ParameterIn.QUERY, schema = @Schema(type = "string"))
    })
    @ApiOperationSupport(order = 2)
    @Operation(summary = "分页", description = "传入materialCategory")
    public R<IPage<MaterialCategoryVO>> list(@Parameter(hidden = true) @RequestParam Map<String, Object> params, Query query) {
        IPage<MaterialCategory> pages = materialCategoryService.page(Condition.getPage(query), Condition.getQueryWrapper(params, MaterialCategory.class));
        return R.data(MaterialCategoryWrapper.build().pageVO(pages));
    }

    @PostMapping("/submit")
    @ApiOperationSupport(order = 3)
    @Operation(summary = "新增或修改", description = "传入materialCategory")
    public R submit(@Valid @RequestBody MaterialCategory materialCategory) {
        return R.status(materialCategoryService.saveOrUpdate(materialCategory));
    }

    @PostMapping("/remove")
    @ApiOperationSupport(order = 4)
    @Operation(summary = "逻辑删除", description = "传入ids")
    public R remove(@Parameter(description = "主键集合", required = true) @RequestParam String ids) {
        return R.status(materialCategoryService.deleteLogic(Func.toLongList(ids)));
    }
}