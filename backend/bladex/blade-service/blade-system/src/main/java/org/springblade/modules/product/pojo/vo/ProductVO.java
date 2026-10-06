package org.springblade.modules.product.pojo.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springblade.modules.product.pojo.entity.Product;
import org.springblade.modules.product.pojo.entity.ProductSpec;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "产品视图对象（含规格列表）")
public class ProductVO extends Product {

	@Schema(description = "规格列表")
	private List<ProductSpec> specs;
}
