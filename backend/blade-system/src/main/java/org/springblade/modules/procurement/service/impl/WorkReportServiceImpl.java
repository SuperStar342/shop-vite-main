package org.springblade.modules.procurement.service.impl;

import lombok.RequiredArgsConstructor;
import org.springblade.core.log.exception.ServiceException;
import org.springblade.modules.procurement.pojo.dto.DispatchReportBatchDTO;
import org.springblade.modules.procurement.pojo.dto.DispatchReportDTO;
import org.springblade.modules.procurement.pojo.vo.BatchReportPrepVO;
import org.springblade.modules.procurement.pojo.vo.DispatchReportBatchResultVO;
import org.springblade.modules.procurement.pojo.vo.DispatchReportResultVO;
import org.springblade.modules.procurement.service.IWorkReportService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 报工服务：校验 + 回写 SF。
 * <p>合并到 blade-system 后注入 DispatchMapper / SF 数据源执行实际 SQL。</p>
 */
@Service
@RequiredArgsConstructor
public class WorkReportServiceImpl implements IWorkReportService {

	private static final AtomicLong SEQ = new AtomicLong(System.currentTimeMillis() % 1_000_000);

	@Override
	@Transactional(rollbackFor = Exception.class)
	public DispatchReportResultVO submitDispatch(DispatchReportDTO dto) {
		validate(dto);
		// TODO: 校验派工单已审核、人员待报量；INSERT 报工记录；UPDATE WT 完工数
		String reportNo = nextReportNo();
		DispatchReportResultVO vo = new DispatchReportResultVO();
		vo.setReportNo(reportNo);
		return vo;
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public DispatchReportBatchResultVO submitBatch(DispatchReportBatchDTO batch) {
		if (batch == null || batch.getPayloads() == null || batch.getPayloads().isEmpty()) {
			throw new ServiceException("没有可提交的报工数据");
		}
		DispatchReportBatchResultVO result = new DispatchReportBatchResultVO();
		for (DispatchReportDTO dto : batch.getPayloads()) {
			try {
				DispatchReportResultVO one = submitDispatch(dto);
				result.setSuccessCount(result.getSuccessCount() + 1);
				result.getReportNos().add(one.getReportNo());
			} catch (Exception ex) {
				result.setFailCount(result.getFailCount() + 1);
				DispatchReportBatchResultVO.DispatchReportErrorVO err =
					new DispatchReportBatchResultVO.DispatchReportErrorVO();
				err.setEmpNo(dto.getEmpNo());
				err.setEmpName(dto.getEmpName());
				err.setMessage(ex.getMessage());
				result.getErrors().add(err);
			}
		}
		return result;
	}

	@Override
	public BatchReportPrepVO getBatchPrep(String wtNo) {
		if (!StringUtils.hasText(wtNo)) {
			throw new ServiceException("缺少派工单号");
		}
		// TODO: 注入 IDispatchService，查询 WT 主档 + 未完成工序 + 人员待报量
		// 参考：DispatchService.listItems(wtNo) 过滤 fnQty < wtQty；DispatchService.listWorkers(...)
		BatchReportPrepVO vo = new BatchReportPrepVO();
		vo.setWtNo(wtNo.trim());
		vo.setPendingItemCount(0);
		vo.setTotalPendingQty(BigDecimal.ZERO);
		vo.setTotalReportAmt(BigDecimal.ZERO);
		return vo;
	}

	private void validate(DispatchReportDTO dto) {
		if (dto == null || !StringUtils.hasText(dto.getWtNo())) {
			throw new ServiceException("缺少派工单号");
		}
		BigDecimal reportQty = nz(dto.getReportQty());
		if (reportQty.compareTo(BigDecimal.ZERO) <= 0) {
			throw new ServiceException("报工数量须大于 0");
		}
		BigDecimal pending = nz(dto.getPendingQty());
		if (reportQty.compareTo(pending) > 0) {
			throw new ServiceException("报工数量不能超过待报数量（" + pending + "）");
		}
		BigDecimal sum = nz(dto.getPassQty()).add(nz(dto.getDefectQty())).add(nz(dto.getReworkQty()));
		if (sum.compareTo(reportQty) != 0) {
			throw new ServiceException("合格 + 不良 + 返工 须等于报工数量");
		}
		if (nz(dto.getDefectQty()).compareTo(BigDecimal.ZERO) > 0
			&& !StringUtils.hasText(dto.getDefectReason())) {
			throw new ServiceException("存在不良品时请填写不良原因");
		}
		if (!StringUtils.hasText(dto.getReportTime())) {
			dto.setReportTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
	}

	private BigDecimal nz(BigDecimal v) {
		return v == null ? BigDecimal.ZERO : v;
	}

	private String nextReportNo() {
		return "RP" + SEQ.incrementAndGet();
	}
}
