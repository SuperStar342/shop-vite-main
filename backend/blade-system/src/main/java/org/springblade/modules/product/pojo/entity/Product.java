package org.springblade.modules.product.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

import java.math.BigDecimal;
import java.util.List;

/**
 * 产品主表（SPU）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "blade_product", autoResultMap = true)
@Schema(description = "产品主表（SPU）")
public class Product extends TenantEntity {

	@Schema(description = "规格库存合计（非表字段，列表聚合）")
	@TableField(exist = false)
	private Integer specStock;

	@Schema(description = "SKU 数量（非表字段）")
	@TableField(exist = false)
	private Integer specCount;

	@Schema(description = "产品编码 / SPU 编码，业务唯一")
	private String productCode;

	@Schema(description = "产品名称")
	private String productName;

	@Schema(description = "产品副标题 / 营销 slogan")
	private String productSubtitle;

	@Schema(description = "产品简介")
	private String productBrief;

	@Schema(description = "产品详情富文本")
	private String productDescription;

	@Schema(description = "搜索关键词，逗号分隔")
	private String keywords;

	@Schema(description = "品牌名称")
	private String brand;

	@Schema(description = "三级分类ID")
	private Long categoryId;

	@Schema(description = "分类路径")
	private String categoryPath;

	@Schema(description = "产地 / 生产地（多选）")
	@TableField(typeHandler = JacksonTypeHandler.class)
	private List<String> origin;

	@Schema(description = "适用空间（多选）")
	@TableField(typeHandler = JacksonTypeHandler.class)
	private List<String> applicableSpace;

	@Schema(description = "适用场景（多选）")
	@TableField(typeHandler = JacksonTypeHandler.class)
	private List<String> applicableScene;

	@Schema(description = "商品类型：0-成品 / 1-定制 / 2-半成品 / 3-配件")
	private Integer productType;

	@Schema(description = "包装类型：0-独立件 / 1-分包件 / 2-组合")
	private Integer packageType;

	@Schema(description = "零售指导价 / 吊牌价（元）")
	private BigDecimal retailPrice;

	@Schema(description = "会员价 / 促销价（元）")
	private BigDecimal memberPrice;

	@Schema(description = "成本价（元，内部可见）")
	private BigDecimal costPrice;

	@Schema(description = "计量单位")
	private String unit;

	@Schema(description = "起订量 / 最小购买数量")
	private Integer minOrderQty;

	@Schema(description = "税率")
	private BigDecimal taxRate;

	@Schema(description = "产品状态：0-草稿 / 1-在售 / 2-停售 / 3-淘汰")
	private Integer productStatus;

	@Schema(description = "审核状态：-1未送审 / 0待审核 / 1已通过 / 2已驳回")
	private Integer auditStatus;

	@Schema(description = "审核备注 / 驳回原因")
	private String auditRemark;

	@Schema(description = "最近审核时间")
	private java.util.Date auditTime;

	@Schema(description = "主图 URL")
	private String mainImage;

	@Schema(description = "详情图 URL 列表")
	@TableField(typeHandler = JacksonTypeHandler.class)
	private List<String> detailImages;

	@Schema(description = "产品宣传视频 URL")
	private String videoUrl;

	@Schema(description = "3D 模型文件 URL")
	private String model3dUrl;

	@Schema(description = "是否上架：0-下架 / 1-上架")
	private Integer isOnShelf;

	@Schema(description = "是否首页推荐")
	private Integer isRecommended;

	@Schema(description = "是否新品标记")
	private Integer isNew;

	@Schema(description = "是否热销标记")
	private Integer isHot;

	@Schema(description = "排序权重")
	private Integer sortWeight;

	@Schema(description = "产品标签数组")
	@TableField(typeHandler = JacksonTypeHandler.class)
	private List<String> tags;
}
