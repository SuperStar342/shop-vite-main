package org.springblade.modules.procurement.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "单笔报工结果")
public class DispatchReportResultVO {

	private String reportNo;
}
