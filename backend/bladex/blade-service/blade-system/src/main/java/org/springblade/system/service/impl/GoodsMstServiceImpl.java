package org.springblade.system.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springblade.system.mapper.GoodsMstMapper;
import org.springblade.system.pojo.entity.GoodsMst;
import org.springblade.system.service.IGoodsMstService;
import org.springframework.stereotype.Service;

@Service
public class GoodsMstServiceImpl extends ServiceImpl<GoodsMstMapper, GoodsMst> implements IGoodsMstService {
}
