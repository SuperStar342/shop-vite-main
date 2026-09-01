package org.springblade.modules.procurement.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springblade.core.log.exception.ServiceException;
import org.springblade.core.secure.utils.AuthUtil;
import org.springblade.core.tool.utils.Func;
import org.springblade.core.tool.utils.StringUtil;
import org.springblade.modules.procurement.mapper.NonProdUnitPriceMapper;
import org.springblade.modules.procurement.pojo.entity.NonProdUnitPrice;
import org.springblade.modules.procurement.service.INonProdUnitPriceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NonProdUnitPriceServiceImpl implements INonProdUnitPriceService {

	private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

	private final NonProdUnitPriceMapper mapper;

	@Override
	public IPage<NonProdUnitPrice> page(IPage<NonProdUnitPrice> page, NonProdUnitPrice query, String keyword) {
		LambdaQueryWrapper<NonProdUnitPrice> qw = Wrappers.<NonProdUnitPrice>lambdaQuery()
			.eq(NonProdUnitPrice::getIsDeleted, 0)
			.eq(StringUtil.isNotBlank(query.getDispatchTypeCode()), NonProdUnitPrice::getDispatchTypeCode, query.getDispatchTypeCode())
			.eq(StringUtil.isNotBlank(query.getPieceType()), NonProdUnitPrice::getPieceType, query.getPieceType())
			.eq(StringUtil.isNotBlank(query.getAllowEditPrice()), NonProdUnitPrice::getAllowEditPrice, query.getAllowEditPrice())
			.and(StringUtil.isNotBlank(keyword), w -> w
				.like(NonProdUnitPrice::getDispatchTypeCode, keyword)
				.or().like(NonProdUnitPrice::getDispatchTypeName, keyword)
				.or().like(NonProdUnitPrice::getGoodsCode, keyword)
				.or().like(NonProdUnitPrice::getGoodsName, keyword)
				.or().like(NonProdUnitPrice::getDocName, keyword)
				.or().like(NonProdUnitPrice::getRemark, keyword)
			)
			.orderByDesc(NonProdUnitPrice::getUpdateTime)
			.orderByDesc(NonProdUnitPrice::getId);
		return mapper.selectPage(page, qw);
	}

	@Override
	public NonProdUnitPrice detail(Long id) {
		NonProdUnitPrice row = mapper.selectById(id);
		if (row == null || Func.toInt(row.getIsDeleted(), 0) == 1) {
			throw new ServiceException("记录不存在");
		}
		return row;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean submit(NonProdUnitPrice entity) {
		if (entity == null) {
			throw new ServiceException("提交数据为空");
		}
		if (StringUtil.isBlank(entity.getGoodsCode()) || StringUtil.isBlank(entity.getGoodsName())) {
			throw new ServiceException("品号与品名不能为空");
		}
		String now = LocalDateTime.now().format(FMT);
		String userName = "系统";
		String account = "";
		try {
			if (StringUtil.isNotBlank(AuthUtil.getUserName())) {
				userName = AuthUtil.getUserName();
			}
			if (AuthUtil.getUser() != null && StringUtil.isNotBlank(AuthUtil.getUser().getAccount())) {
				account = AuthUtil.getUser().getAccount();
			}
		} catch (Exception ignored) {
			// 无登录上下文时使用默认
		}

		if (entity.getId() == null) {
			entity.setId(IdWorker.getId());
			entity.setIsDeleted(0);
			entity.setStatus(1);
			if (entity.getRatioQty() == null) {
				entity.setRatioQty(BigDecimal.ZERO);
			}
			if (entity.getPiecePrice() == null) {
				entity.setPiecePrice(BigDecimal.ZERO);
			}
			if (StringUtil.isBlank(entity.getAllowEditPrice())) {
				entity.setAllowEditPrice("是");
			}
			entity.setCreator(userName);
			entity.setCreatorCode(account);
			entity.setCreateDate(now);
			entity.setModifier(userName);
			entity.setModifierCode(account);
			entity.setModifyDate(now);
			return mapper.insert(entity) > 0;
		}

		NonProdUnitPrice db = detail(entity.getId());
		if (!"是".equals(db.getAllowEditPrice())
			&& entity.getPiecePrice() != null
			&& db.getPiecePrice() != null
			&& entity.getPiecePrice().compareTo(db.getPiecePrice()) != 0) {
			throw new ServiceException("该行不允许修改单价");
		}
		db.setPiecePrice(entity.getPiecePrice() != null ? entity.getPiecePrice() : db.getPiecePrice());
		db.setRemark(entity.getRemark() != null ? entity.getRemark() : db.getRemark());
		db.setRatioQty(entity.getRatioQty() != null ? entity.getRatioQty() : db.getRatioQty());
		if (entity.getAllowEditPrice() != null) {
			db.setAllowEditPrice(entity.getAllowEditPrice());
		}
		if (entity.getDispatchTypeName() != null) {
			db.setDispatchTypeName(entity.getDispatchTypeName());
		}
		if (entity.getPieceType() != null) {
			db.setPieceType(entity.getPieceType());
		}
		if (entity.getControlAttr() != null) {
			db.setControlAttr(entity.getControlAttr());
		}
		if (entity.getDocName() != null) {
			db.setDocName(entity.getDocName());
		}
		if (entity.getStdAttr() != null) {
			db.setStdAttr(entity.getStdAttr());
		}
		if (entity.getUnitName() != null) {
			db.setUnitName(entity.getUnitName());
		}
		if (entity.getUnitCode() != null) {
			db.setUnitCode(entity.getUnitCode());
		}
		if (entity.getResourceFixedCode() != null) {
			db.setResourceFixedCode(entity.getResourceFixedCode());
		}
		db.setModifier(userName);
		db.setModifierCode(account);
		db.setModifyDate(now);
		return mapper.updateById(db) > 0;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean remove(List<Long> ids) {
		if (ids == null || ids.isEmpty()) {
			throw new ServiceException("请选择要删除的记录");
		}
		return mapper.deleteBatchIds(ids) > 0;
	}

	@Override
	public List<Map<String, Object>> typeStats() {
		List<NonProdUnitPrice> all = mapper.selectList(
			Wrappers.<NonProdUnitPrice>lambdaQuery().eq(NonProdUnitPrice::getIsDeleted, 0)
		);
		Map<String, Map<String, Object>> map = new LinkedHashMap<>();
		for (NonProdUnitPrice row : all) {
			String code = row.getDispatchTypeCode() == null ? "" : row.getDispatchTypeCode();
			Map<String, Object> cur = map.computeIfAbsent(code, k -> {
				Map<String, Object> m = new HashMap<>();
				m.put("code", code);
				m.put("name", row.getDispatchTypeName());
				m.put("count", 0);
				m.put("sum", BigDecimal.ZERO);
				m.put("avgPrice", BigDecimal.ZERO);
				return m;
			});
			int count = ((Number) cur.get("count")).intValue() + 1;
			BigDecimal sum = ((BigDecimal) cur.get("sum")).add(
				row.getPiecePrice() == null ? BigDecimal.ZERO : row.getPiecePrice()
			);
			cur.put("count", count);
			cur.put("sum", sum);
			cur.put("avgPrice", count == 0 ? BigDecimal.ZERO : sum.divide(BigDecimal.valueOf(count), 1, RoundingMode.HALF_UP));
			cur.put("name", row.getDispatchTypeName());
		}
		return new ArrayList<>(map.values());
	}
}
