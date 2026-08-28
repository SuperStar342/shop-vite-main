/**
 * 列表列权限注册表：pageCode = 路由 name，columns 与页面 el-table-column 的 prop/label 一致。
 * 来源于真实业务页，非 mock。新增表格页时在此登记，并在页面用 useListColumns。
 */

export interface ListColumnDef {
  prop: string
  label: string
}

export interface ListPageDef {
  pageCode: string
  pageName: string
  group?: string
  /** 对应 blade_menu.code / alias，用于按已授权菜单过滤可配页面 */
  menuCodes?: string[]
  columns: ListColumnDef[]
}

const col = (prop: string, label: string): ListColumnDef => ({ prop, label })

/** 全站可配置列表页（按模块分组） */
export const LIST_COLUMN_PAGES: ListPageDef[] = [
  // —— 商品 ——
  {
    pageCode: 'GoodsManagement',
    pageName: '商品管理',
    group: '商品',
    columns: [
      col('id', '商品ID'),
      col('name', '商品名称'),
      col('category', '商品分类'),
      col('images', '商品图'),
      col('price', '售价'),
      col('sales', '销量'),
      col('stock', '库存'),
      col('status', '状态'),
      col('isRecommend', '是否推荐'),
      col('datetime', '时间'),
    ],
  },
  {
    pageCode: 'GoodsSku',
    pageName: 'SKU 配置',
    group: '商品',
    columns: [
      col('category', '商品分类'),
      col('skuCode', 'SKU编码'),
      col('skuName', 'SKU名称'),
      col('price', '价格'),
      col('stock', '库存'),
      col('status', '状态'),
      col('sort', '排序'),
      col('remark', '备注'),
    ],
  },
  {
    pageCode: 'GoodsStock',
    pageName: '库存管理',
    group: '商品',
    columns: [
      col('goodsName', '商品名称'),
      col('goodsCode', '商品编码'),
      col('category', '分类'),
      col('currentStock', '当前库存'),
      col('minStock', '预警值'),
      col('maxStock', '最大库存'),
      col('unit', '单位'),
      col('status', '状态'),
      col('lastUpdateTime', '更新时间'),
      col('warehouse', '仓库'),
    ],
  },
  {
    pageCode: 'GoodsBrand',
    pageName: '品牌管理',
    group: '商品',
    columns: [col('name', '品牌名称'), col('logo', '品牌Logo'), col('desc', '品牌描述'), col('status', '状态')],
  },
  {
    pageCode: 'GoodsCoupon',
    pageName: '优惠券管理',
    group: '商品',
    columns: [
      col('id', 'ID'),
      col('name', '优惠券名称'),
      col('type', '类型'),
      col('discount', '优惠内容'),
      col('minAmount', '门槛金额'),
      col('maxDiscount', '最大优惠'),
      col('totalCount', '总数'),
      col('usedCount', '已用'),
      col('status', '状态'),
    ],
  },
  {
    pageCode: 'GoodsDiscount',
    pageName: '限时折扣',
    group: '商品',
    columns: [
      col('id', 'ID'),
      col('activityName', '活动名称'),
      col('goodsName', '商品名称'),
      col('goodsCode', '商品编码'),
      col('discountPrice', '折扣价'),
      col('originPrice', '原价'),
      col('stock', '库存'),
      col('status', '状态'),
      col('updateTime', '更新时间'),
    ],
  },
  {
    pageCode: 'GoodsImportExport',
    pageName: '商品导入导出',
    group: '商品',
    columns: [
      col('id', 'ID'),
      col('name', '商品名称'),
      col('code', '商品编码'),
      col('price', '价格'),
      col('stock', '库存'),
      col('status', '状态'),
      col('createTime', '创建时间'),
    ],
  },
  {
    pageCode: 'GoodsComment',
    pageName: '商品评论',
    group: '商品',
    columns: [
      col('id', '商品ID'),
      col('name', '商品名称'),
      col('image', '商品图'),
      col('comment', '评论内容'),
      col('reply', '回复内容'),
      col('datetime', '时间'),
    ],
  },
  {
    pageCode: 'Trade',
    pageName: '交易订单',
    group: '商品',
    columns: [
      col('image', '商品图'),
      col('transactionTime', '交易时间'),
      col('merchantOrderId', '商户订单号'),
      col('wechatPaymentNo', '微信支付单号'),
      col('paymentScene', '支付场景'),
      col('transactionStatus', '交易状态'),
      col('orderAmount', '订单金额'),
    ],
  },
  {
    pageCode: 'WorkOrder',
    pageName: '工单管理',
    group: '商品',
    columns: [col('uuid', '工单号'), col('title', '标题'), col('submit', '提交者'), col('accept', '受理人员')],
  },
  {
    pageCode: 'dispatch',
    pageName: '派工管理',
    group: '采购',
    menuCodes: ['dispatch', 'DispatchManagement'],
    columns: [
      col('wtNo', '派工单号'),
      col('oriType', '单据来源'),
      col('wtDate', '派工日期'),
      col('wsCode', '车间代号'),
      col('wsName', '车间名称'),
      col('deptCode', '部门代号'),
      col('deptName', '部门名称'),
      col('finishFlag', '完成状态'),
      col('cFlag', '审核状态'),
      col('ifClose', '结案状态'),
      col('ifCancel', '是否已作废'),
      col('moNo', '制令号'),
      col('ordNo', '订单号'),
    ],
  },
  {
    pageCode: 'dispatchReport',
    pageName: '派工报工',
    group: '采购',
    menuCodes: ['dispatchReport', 'DispatchReportManagement'],
    columns: [
      col('wtNo', '派工单号'),
      col('wtDate', '派工日期'),
      col('wsName', '车间名称'),
      col('deptName', '部门名称'),
      col('finishFlag', '完成状态'),
      col('cFlag', '审核状态'),
      col('moNo', '制令号'),
    ],
  },
  {
    pageCode: 'dispatchItem',
    pageName: '派工工序明细',
    group: '采购',
    menuCodes: ['dispatch', 'DispatchManagement', 'dispatchReport', 'DispatchReportManagement'],
    columns: [
      col('moNo', '制令号'),
      col('goodsCode', '品号'),
      col('goodsType', '货品类型'),
      col('sizeDesc', '规格尺寸'),
      col('unitCode', '标准单位'),
      col('mrName', '制程名称'),
      col('machiningSNo', '加工顺序'),
      col('prcCode', '工序代号'),
      col('prcName', '工序名称'),
      col('woBorSno', '工单BOR序号'),
      col('machiningUp', '加工单价'),
      col('fnQty', '完工数量'),
      col('wtQty', '派工数量'),
      col('assignQty', '已分派数量'),
      col('workGpName', '加工小组'),
      col('pWageType', '计件类型'),
      col('assignType', '分配方式'),
      col('ifReAssign', '是否再分配'),
      col('ifLastPrc', '是否完工工序'),
      col('sectionDesc', '部位属性描述'),
      col('machiningMultiple', '加工倍量'),
      col('productSizeDesc', '所属产品规格描述'),
      col('goodsName', '货品名称'),
      col('stdAttr', '标准属性'),
      col('propertyCode', '标签属性'),
      col('propertyValue', '属性值'),
      col('wmCode', '设备代号'),
      col('planStDate', '计划完工日期'),
      col('planEndDate', '计划结束日期'),
      col('cstLotNo', '完成品定制案号'),
      col('machiningDesc', '加工说明'),
      col('goodsRemark', '成品备注'),
      col('productReq', '产品加工要求'),
      col('oriPrcCode', '被替代工序代码'),
      col('oriWoBorSno', '被替代工序BOR序号'),
      col('oriPrcName', '被替代工序名称'),
      col('machiningAmt', '加工金额'),
      col('dcShowSeqNo', '序号'),
      col('saleUnit', '销售单位'),
      col('auxUnit', '辅单位'),
      col('auxUnitCode', '辅单位代号'),
      col('closeDate', '结案日期'),
      col('creator', '制单人'),
      col('ifClose', '建单状态'),
      col('styleCode', '产品款式'),
      col('fabricNo', '金相编号'),
      col('clrName', '颜色'),
      col('ordNo', '订单号'),
      col('woQty', '工单数量'),
      col('custOrdNo', '客户订单号'),
      col('sku', 'SKU'),
      col('woNo', '工单号'),
      col('remark', '备注'),
      col('progress', '完成率'),
    ],
  },
  {
    pageCode: 'dispatchWorker',
    pageName: '派工人员明细',
    group: '采购',
    menuCodes: ['dispatch', 'DispatchManagement', 'dispatchReport', 'DispatchReportManagement'],
    columns: [
      col('empNo', '工号'),
      col('empName', '姓名'),
      col('deptCode', '实际生产部门代号'),
      col('deptName', '实际生产部门名称'),
      col('planQty', '计划加工数量'),
      col('workGpName', '加工小组'),
      col('assistEmpNo', '辅助人员工号'),
      col('assistEmpName', '辅助人员姓名'),
      col('assistRate', '辅助补贴比例'),
      col('fnQty', '已完工数量'),
      col('fnPcsQty', '已完工计件数量'),
      col('fnStdTime', '完工标准工时'),
      col('woBorSno', '工单BOR序号'),
      col('progress', '完工进度'),
      col('remark', '备注'),
    ],
  },
  // —— 配置 ——
  {
    pageCode: 'UserManagement',
    pageName: '用户管理',
    group: '配置',
    menuCodes: ['user', 'UserManagement'],
    columns: [
      col('username', '账号'),
      col('name', '姓名'),
      col('deptName', '所属部门'),
      col('email', '邮箱'),
      col('phone', '手机号'),
      col('usertype', '用户平台'),
      col('datetime', '修改时间'),
    ],
  },
  {
    pageCode: 'RoleManagement',
    pageName: '角色管理',
    group: '配置',
    menuCodes: ['role', 'RoleManagement'],
    columns: [
      col('roleName', '角色名称'),
      col('tenantName', '所属租户'),
      col('roleAlias', '角色别名'),
      col('parentName', '上级角色'),
      col('sort', '排序'),
    ],
  },
  {
    pageCode: 'DepartmentManagement',
    pageName: '部门管理',
    group: '配置',
    menuCodes: ['dept', 'DepartmentManagement'],
    columns: [col('deptName', '部门名称'), col('fullName', '全称'), col('sort', '排序')],
  },
  {
    pageCode: 'TenantManagement',
    pageName: '租户管理',
    group: '配置',
    menuCodes: ['tenant', 'TenantManagement'],
    columns: [
      col('tenantId', 'tenantId'),
      col('tenantName', '租户名称'),
      col('linkMan', '联系人'),
      col('contactNumber', '联系电话'),
      col('address', '联系邮箱'),
      col('expireTime', '过期时间'),
      col('accountNumber', '账户额度'),
      col('datetime', '修改时间'),
    ],
  },
  {
    pageCode: 'MenuManagement',
    pageName: '菜单管理',
    group: '配置',
    menuCodes: ['menu', 'MenuManagement'],
    columns: [col('name', '菜单名称'), col('code', '编号'), col('path', '路由'), col('component', '组件'), col('sort', '排序')],
  },
  {
    pageCode: 'DictionaryManagement',
    pageName: '系统字典',
    group: '配置',
    menuCodes: ['dict', 'DictionaryManagement'],
    columns: [col('code', '字典编码'), col('dictValue', '字典名称'), col('sort', '排序'), col('remark', '备注')],
  },
  {
    pageCode: 'BizDictionaryManagement',
    pageName: '业务字典',
    group: '配置',
    menuCodes: ['dictbiz', 'BizDictionaryManagement', 'dictionaryBiz'],
    columns: [col('code', '字典编码'), col('dictValue', '字典名称'), col('sort', '排序'), col('remark', '备注')],
  },
  {
    pageCode: 'ParamManagement',
    pageName: '参数管理',
    group: '配置',
    menuCodes: ['param', 'ParamManagement'],
    columns: [col('paramName', '参数名'), col('paramKey', '参数键'), col('paramValue', '参数值'), col('remark', '备注')],
  },
  {
    pageCode: 'DataScope',
    pageName: '数据权限',
    group: '配置',
    menuCodes: ['data_scope', 'DataScope', 'dataScope'],
    columns: [
      col('scopeName', '权限名称'),
      col('resourceCode', '权限编号'),
      col('scopeColumn', '权限字段'),
      col('scopeField', '可见字段'),
      col('remark', '备注'),
    ],
  },
  {
    pageCode: 'ApiScope',
    pageName: '接口权限',
    group: '配置',
    menuCodes: ['api_scope', 'ApiScope', 'apiScope'],
    columns: [col('scopeName', '权限名称'), col('resourceCode', '权限编号'), col('scopePath', '权限路径'), col('remark', '备注')],
  },
  {
    pageCode: 'AuditLog',
    pageName: '审计日志',
    group: '配置',
    menuCodes: ['log', 'AuditLog', 'auditLog', 'record_data', 'api_log'],
    columns: [
      col('bizName', '模块'),
      col('env', '环境'),
      col('requestUri', '请求路径'),
      col('remoteIp', 'IP地址'),
      col('recordTime', '操作时间'),
    ],
  },
]

const normToken = (s: string) =>
  String(s || '')
    .trim()
    .toLowerCase()
    // 同步菜单时常写成「用户管理·user」
    .replace(/·[a-z0-9_]+$/i, '')

/** 页面是否匹配菜单 code / alias / 中文名 */
export function pageMatchesMenuCodes(page: ListPageDef, menuCodes: Set<string> | string[]) {
  const set = menuCodes instanceof Set ? menuCodes : new Set(menuCodes)
  if (!set.size) return true
  const aliases = [page.pageCode, page.pageName, ...(page.menuCodes || [])].filter(Boolean).map((a) => normToken(String(a)))
  const tokens = [...set].map(normToken).filter(Boolean)
  return tokens.some((t) => aliases.includes(t) || aliases.some((a) => a.includes(t) || t.includes(a)))
}

export function getListPage(pageCode: string) {
  return LIST_COLUMN_PAGES.find((p) => p.pageCode === pageCode)
}

export function getPageColumns(pageCode: string) {
  return getListPage(pageCode)?.columns || []
}

/** 按分组返回，供角色权限 UI 使用 */
export function getListPagesGrouped() {
  const map = new Map<string, ListPageDef[]>()
  LIST_COLUMN_PAGES.forEach((p) => {
    const g = p.group || '其他'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(p)
  })
  return [...map.entries()].map(([group, pages]) => ({ group, pages }))
}
