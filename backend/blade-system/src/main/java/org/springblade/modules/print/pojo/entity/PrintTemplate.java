package org.springblade.modules.print.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

/**
 * 打印模板
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("blade_print_template")
@Schema(description = "打印模板")
public class PrintTemplate extends TenantEntity {

	@Schema(description = "单据类型ID")
	private Long docTypeId;
	@Schema(description = "单据类型编码")
	private String docTypeCode;
	@Schema(description = "模板编码")
	private String code;
	@Schema(description = "模板名称")
	private String name;
	@Schema(description = "当前 Hiprint JSON")
	private String templateJson;
	@Schema(description = "出厂 Hiprint JSON")
	private String factoryJson;
	@Schema(description = "备注")
	private String remark;
}
