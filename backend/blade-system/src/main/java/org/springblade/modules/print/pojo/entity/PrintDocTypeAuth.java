package org.springblade.modules.print.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.tenant.mp.TenantEntity;

/**
 * 打印单据类型设计授权
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("blade_print_doc_type_auth")
@Schema(description = "打印单据类型设计授权")
public class PrintDocTypeAuth extends TenantEntity {

	@Schema(description = "单据类型ID")
	private Long docTypeId;
	@Schema(description = "单据类型编码")
	private String docTypeCode;
	@Schema(description = "角色ID")
	private Long roleId;
}
