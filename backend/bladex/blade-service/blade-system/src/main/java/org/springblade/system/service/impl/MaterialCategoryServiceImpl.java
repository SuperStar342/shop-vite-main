package org.springblade.system.service.impl;

import org.springblade.core.mp.base.BaseServiceImpl;
import org.springblade.system.mapper.MaterialCategoryMapper;
import org.springblade.system.pojo.entity.MaterialCategory;
import org.springblade.system.service.IMaterialCategoryService;
import org.springframework.stereotype.Service;

@Service
public class MaterialCategoryServiceImpl extends BaseServiceImpl<MaterialCategoryMapper, MaterialCategory> implements IMaterialCategoryService {
}