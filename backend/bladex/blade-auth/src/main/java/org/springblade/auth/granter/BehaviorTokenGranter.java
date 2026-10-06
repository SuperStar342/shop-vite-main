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
package org.springblade.auth.granter;

import org.springblade.core.oauth2.handler.PasswordHandler;
import org.springblade.core.oauth2.service.OAuth2ClientService;
import org.springblade.core.oauth2.service.OAuth2UserService;
import org.springblade.core.redis.cache.BladeRedis;
import org.springframework.stereotype.Component;

/**
 * 行为验证码登录授权（Saber3 grant_type=behavior）
 * <p>
 * 校验逻辑与图形验证码一致：behavior/check 通过后会把 ticket 写入 captcha 缓存，
 * 登录时携带 Captcha-Key / Captcha-Code（ticket）完成授权。
 */
@Component
public class BehaviorTokenGranter extends CaptchaTokenGranter {

	public static final String BEHAVIOR = "behavior";

	public BehaviorTokenGranter(OAuth2ClientService clientService, OAuth2UserService userService,
								PasswordHandler passwordHandler, BladeRedis bladeRedis) {
		super(clientService, userService, passwordHandler, bladeRedis);
	}

	@Override
	public String type() {
		return BEHAVIOR;
	}
}
