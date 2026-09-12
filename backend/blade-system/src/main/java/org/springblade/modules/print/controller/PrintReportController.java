package org.springblade.modules.print.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.github.xiaoymin.knife4j.annotations.ApiOperationSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springblade.core.boot.ctrl.BladeController;
import org.springblade.core.mp.support.Query;
import org.springblade.core.secure.annotation.PreAuth;
import org.springblade.core.tool.api.R;
import org.springblade.modules.print.pojo.entity.PrintDocType;
import org.springblade.modules.print.pojo.entity.PrintDocTypeAuth;
import org.springblade.modules.print.pojo.entity.PrintMount;
import org.springblade.modules.print.pojo.entity.PrintTemplate;
import org.springblade.modules.print.pojo.vo.PagePrintTemplateVO;
import org.springblade.modules.print.service.IPrintReportService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 单据打印报表中心
 * <p>前端代理：/api/blade-system/print/**</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/print")
@Tag(name = "单据打印报表中心")
public class PrintReportController extends BladeController {

	private final IPrintReportService printReportService;

	/* ---------- 单据类型 ---------- */

	@GetMapping("/doc-types")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 1)
	@Operation(summary = "全部单据类型")
	public R<List<PrintDocType>> docTypes() {
		return R.data(printReportService.listDocTypes());
	}

	/* ---------- 模板 ---------- */

	@GetMapping("/templates")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 2)
	@Operation(summary = "模板分页列表（不返回大 JSON 字段）")
	public R<IPage<PrintTemplate>> templates(@RequestParam(required = false) String docTypeCode, Query query) {
		return R.data(printReportService.pageTemplates(docTypeCode, query));
	}

	@PostMapping("/templates/submit")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 3)
	@Operation(summary = "保存模板元数据（新增/修改）")
	public R<Boolean> submitMeta(@RequestBody PrintTemplate body) {
		return R.status(printReportService.saveMeta(body));
	}

	@GetMapping("/templates/{id}/json")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 4)
	@Operation(summary = "读取当前 Hiprint JSON")
	public R<String> getJson(@PathVariable Long id) {
		return R.data(printReportService.getJson(id));
	}

	@PutMapping("/templates/{id}/json")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 5)
	@Operation(summary = "保存当前 Hiprint JSON")
	public R<Boolean> saveJson(@PathVariable Long id, @RequestBody Map<String, String> body) {
		return R.status(printReportService.saveJson(id, body.get("templateJson")));
	}

	@PostMapping("/templates/{id}/set-default")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 6)
	@Operation(summary = "设为默认模板")
	public R<Boolean> setDefault(@PathVariable Long id) {
		return R.status(printReportService.setDefault(id));
	}

	@PostMapping("/templates/{id}/copy")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 7)
	@Operation(summary = "复制模板")
	public R<Long> copy(@PathVariable Long id, @RequestBody Map<String, String> body) {
		return R.data(printReportService.copy(id, body.get("code"), body.get("name")));
	}

	@PostMapping("/templates/{id}/restore-factory")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 8)
	@Operation(summary = "恢复出厂布局")
	public R<Boolean> restoreFactory(@PathVariable Long id) {
		return R.status(printReportService.restoreFactory(id));
	}

	@PostMapping("/templates/{id}/status")
	@PreAuth(menu = "printTemplate")
	@ApiOperationSupport(order = 9)
	@Operation(summary = "启用/停用模板")
	public R<Boolean> status(@PathVariable Long id, @RequestParam int status) {
		return R.status(printReportService.changeStatus(id, status));
	}

	/* ---------- 挂载 ---------- */

	@GetMapping("/mounts")
	@PreAuth(menu = "printMount")
	@ApiOperationSupport(order = 10)
	@Operation(summary = "全部挂载关系")
	public R<List<PrintMount>> mounts() {
		return R.data(printReportService.listMounts());
	}

	@PostMapping("/mounts/submit")
	@PreAuth(menu = "printMount")
	@ApiOperationSupport(order = 11)
	@Operation(summary = "保存挂载关系")
	public R<Boolean> saveMount(@RequestBody PrintMount body) {
		return R.status(printReportService.saveMount(body));
	}

	/* ---------- 授权 ---------- */

	@GetMapping("/doc-type-auths")
	@PreAuth(menu = "printMount")
	@ApiOperationSupport(order = 12)
	@Operation(summary = "某单据类型的设计授权角色")
	public R<List<PrintDocTypeAuth>> auths(@RequestParam String docTypeCode) {
		return R.data(printReportService.listAuths(docTypeCode));
	}

	@PostMapping("/doc-type-auths/replace")
	@PreAuth(menu = "printMount")
	@ApiOperationSupport(order = 13)
	@Operation(summary = "替换某单据类型的设计授权角色")
	public R<Boolean> replaceAuths(@RequestParam String docTypeCode, @RequestBody List<Long> roleIds) {
		return R.status(printReportService.replaceAuths(docTypeCode, roleIds));
	}

	/* ---------- 业务页打印用 ---------- */

	/**
	 * 业务页拉取可用模板；不对业务人员要求 printTemplate/printMount 菜单权限，
	 * 仅要求已登录，避免业务页面无法打印。
	 */
	@GetMapping("/pages/{pageCode}/templates")
	@ApiOperationSupport(order = 14)
	@Operation(summary = "业务页可用打印模板")
	public R<List<PagePrintTemplateVO>> pageTemplates(@PathVariable String pageCode) {
		return R.data(printReportService.listTemplatesForPage(pageCode));
	}
}
