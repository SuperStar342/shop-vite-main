package org.springblade.modules.procurement.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 批量报工准备数据（按派工单聚合未完成工序与人员）
 */
@Data
@Schema(description = "批量报工准备数据")
public class BatchReportPrepVO {

	@Schema(description = "派工单号")
	private String wtNo;

	@Schema(description = "车间")
	private String wsName;

	@Schema(description = "部门")
	private String deptName;

	@Schema(description = "待报工序数")
	private Integer pendingItemCount;

	@Schema(description = "待报数量合计")
	private BigDecimal totalPendingQty;

	@Schema(description = "预估报工金额合计")
	private BigDecimal totalReportAmt;

	@Schema(description = "工序行")
	private List<BatchReportItemVO> items = new ArrayList<>();

	@Data
	@Schema(description = "批量报工工序行")
	public static class BatchReportItemVO {

		private String itemKey;
		private String woNo;
		private String moNo;
		private String goodsCode;
		private String goodsName;
		private String prcCode;
		private String prcName;
		private BigDecimal wtQty;
		private BigDecimal fnQty;
		private BigDecimal pendingQty;
		private BigDecimal machiningUp;
		private BigDecimal machiningAmt;
		private BigDecimal reportAmt;
		private String pWageType;
		private String assignType;
		private String workGpName;
		private List<BatchReportWorkerVO> workers = new ArrayList<>();
	}

	@Data
	@Schema(description = "批量报工人员行")
	public static class BatchReportWorkerVO {

		private String empNo;
		private String empName;
		private String deptName;
		private BigDecimal planQty;
		private BigDecimal fnQty;
		private BigDecimal pendingQty;
		private BigDecimal machiningUp;
		private BigDecimal reportAmt;
	}

}
