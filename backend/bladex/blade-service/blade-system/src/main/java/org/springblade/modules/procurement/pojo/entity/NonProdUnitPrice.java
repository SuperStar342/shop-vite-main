package org.springblade.modules.procurement.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

import java.math.BigDecimal;

/**
 * 非生产派工 · 单价设置
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("blade_non_prod_unit_price")
@Schema(description = "非生产派工单价设置")
public class NonProdUnitPrice extends TenantEntity {

	@Schema(description = "派工类型代号")
	private String dispatchTypeCode;
	@Schema(description = "派工类型名称")
	private String dispatchTypeName;
	@Schema(description = "计件类型")
	private String pieceType;
	@Schema(description = "控制属性")
	private String controlAttr;
	@Schema(description = "单据名称")
	private String docName;
	@Schema(description = "品号")
	private String goodsCode;
	@Schema(description = "品名")
	private String goodsName;
	@Schema(description = "标准属性")
	private String stdAttr;
	@Schema(description = "单位名称")
	private String unitName;
	@Schema(description = "配料数量")
	private BigDecimal ratioQty;
	@Schema(description = "计件单价")
	private BigDecimal piecePrice;
	@Schema(description = "备注")
	private String remark;
	@Schema(description = "单位")
	private String unitCode;
	@Schema(description = "资源固定代号")
	private String resourceFixedCode;
	@Schema(description = "是否允许修改单价")
	private String allowEditPrice;
	@Schema(description = "建立人")
	private String creator;
	@Schema(description = "建立人代号")
	private String creatorCode;
	@Schema(description = "建立日期")
	private String createDate;
	@Schema(description = "修改人")
	private String modifier;
	@Schema(description = "修改人代号")
	private String modifierCode;
	@Schema(description = "修改日期")
	private String modifyDate;
}
