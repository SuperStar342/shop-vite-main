package org.springblade.modules.procurement.controller;

import com.github.xiaoymin.knife4j.annotations.ApiOperationSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springblade.core.boot.ctrl.BladeController;
import org.springblade.core.secure.annotation.PreAuth;
import org.springblade.core.tool.api.R;
import org.springblade.modules.procurement.pojo.dto.DispatchReportBatchDTO;
import org.springblade.modules.procurement.pojo.dto.DispatchReportDTO;
import org.springblade.modules.procurement.pojo.vo.BatchReportPrepVO;
import org.springblade.modules.procurement.pojo.vo.DispatchReportBatchResultVO;
import org.springblade.modules.procurement.pojo.vo.DispatchReportResultVO;
import org.springblade.modules.procurement.service.IWorkReportService;
import org.springframework.web.bind.annotation.*;

/**
 * 报工接口（派工报工 / 报工管理共用）
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/work-report")
@Tag(name = "报工管理", description = "派工报工与任务报工")
public class WorkReportController extends BladeController {

	private final IWorkReportService workReportService;

	@PostMapping("/submit-dispatch")
	@PreAuth(menu = "dispatchReport")
	@ApiOperationSupport(order = 1)
	@Operation(summary = "派工上下文单笔报工")
	public R<DispatchReportResultVO> submitDispatch(@RequestBody DispatchReportDTO dto) {
		return R.data(workReportService.submitDispatch(dto));
	}

	@PostMapping("/submit-batch")
	@PreAuth(menu = "dispatchReport")
	@ApiOperationSupport(order = 2)
	@Operation(summary = "批量/一键报工")
	public R<DispatchReportBatchResultVO> submitBatch(@RequestBody DispatchReportBatchDTO batch) {
		return R.data(workReportService.submitBatch(batch));
	}

	@GetMapping("/batch-prep")
	@PreAuth(menu = "dispatchReport")
	@ApiOperationSupport(order = 3)
	@Operation(summary = "批量报工准备数据")
	public R<BatchReportPrepVO> batchPrep(@RequestParam String wtNo) {
		return R.data(workReportService.getBatchPrep(wtNo));
	}
}
