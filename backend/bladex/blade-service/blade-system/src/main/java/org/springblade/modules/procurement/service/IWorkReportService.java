package org.springblade.modules.procurement.service;

import org.springblade.modules.procurement.pojo.dto.DispatchReportBatchDTO;
import org.springblade.modules.procurement.pojo.dto.DispatchReportDTO;
import org.springblade.modules.procurement.pojo.vo.BatchReportPrepVO;
import org.springblade.modules.procurement.pojo.vo.DispatchReportBatchResultVO;
import org.springblade.modules.procurement.pojo.vo.DispatchReportResultVO;

public interface IWorkReportService {

	DispatchReportResultVO submitDispatch(DispatchReportDTO dto);

	DispatchReportBatchResultVO submitBatch(DispatchReportBatchDTO batch);

	/**
	 * 按派工单加载未完成工序与人员待报量（含单价/金额）
	 */
	BatchReportPrepVO getBatchPrep(String wtNo);
}
