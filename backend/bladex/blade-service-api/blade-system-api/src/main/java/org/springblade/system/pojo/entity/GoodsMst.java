package org.springblade.system.pojo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 材料资料实体类 - 映射 blade_bomm_goodsmst 表
 */
@Data
@TableName("blade_bomm_goodsmst")
@Schema(description = "GoodsMst对象")
public class GoodsMst implements Serializable {

	@Serial
	private static final long serialVersionUID = 1L;

	@TableId(value = "fGoodsID", type = IdType.AUTO)
	@Schema(description = "主键")
	private Integer id;

	@TableField("fGoodsCode")
	@Schema(description = "材料编码")
	private String goodsCode;

	@TableField("fGoodsName")
	@Schema(description = "材料名称")
	private String goodsName;

	@TableField("fGoodsType")
	@Schema(description = "材料类型")
	private String goodsType;

	@TableField("fAlias")
	@Schema(description = "别名")
	private String alias;

	@TableField("fStdUnit")
	@Schema(description = "标准单位")
	private String stdUnit;

	@TableField("fBrandCode")
	@Schema(description = "品牌代码")
	private String brandCode;

	@TableField("fSortCode")
	@Schema(description = "类别代码")
	private String sortCode;

	@TableField("fIfCategory")
	@Schema(description = "是否类别 1-是 0-否")
	private String ifCategory;

	@TableField("fQuickQuery")
	@Schema(description = "快速查询")
	private String quickQuery;

	@TableField("fRemark")
	@Schema(description = "备注")
	private String remark;

	@TableField("fSizeDesc")
	@Schema(description = "规格描述")
	private String sizeDesc;

	@TableField("fSpecGenMode")
	@Schema(description = "规格描述产生方式 1-自动 0-手动")
	private String specGenMode;

	@TableField("fCostType")
	@Schema(description = "材料成本属性")
	private String costType;

	@TableField("fFgType")
	@Schema(description = "材料编码方式")
	private String fgType;

	@TableField("fSrcType")
	@Schema(description = "材料名称产生方式")
	private String srcType;

	@TableField("fDesignType")
	@Schema(description = "设计类型")
	private String designType;

	@TableField("fBusinessUnit")
	@Schema(description = "业务单位")
	private String businessUnit;

	@TableField("fStkUnit")
	@Schema(description = "库存单位")
	private String stkUnit;

	@TableField("fMngLevel")
	@Schema(description = "管理级别")
	private String mngLevel;

	@TableField("fSellFrequency")
	@Schema(description = "销售频率")
	private String sellFrequency;

	@TableField("fDevProperty")
	@Schema(description = "开发属性")
	private String devProperty;

	@TableField("fCreator")
	@Schema(description = "创建人")
	private String creator;

	@TableField("fCDate")
	@Schema(description = "创建时间")
	private Date createDate;

	@TableField("fModifier")
	@Schema(description = "修改人")
	private String modifier;

	@TableField("fModiDate")
	@Schema(description = "修改时间")
	private Date modifyDate;

	// ===== 图片中需要的额外字段 =====

	@TableField("fPicNo")
	@Schema(description = "是否有图片")
	private String picNo;

	@TableField("fIfLotMng")
	@Schema(description = "是否批次管理")
	private String ifLotMng;

	@TableField("fMinSafeQty")
	@Schema(description = "最小库存")
	private BigDecimal minSafeQty;

	@TableField("fMaxInvQty")
	@Schema(description = "最大库存")
	private BigDecimal maxInvQty;

	@TableField("fSafeQty")
	@Schema(description = "安全库存")
	private BigDecimal safeQty;

	@TableField("fSaleType")
	@Schema(description = "是否售价")
	private String saleType;

	@TableField("fStdSellUp")
	@Schema(description = "价格")
	private BigDecimal stdSellUp;

	@TableField("fifSetCal")
	@Schema(description = "是否客户物料")
	private String ifSetCal;

	@TableField("fCustomGoodsName")
	@Schema(description = "客户名称")
	private String customGoodsName;

	@TableField("fStkCode")
	@Schema(description = "仓库")
	private String stkCode;

	@TableField("fPlaceCode")
	@Schema(description = "仓位")
	private String placeCode;

	@TableField("fStcPropCode")
	@Schema(description = "物料用途")
	private String stcPropCode;

	@TableField("fRecQtyCtr")
	@Schema(description = "是否必输")
	private String recQtyCtr;

	@TableField("fBarCodePCS")
	@Schema(description = "条码")
	private Integer barCodePCS;

	@TableField("fKitCode")
	@Schema(description = "是否套餐")
	private String kitCode;

	@TableField("fDesignerCode")
	@Schema(description = "生产厂家")
	private String designerCode;

	@TableField("fPurFlag")
	@Schema(description = "采购工程师")
	private String purFlag;

	@TableField("fBOMState")
	@Schema(description = "核算单位")
	private String bomState;
}
