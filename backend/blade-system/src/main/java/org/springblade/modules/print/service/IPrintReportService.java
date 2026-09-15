package org.springblade.modules.print.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import org.springblade.core.mp.support.Query;
import org.springblade.modules.print.pojo.entity.PrintDocType;
import org.springblade.modules.print.pojo.entity.PrintDocTypeAuth;
import org.springblade.modules.print.pojo.entity.PrintMount;
import org.springblade.modules.print.pojo.entity.PrintTemplate;
import org.springblade.modules.print.pojo.vo.PagePrintTemplateVO;

import java.util.List;

/**
 * 打印报表中心 Service 接口
 */
public interface IPrintReportService {

	/**
	 * 全部单据类型
	 */
	List<PrintDocType> listDocTypes();

	/**
	 * 模板分页（不返回大 JSON 字段）
	 */
	IPage<PrintTemplate> pageTemplates(String docTypeCode, Query pageQuery);

	/**
	 * 模板详情
	 */
	PrintTemplate getTemplate(Long id);

	/**
	 * 保存模板元数据（新增/修改）
	 */
	boolean saveMeta(PrintTemplate template);

	/**
	 * 读取当前 Hiprint JSON
	 */
	String getJson(Long id);

	/**
	 * 保存当前 Hiprint JSON
	 */
	boolean saveJson(Long id, String json);

	/**
	 * 设为默认模板
	 */
	boolean setDefault(Long templateId);

	/**
	 * 复制模板
	 */
	Long copy(Long templateId, String newCode, String newName);

	/**
	 * 恢复出厂布局
	 */
	boolean restoreFactory(Long templateId);

	/**
	 * 启用/停用模板
	 */
	boolean changeStatus(Long id, int status);

	/**
	 * 全部挂载关系
	 */
	List<PrintMount> listMounts();

	/**
	 * 保存挂载关系
	 */
	boolean saveMount(PrintMount mount);

	/**
	 * 某单据类型的设计授权角色
	 */
	List<PrintDocTypeAuth> listAuths(String docTypeCode);

	/**
	 * 替换某单据类型的设计授权角色
	 */
	boolean replaceAuths(String docTypeCode, List<String> roleIds);

	/**
	 * 业务页可用模板
	 */
	List<PagePrintTemplateVO> listTemplatesForPage(String pageCode);

	/**
	 * 业务页读取模板 Hiprint JSON
	 */
	String getJsonForPage(String pageCode, Long id);

	/**
	 * 当前用户是否可设计某单据类型
	 */
	boolean canDesign(String docTypeCode);
}
