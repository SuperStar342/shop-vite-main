package org.springblade.modules.print.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

/**
 * 打印单据类型
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("blade_print_doc_type")
@Schema(description = "打印单据类型")
public class PrintDocType extends TenantEntity {

	@Schema(description = "类型编码 instruction/workOrder/dispatch")
	private String code;
	@Schema(description = "显示名")
	private String name;
	@Schema(description = "前端 provider 键")
	private String providerKey;
	@Schema(description = "默认模板ID")
	private Long defaultTemplateId;
	@Schema(description = "排序")
	private Integer sort;
	@Schema(description = "备注")
	private String remark;
}
