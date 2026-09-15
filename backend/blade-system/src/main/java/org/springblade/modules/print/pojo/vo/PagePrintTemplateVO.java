package org.springblade.modules.print.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 业务页可用打印模板
 */
@Data
@Schema(description = "业务页可用打印模板")
public class PagePrintTemplateVO {

	@Schema(description = "模板ID")
	private Long id;
	@Schema(description = "模板编码")
	private String code;
	@Schema(description = "模板名称")
	private String name;
	@Schema(description = "是否默认模板")
	private Boolean isDefault;
	@Schema(description = "是否已配置 Hiprint JSON")
	private Boolean hasJson;
}
