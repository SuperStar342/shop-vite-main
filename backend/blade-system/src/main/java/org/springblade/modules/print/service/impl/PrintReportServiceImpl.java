package org.springblade.modules.print.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springblade.core.log.exception.ServiceException;
import org.springblade.core.mp.support.Condition;
import org.springblade.core.mp.support.Query;
import org.springblade.core.secure.utils.AuthUtil;
import org.springblade.core.tool.utils.Func;
import org.springblade.core.tool.utils.StringUtil;
import org.springblade.modules.print.mapper.PrintDocTypeAuthMapper;
import org.springblade.modules.print.mapper.PrintDocTypeMapper;
import org.springblade.modules.print.mapper.PrintMountMapper;
import org.springblade.modules.print.mapper.PrintTemplateMapper;
import org.springblade.modules.print.pojo.entity.PrintDocType;
import org.springblade.modules.print.pojo.entity.PrintDocTypeAuth;
import org.springblade.modules.print.pojo.entity.PrintMount;
import org.springblade.modules.print.pojo.entity.PrintTemplate;
import org.springblade.modules.print.pojo.vo.PagePrintTemplateVO;
import org.springblade.modules.print.service.IPrintReportService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PrintReportServiceImpl implements IPrintReportService {

	private final PrintTemplateMapper templateMapper;
	private final PrintDocTypeMapper docTypeMapper;
	private final PrintMountMapper mountMapper;
	private final PrintDocTypeAuthMapper authMapper;

	/* ---------- 单据类型 ---------- */

	@Override
	public List<PrintDocType> listDocTypes() {
		String tenantId = currentTenantId();
		return docTypeMapper.selectList(Wrappers.<PrintDocType>lambdaQuery()
			.eq(PrintDocType::getTenantId, tenantId)
			.eq(PrintDocType::getIsDeleted, 0)
			.orderByAsc(PrintDocType::getSort));
	}

	/* ---------- 模板 ---------- */

	@Override
	public IPage<PrintTemplate> pageTemplates(String docTypeCode, Query pageQuery) {
		if (StringUtil.isBlank(docTypeCode)) {
			throw new ServiceException("单据类型编码不能为空");
		}
		String tenantId = currentTenantId();
		LambdaQueryWrapper<PrintTemplate> qw = Wrappers.<PrintTemplate>lambdaQuery()
			.eq(PrintTemplate::getTenantId, tenantId)
			.eq(PrintTemplate::getDocTypeCode, docTypeCode)
			.eq(PrintTemplate::getIsDeleted, 0)
			.orderByAsc(PrintTemplate::getCode)
			.select(
				PrintTemplate::getId,
				PrintTemplate::getDocTypeId,
				PrintTemplate::getDocTypeCode,
				PrintTemplate::getCode,
				PrintTemplate::getName,
				PrintTemplate::getRemark,
				PrintTemplate::getStatus,
				PrintTemplate::getCreateUser,
				PrintTemplate::getCreateTime,
				PrintTemplate::getUpdateUser,
				PrintTemplate::getUpdateTime,
				PrintTemplate::getIsDeleted
			);
		return templateMapper.selectPage(Condition.getPage(pageQuery), qw);
	}

	@Override
	public PrintTemplate getTemplate(Long id) {
		return getRequiredTemplate(id);
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean saveMeta(PrintTemplate template) {
		if (template == null) {
			throw new ServiceException("模板数据为空");
		}
		if (StringUtil.isBlank(template.getDocTypeCode())) {
			throw new ServiceException("单据类型编码不能为空");
		}
		if (StringUtil.isBlank(template.getCode())) {
			throw new ServiceException("模板编码不能为空");
		}
		if (StringUtil.isBlank(template.getName())) {
			throw new ServiceException("模板名称不能为空");
		}
		if (!canDesign(template.getDocTypeCode())) {
			throw new ServiceException("当前用户无该单据类型的模板设计权限");
		}

		PrintDocType type = getRequiredTypeByCode(template.getDocTypeCode());
		String tenantId = currentTenantId();
		Date now = new Date();
		Long userId = currentUserId();

		LambdaQueryWrapper<PrintTemplate> duplicateQw = Wrappers.<PrintTemplate>lambdaQuery()
			.eq(PrintTemplate::getTenantId, tenantId)
			.eq(PrintTemplate::getDocTypeCode, template.getDocTypeCode())
			.eq(PrintTemplate::getCode, template.getCode())
			.eq(PrintTemplate::getIsDeleted, 0);

		if (template.getId() == null) {
			if (templateMapper.selectCount(duplicateQw) > 0) {
				throw new ServiceException("同一单据类型下模板编码已存在");
			}
			template.setId(IdWorker.getId());
			template.setTenantId(tenantId);
			template.setDocTypeId(type.getId());
			template.setStatus(1);
			template.setIsDeleted(0);
			template.setCreateTime(now);
			template.setCreateUser(userId);
			template.setUpdateTime(now);
			template.setUpdateUser(userId);
			return templateMapper.insert(template) > 0;
		}

		PrintTemplate db = getRequiredTemplate(template.getId());
		duplicateQw.ne(PrintTemplate::getId, db.getId());
		if (templateMapper.selectCount(duplicateQw) > 0) {
			throw new ServiceException("同一单据类型下模板编码已存在");
		}

		db.setCode(template.getCode());
		db.setName(template.getName());
		if (template.getRemark() != null) {
			db.setRemark(template.getRemark());
		}
		db.setDocTypeCode(type.getCode());
		db.setDocTypeId(type.getId());
		db.setUpdateTime(now);
		db.setUpdateUser(userId);
		return templateMapper.updateById(db) > 0;
	}

	@Override
	public String getJson(Long id) {
		PrintTemplate tpl = getRequiredTemplate(id);
		return tpl.getTemplateJson();
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean saveJson(Long id, String json) {
		PrintTemplate tpl = getRequiredTemplate(id);
		if (!canDesign(tpl.getDocTypeCode())) {
			throw new ServiceException("当前用户无该单据类型的模板设计权限");
		}
		if (StringUtil.isBlank(tpl.getFactoryJson())) {
			tpl.setFactoryJson(json);
		}
		tpl.setTemplateJson(json);
		tpl.setUpdateTime(new Date());
		tpl.setUpdateUser(currentUserId());
		return templateMapper.updateById(tpl) > 0;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean setDefault(Long templateId) {
		PrintTemplate tpl = getRequiredTemplate(templateId);
		if (tpl.getStatus() != null && tpl.getStatus() == 0) {
			throw new ServiceException("停用模板不能设为默认");
		}
		PrintDocType type = getRequiredTypeByCode(tpl.getDocTypeCode());
		type.setDefaultTemplateId(templateId);
		return docTypeMapper.updateById(type) > 0;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean changeStatus(Long id, int status) {
		PrintTemplate tpl = getRequiredTemplate(id);
		if (status == 0) {
			PrintDocType type = getRequiredTypeByCode(tpl.getDocTypeCode());
			if (type.getDefaultTemplateId() != null && type.getDefaultTemplateId().equals(id)) {
				throw new ServiceException("请先更换默认模板再停用");
			}
		}
		tpl.setStatus(status);
		tpl.setUpdateTime(new Date());
		tpl.setUpdateUser(currentUserId());
		return templateMapper.updateById(tpl) > 0;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public Long copy(Long templateId, String newCode, String newName) {
		if (StringUtil.isBlank(newCode) || StringUtil.isBlank(newName)) {
			throw new ServiceException("新模板编码与名称不能为空");
		}
		PrintTemplate src = getRequiredTemplate(templateId);
		String tenantId = currentTenantId();

		LambdaQueryWrapper<PrintTemplate> dup = Wrappers.<PrintTemplate>lambdaQuery()
			.eq(PrintTemplate::getTenantId, tenantId)
			.eq(PrintTemplate::getDocTypeCode, src.getDocTypeCode())
			.eq(PrintTemplate::getCode, newCode)
			.eq(PrintTemplate::getIsDeleted, 0);
		if (templateMapper.selectCount(dup) > 0) {
			throw new ServiceException("同一单据类型下模板编码已存在");
		}

		Date now = new Date();
		Long userId = currentUserId();
		PrintTemplate copy = new PrintTemplate();
		copy.setId(IdWorker.getId());
		copy.setTenantId(tenantId);
		copy.setDocTypeId(src.getDocTypeId());
		copy.setDocTypeCode(src.getDocTypeCode());
		copy.setCode(newCode);
		copy.setName(newName);
		copy.setTemplateJson(src.getTemplateJson());
		copy.setFactoryJson(src.getFactoryJson());
		copy.setRemark(src.getRemark());
		copy.setStatus(1);
		copy.setIsDeleted(0);
		copy.setCreateTime(now);
		copy.setCreateUser(userId);
		copy.setUpdateTime(now);
		copy.setUpdateUser(userId);
		templateMapper.insert(copy);
		return copy.getId();
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean restoreFactory(Long templateId) {
		PrintTemplate tpl = getRequiredTemplate(templateId);
		if (StringUtil.isBlank(tpl.getFactoryJson())) {
			throw new ServiceException("无出厂布局");
		}
		tpl.setTemplateJson(tpl.getFactoryJson());
		tpl.setUpdateTime(new Date());
		tpl.setUpdateUser(currentUserId());
		return templateMapper.updateById(tpl) > 0;
	}

	/* ---------- 挂载 ---------- */

	@Override
	public List<PrintMount> listMounts() {
		return mountMapper.selectList(Wrappers.<PrintMount>lambdaQuery()
			.eq(PrintMount::getTenantId, currentTenantId())
			.eq(PrintMount::getIsDeleted, 0)
			.orderByAsc(PrintMount::getSort));
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean saveMount(PrintMount mount) {
		if (mount == null || StringUtil.isBlank(mount.getPageCode())) {
			throw new ServiceException("业务页编码不能为空");
		}
		if (StringUtil.isBlank(mount.getDocTypeCode())) {
			throw new ServiceException("单据类型编码不能为空");
		}
		PrintDocType type = getRequiredTypeByCode(mount.getDocTypeCode());
		String tenantId = currentTenantId();
		Date now = new Date();
		Long userId = currentUserId();

		LambdaQueryWrapper<PrintMount> dup = Wrappers.<PrintMount>lambdaQuery()
			.eq(PrintMount::getTenantId, tenantId)
			.eq(PrintMount::getPageCode, mount.getPageCode())
			.eq(PrintMount::getIsDeleted, 0);

		if (mount.getId() == null) {
			if (mountMapper.selectCount(dup) > 0) {
				throw new ServiceException("该业务页已存在挂载关系");
			}
			mount.setId(IdWorker.getId());
			mount.setTenantId(tenantId);
			mount.setDocTypeId(type.getId());
			mount.setEnabled(mount.getEnabled() == null ? 1 : mount.getEnabled());
			mount.setStatus(1);
			mount.setIsDeleted(0);
			mount.setCreateTime(now);
			mount.setCreateUser(userId);
			mount.setUpdateTime(now);
			mount.setUpdateUser(userId);
			return mountMapper.insert(mount) > 0;
		}

		PrintMount db = mountMapper.selectById(mount.getId());
		if (db == null || !Objects.equals(db.getTenantId(), tenantId) || Func.toInt(db.getIsDeleted(), 0) == 1) {
			throw new ServiceException("挂载关系不存在");
		}
		dup.ne(PrintMount::getId, db.getId());
		if (mountMapper.selectCount(dup) > 0) {
			throw new ServiceException("该业务页已存在挂载关系");
		}
		db.setDocTypeId(type.getId());
		db.setDocTypeCode(type.getCode());
		db.setPageCode(mount.getPageCode());
		if (mount.getPageName() != null) {
			db.setPageName(mount.getPageName());
		}
		db.setEnabled(mount.getEnabled() == null ? db.getEnabled() : mount.getEnabled());
		if (mount.getSort() != null) {
			db.setSort(mount.getSort());
		}
		db.setUpdateTime(now);
		db.setUpdateUser(userId);
		return mountMapper.updateById(db) > 0;
	}

	/* ---------- 授权 ---------- */

	@Override
	public List<PrintDocTypeAuth> listAuths(String docTypeCode) {
		if (StringUtil.isBlank(docTypeCode)) {
			throw new ServiceException("单据类型编码不能为空");
		}
		return authMapper.selectList(Wrappers.<PrintDocTypeAuth>lambdaQuery()
			.eq(PrintDocTypeAuth::getTenantId, currentTenantId())
			.eq(PrintDocTypeAuth::getDocTypeCode, docTypeCode)
			.eq(PrintDocTypeAuth::getIsDeleted, 0)
			.orderByAsc(PrintDocTypeAuth::getRoleId));
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public boolean replaceAuths(String docTypeCode, List<Long> roleIds) {
		if (StringUtil.isBlank(docTypeCode)) {
			throw new ServiceException("单据类型编码不能为空");
		}
		PrintDocType type = getRequiredTypeByCode(docTypeCode);
		String tenantId = currentTenantId();
		Date now = new Date();
		Long userId = currentUserId();

		authMapper.update(null, Wrappers.<PrintDocTypeAuth>lambdaUpdate()
			.eq(PrintDocTypeAuth::getTenantId, tenantId)
			.eq(PrintDocTypeAuth::getDocTypeCode, docTypeCode)
			.set(PrintDocTypeAuth::getIsDeleted, 1));

		if (roleIds == null || roleIds.isEmpty()) {
			return true;
		}

		for (Long roleId : roleIds) {
			if (roleId == null) {
				continue;
			}
			PrintDocTypeAuth auth = new PrintDocTypeAuth();
			auth.setId(IdWorker.getId());
			auth.setTenantId(tenantId);
			auth.setDocTypeId(type.getId());
			auth.setDocTypeCode(type.getCode());
			auth.setRoleId(roleId);
			auth.setCreateTime(now);
			auth.setCreateUser(userId);
			auth.setIsDeleted(0);
			authMapper.insert(auth);
		}
		return true;
	}

	/* ---------- 业务页可用模板 / 设计权限 ---------- */

	@Override
	public List<PagePrintTemplateVO> listTemplatesForPage(String pageCode) {
		if (StringUtil.isBlank(pageCode)) {
			throw new ServiceException("业务页编码不能为空");
		}
		String tenantId = currentTenantId();
		PrintMount mount = mountMapper.selectOne(Wrappers.<PrintMount>lambdaQuery()
			.eq(PrintMount::getTenantId, tenantId)
			.eq(PrintMount::getPageCode, pageCode)
			.eq(PrintMount::getEnabled, 1)
			.eq(PrintMount::getIsDeleted, 0)
			.last("LIMIT 1"));
		if (mount == null) {
			return new ArrayList<>();
		}
		PrintDocType type = getRequiredTypeByCode(mount.getDocTypeCode());
		List<PrintTemplate> list = templateMapper.selectList(Wrappers.<PrintTemplate>lambdaQuery()
			.eq(PrintTemplate::getTenantId, tenantId)
			.eq(PrintTemplate::getDocTypeCode, mount.getDocTypeCode())
			.eq(PrintTemplate::getStatus, 1)
			.eq(PrintTemplate::getIsDeleted, 0)
			.orderByAsc(PrintTemplate::getCode));

		List<PagePrintTemplateVO> result = new ArrayList<>();
		for (PrintTemplate t : list) {
			PagePrintTemplateVO vo = new PagePrintTemplateVO();
			vo.setId(t.getId());
			vo.setCode(t.getCode());
			vo.setName(t.getName());
			vo.setIsDefault(type.getDefaultTemplateId() != null && type.getDefaultTemplateId().equals(t.getId()));
			vo.setHasJson(StringUtil.isNotBlank(t.getTemplateJson()));
			result.add(vo);
		}
		return result;
	}

	@Override
	public boolean canDesign(String docTypeCode) {
		if (StringUtil.isBlank(docTypeCode)) {
			return false;
		}
		if (AuthUtil.isAdmin() || AuthUtil.isAdministrator()) {
			return true;
		}
		org.springblade.core.secure.BladeUser user = AuthUtil.getUser();
		if (user == null || StringUtil.isBlank(user.getRoleId())) {
			return false;
		}
		List<Long> roleIds = Func.toLongList(user.getRoleId());
		if (roleIds.isEmpty()) {
			return false;
		}
		String tenantId = currentTenantId();
		return authMapper.selectCount(Wrappers.<PrintDocTypeAuth>lambdaQuery()
			.eq(PrintDocTypeAuth::getTenantId, tenantId)
			.eq(PrintDocTypeAuth::getDocTypeCode, docTypeCode)
			.in(PrintDocTypeAuth::getRoleId, roleIds)
			.eq(PrintDocTypeAuth::getIsDeleted, 0)) > 0;
	}

	/* ---------- 私有工具 ---------- */

	private PrintTemplate getRequiredTemplate(Long id) {
		if (id == null) {
			throw new ServiceException("模板ID不能为空");
		}
		PrintTemplate tpl = templateMapper.selectById(id);
		if (tpl == null || !Objects.equals(tpl.getTenantId(), currentTenantId()) || Func.toInt(tpl.getIsDeleted(), 0) == 1) {
			throw new ServiceException("模板不存在");
		}
		return tpl;
	}

	private PrintDocType getRequiredTypeByCode(String code) {
		if (StringUtil.isBlank(code)) {
			throw new ServiceException("单据类型编码不能为空");
		}
		String tenantId = currentTenantId();
		PrintDocType type = docTypeMapper.selectOne(Wrappers.<PrintDocType>lambdaQuery()
			.eq(PrintDocType::getTenantId, tenantId)
			.eq(PrintDocType::getCode, code)
			.eq(PrintDocType::getIsDeleted, 0)
			.last("LIMIT 1"));
		if (type == null) {
			throw new ServiceException("单据类型不存在");
		}
		return type;
	}

	private String currentTenantId() {
		String tenantId = AuthUtil.getTenantId();
		return StringUtil.isBlank(tenantId) ? "000000" : tenantId;
	}

	private Long currentUserId() {
		Long userId = AuthUtil.getUserId();
		return userId == null ? -1L : userId;
	}
}
