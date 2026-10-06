package org.springblade.modules.product.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

import java.math.BigDecimal;

/**
 * 产品规格表（SKU）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "blade_product_spec")
@Schema(description = "产品规格表（SKU）")
public class ProductSpec extends TenantEntity {

	@Schema(description = "产品ID，关联 blade_product.id")
	private Long productId;

	@Schema(description = "规格 SKU 编码，业务唯一")
	private String specCode;

	@Schema(description = "规格名称")
	private String specName;

	@Schema(description = "规格售价（元）")
	private BigDecimal specPrice;

	@Schema(description = "规格会员价（元）")
	private BigDecimal specMemberPrice;

	@Schema(description = "规格成本价（元）")
	private BigDecimal specCostPrice;

	@Schema(description = "规格库存数量")
	private Integer specStock;

	@Schema(description = "规格计量单位")
	private String specUnit;

	@Schema(description = "规格对应图片 URL")
	private String specImage;

	@Schema(description = "是否默认规格：0-否 / 1-是")
	private Integer isDefault;

	@Schema(description = "规格状态：0-禁用 / 1-启用")
	private Integer specStatus;

	@Schema(description = "长 (mm)")
	private Integer length;

	@Schema(description = "宽 (mm)")
	private Integer width;

	@Schema(description = "高 (mm)")
	private Integer height;

	@Schema(description = "坐高 (mm)")
	private Integer seatHeight;

	@Schema(description = "展开尺寸")
	private String unfoldedSize;

	@Schema(description = "产品重量 (kg)")
	private BigDecimal productWeight;

	@Schema(description = "主材质")
	private String mainMaterial;

	@Schema(description = "辅助材质")
	private String auxiliaryMaterial;

	@Schema(description = "面料材质")
	private String fabricMaterial;

	@Schema(description = "填充材质")
	private String fillingMaterial;

	@Schema(description = "框架材质")
	private String frameMaterial;

	@Schema(description = "五金配件")
	private String hardware;

	@Schema(description = "表面工艺")
	private String surfaceCraft;

	@Schema(description = "颜色")
	private String color;

	@Schema(description = "风格")
	private String style;

	@Schema(description = "环保等级")
	private String environmentalGrade;
}
