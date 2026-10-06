package org.springblade.system.pojo.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.core.mp.base.BaseEntity;

import java.io.Serial;

@Data
@TableName("blade_material_category")
@EqualsAndHashCode(callSuper = true)
@Schema(description = "MaterialCategory对象")
public class MaterialCategory extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "类别名称")
    private String categoryName;

    @Schema(description = "类别编码")
    private String categoryCode;

    @Schema(description = "父级ID")
    private Long parentId;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "备注")
    private String remark;
}
