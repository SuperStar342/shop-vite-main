package org.springblade.modules.print.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

/**
 * 打印模板挂载
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("blade_print_mount")
@Schema(description = "打印模板挂载")
public class PrintMount extends TenantEntity {

	@Schema(description = "单据类型ID")
	private Long docTypeId;
	@Schema(description = "单据类型编码")
	private String docTypeCode;
	@Schema(description = "业务页编码")
	private String pageCode;
	@Schema(description = "业务页名称")
	private String pageName;
	@Schema(description = "1生效 0关闭")
	private Integer enabled;
	@Schema(description = "排序")
	private Integer sort;
}
