package org.springblade.system.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.system.pojo.entity.GoodsMst;

import java.io.Serial;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "GoodsMstVO对象")
public class GoodsMstVO extends GoodsMst {
	@Serial
	private static final long serialVersionUID = 1L;
}
