package org.springblade.modules.procurement.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "批量报工结果")
public class DispatchReportBatchResultVO {

	private int successCount;
	private int failCount;
	private List<String> reportNos = new ArrayList<>();
	private List<DispatchReportErrorVO> errors = new ArrayList<>();

	@Data
	public static class DispatchReportErrorVO {
		private String empNo;
		private String empName;
		private String message;
	}
}
