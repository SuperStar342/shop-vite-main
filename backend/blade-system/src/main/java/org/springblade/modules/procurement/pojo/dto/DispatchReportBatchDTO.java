package org.springblade.modules.procurement.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "批量/一键报工")
public class DispatchReportBatchDTO {

	@Schema(description = "报工明细列表", requiredMode = Schema.RequiredMode.REQUIRED)
	private List<DispatchReportDTO> payloads;
}
