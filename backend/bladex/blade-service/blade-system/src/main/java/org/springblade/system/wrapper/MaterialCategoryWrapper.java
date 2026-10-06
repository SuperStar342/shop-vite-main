package org.springblade.system.wrapper;

import org.springblade.core.mp.support.BaseEntityWrapper;
import org.springblade.core.tool.utils.BeanUtil;
import org.springblade.system.pojo.entity.MaterialCategory;
import org.springblade.system.pojo.vo.MaterialCategoryVO;

import java.util.Objects;

public class MaterialCategoryWrapper extends BaseEntityWrapper<MaterialCategory, MaterialCategoryVO> {

    public static MaterialCategoryWrapper build() {
        return new MaterialCategoryWrapper();
    }

    @Override
    public MaterialCategoryVO entityVO(MaterialCategory entity) {
        return Objects.requireNonNull(BeanUtil.copyProperties(entity, MaterialCategoryVO.class));
    }
}