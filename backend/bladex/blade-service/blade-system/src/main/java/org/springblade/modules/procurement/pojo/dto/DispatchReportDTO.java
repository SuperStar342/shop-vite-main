package org.springblade.modules.procurement.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 派工页单笔报工
 */
@Data
@Schema(description = "派工报工提交")
public class DispatchReportDTO {

	@Schema(description = "派工单号", requiredMode = Schema.RequiredMode.REQUIRED)
	private String wtNo;

	private String woNo;
	private String moNo;
	private String goodsName;
	private String prcCode;
	private String prcName;
	private String empNo;
	private String empName;

	@Schema(description = "待报数量（校验用）")
	private BigDecimal pendingQty;

	@Schema(description = "本次报工数量", requiredMode = Schema.RequiredMode.REQUIRED)
	private BigDecimal reportQty;

	private BigDecimal passQty;
	private BigDecimal defectQty;
	private BigDecimal reworkQty;

	private String reportTime;
	private String defectReason;
	private String remark;
	private String reportMethod;
}
