package org.springblade.system.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.system.pojo.entity.MaterialCategory;

import java.io.Serial;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "MaterialCategoryVO对象")
public class MaterialCategoryVO extends MaterialCategory {
    @Serial
    private static final long serialVersionUID = 1L;
}
