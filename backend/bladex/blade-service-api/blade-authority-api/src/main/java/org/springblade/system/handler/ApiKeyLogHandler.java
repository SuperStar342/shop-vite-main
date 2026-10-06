/**
 * BladeX Commercial License Agreement
 * Copyright (c) 2018-2099, https://bladex.cn. All rights reserved.
 * <p>
 * Use of this software is governed by the Commercial License Agreement
 * obtained after purchasing a license from BladeX.
 * <p>
 * 1. This software is for development use only under a valid license
 * from BladeX.
 * <p>
 * 2. Redistribution of this software's source code to any third party
 * without a commercial license is strictly prohibited.
 * <p>
 * 3. Licensees may copyright their own code but cannot use segments
 * from this software for such purposes. Copyright of this software
 * remains with BladeX.
 * <p>
 * Using this software signifies agreement to this License, and the software
 * must not be used for illegal purposes.
 * <p>
 * THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY. The author is
 * not liable for any claims arising from secondary or illegal development.
 * <p>
 * Author: Chill Zhuang (bladejava@qq.com)
 */
package org.springblade.system.handler;

import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springblade.core.launch.props.BladeProperties;
import org.springblade.core.launch.server.ServerInfo;
import org.springblade.core.secure.BladeUser;
import org.springblade.core.secure.handler.IApiKeyLogHandler;
import org.springblade.core.tool.constant.BladeConstant;
import org.springblade.core.tool.support.IdGenerator;
import org.springblade.core.tool.utils.Func;
import org.springblade.core.tool.utils.StringPool;
import org.springblade.core.tool.utils.UrlUtil;
import org.springblade.core.tool.utils.WebUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;

import java.util.Date;
import java.util.concurrent.CompletableFuture;

import static org.springblade.core.secure.constant.ApiKeyConstant.API_KEY_LOG_INSERT;

/**
 * API Key 调用日志处理器微服务实现
 *
 * @author Chill
 */
@Slf4j
@AllArgsConstructor
public class ApiKeyLogHandler implements IApiKeyLogHandler {

	private final JdbcTemplate jdbcTemplate;
	private final BladeProperties bladeProperties;
	private final ServerInfo serverInfo;

	@Override
	public void saveLog(BladeUser bladeUser, Long apiKeyId, long time, @Nullable HttpServletRequest request) {
		CompletableFuture.runAsync(() -> {
			try {
				jdbcTemplate.update(API_KEY_LOG_INSERT, collectLogParams(bladeUser, apiKeyId, time, request));
			} catch (Exception logException) {
				log.error("API Key日志保存失败: {}", logException.getMessage());
			}
		});
	}

	/**
	 * 收集日志参数
	 *
	 * @param bladeUser 认证用户
	 * @param apiKeyId  API Key 主键ID
	 * @param time      认证耗时(ms)
	 * @param request   当前请求对象
	 * @return SQL 参数数组
	 */
	private Object[] collectLogParams(BladeUser bladeUser, Long apiKeyId, long time, @Nullable HttpServletRequest request) {
		String tenantId = Func.toStrWithEmpty(bladeUser.getTenantId(), BladeConstant.ADMIN_TENANT_ID);
		String createBy = Func.toStrWithEmpty(bladeUser.getAccount(), bladeUser.getUserName());
		// 请求信息
		String requestUri = StringPool.EMPTY;
		String httpMethod = StringPool.EMPTY;
		String remoteIp = StringPool.EMPTY;
		String userAgent = StringPool.EMPTY;
		String params = StringPool.EMPTY;
		if (request != null) {
			requestUri = UrlUtil.getPath(request.getRequestURI());
			httpMethod = request.getMethod();
			remoteIp = WebUtil.getIP(request);
			userAgent = Func.toStr(request.getHeader(WebUtil.USER_AGENT_HEADER));
			params = WebUtil.getRequestContent(request);
		}
		return new Object[]{
			IdGenerator.getId(), tenantId,
			bladeProperties.getName(), serverInfo.getIpWithPort(), serverInfo.getHostName(), bladeProperties.getEnv(),
			apiKeyId, requestUri, httpMethod, remoteIp, userAgent, params,
			String.valueOf(time), createBy, new Date()
		};
	}

}
