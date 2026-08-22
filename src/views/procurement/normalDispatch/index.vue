<template>
  <div class="nd-page auto-height-container">
    <header class="nd-hero">
      <div>
        <h1>普通派工</h1>
        <p>多工单选工序；单价不同按工费份额拆量；选人窗口可一键派工</p>
      </div>
      <nav class="nd-steps" aria-label="派工步骤">
        <button
          v-for="(s, idx) in stepItems"
          :key="s.key"
          class="nd-steps__item"
          :class="{ 'is-done': wizardStep > idx, 'is-current': wizardStep === idx }"
          type="button"
          @click="goStep(idx)"
        >
          <i>{{ idx + 1 }}</i>
          <span>{{ s.label }}</span>
        </button>
      </nav>
    </header>

    <!-- Step 1: 选择工单与工序 -->
    <div v-show="wizardStep === 0" class="nd-step nd-step--pick">
      <aside class="nd-wo-pane">
        <header>
          <strong>工单列表</strong>
          <em>共 {{ filteredWorkOrders.length }} 张</em>
          <el-button :icon="Refresh" link :loading="loading" @click="loadPreview" />
        </header>
        <el-input
          v-model.trim="woKeyword"
          clearable
          placeholder="工单单号 / 品名"
          size="small"
          @keyup.enter="onWoSearchEnter"
        />
        <div v-loading="loading" class="nd-wo-list">
          <label
            v-for="wo in filteredWorkOrders"
            :key="wo.woNo"
            class="nd-wo-card"
            :class="{ 'is-checked': selectedWoSet.has(wo.woNo), 'is-active': activeWoNo === wo.woNo }"
          >
            <el-checkbox :model-value="selectedWoSet.has(wo.woNo)" @change="(v: any) => toggleWo(wo, !!v)" @click.stop />
            <div class="nd-wo-card__body" @click="activeWoNo = wo.woNo">
              <div class="nd-wo-card__top">
                <b>{{ wo.woNo }}</b>
                <el-tag v-if="selectedWoSet.has(wo.woNo)" effect="plain" size="small" type="success">已选</el-tag>
              </div>
              <p>{{ wo.goodsName || '-' }}</p>
              <DispatchQtyCell
                align="left"
                :plan-qty="wo.planQty || wo.woQty"
                :remain-qty="wo.remainQty"
                :status="wo.dispatchStatus"
                :wt-qty="wo.wtQty"
              />
            </div>
          </label>
          <el-empty v-if="!filteredWorkOrders.length && !loading" description="暂无可派工单" />
        </div>
      </aside>

      <section class="nd-prc-pane">
        <header class="nd-prc-pane__head">
          <div>
            已选 <b>{{ selectedWoNos.length }}</b> 张工单
            <b>{{ selectedLines.length }}</b> 个工序
            共 <b>{{ selectedTaskCount }}</b> 个派工任务
          </div>
          <el-checkbox v-model="mergeSameProcess">同工序合并派工</el-checkbox>
        </header>

        <el-tabs v-model="pickTab">
          <el-tab-pane label="当前工单" name="current" />
          <el-tab-pane label="批量工序" name="batch" />
          <el-tab-pane :label="`已选任务 (${selectedTaskCount})`" name="picked" />
        </el-tabs>

        <div v-loading="prcLoading" class="nd-prc-pane__body">
          <template v-if="pickTab === 'current'">
            <el-table
              ref="currentTableRef"
              :key="activeWoNo"
              :data="activeWoLines"
              border
              height="100%"
              row-key="__key"
              @selection-change="onCurrentLineSelection"
            >
              <el-table-column type="selection" width="46" :selectable="(row: any) => num(row.remainQty) > 0" />
              <el-table-column label="工序编号/名称" min-width="160">
                <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
              </el-table-column>
              <el-table-column label="工序类型" min-width="110" prop="mrName" show-overflow-tooltip />
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ wageTypeLabel(row.pWageType) }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="96" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
              </el-table-column>
              <el-table-column label="加工工时" width="100" align="right">
                <template #default="{ row }">{{ fmtMachiningTime(row.machiningTime, row.timeUnit) }}</template>
              </el-table-column>
              <el-table-column label="加工次数" width="80" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningTimes) }}</template>
              </el-table-column>
              <el-table-column label="派工状态/数量" width="148" align="right">
                <template #default="{ row }">
                  <DispatchQtyCell
                    :plan-qty="row.woQty"
                    :remain-qty="row.remainQty"
                    :wt-qty="row.wtQty"
                  />
                </template>
              </el-table-column>
            </el-table>
          </template>

          <template v-else-if="pickTab === 'batch'">
            <el-table :data="batchProcessGroups" border height="100%" row-key="key" @expand-change="() => {}">
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="nd-expand">
                    <div
                      v-for="line in row.lines"
                      :key="lineKey(line)"
                      class="nd-expand__row"
                    >
                      <el-checkbox
                        :model-value="checkedLeafIds.includes(lineKey(line))"
                        @change="(v: any) => setLineChecked(line, !!v)"
                      >
                        {{ line.woNo }}
                      </el-checkbox>
                      <DispatchQtyCell
                        align="left"
                        size="sm"
                        :plan-qty="line.woQty"
                        :remain-qty="line.remainQty"
                        :wt-qty="line.wtQty"
                      />
                      <span class="nd-expand__meta">
                        {{ wageTypeLabel(line.pWageType) }}
                        · 单价 {{ fmtNum(line.machiningUp) }}
                        · 工时 {{ fmtMachiningTime(line.machiningTime, line.timeUnit) }}
                        · 次数 {{ fmtNum(line.machiningTimes) }}
                      </span>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column width="52">
                <template #default="{ row }">
                  <el-checkbox
                    :indeterminate="row.coverCount > 0 && row.coverCount < row.lines.length"
                    :model-value="row.coverCount === row.lines.length && row.lines.length > 0"
                    @change="(v: any) => toggleGroup(row, !!v)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="工序编号/名称" min-width="160">
                <template #default="{ row }">
                  {{ row.prcCode }} {{ row.prcName }}
                  <el-tag
                    class="nd-cover-tag"
                    effect="plain"
                    size="small"
                    :type="row.coverCount === selectedWoNos.length ? 'success' : row.coverCount > 0 ? 'warning' : 'danger'"
                  >
                    {{ row.coverCount }}/{{ selectedWoNos.length || 0 }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="工序类型" min-width="110" prop="mrName" show-overflow-tooltip />
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ row.wageTypeText }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="110" align="right">
                <template #default="{ row }">
                  <span>{{ row.upText }}</span>
                  <small v-if="row.upMixed" class="nd-mixed">各工单不同</small>
                </template>
              </el-table-column>
              <el-table-column label="加工工时" width="110" align="right">
                <template #default="{ row }">{{ row.timeText }}</template>
              </el-table-column>
              <el-table-column label="包含工单数" width="100" align="center">
                <template #default="{ row }">{{ row.lines.length }}</template>
              </el-table-column>
              <el-table-column label="派工状态/数量" width="148" align="right">
                <template #default="{ row }">
                  <DispatchQtyCell
                    :plan-qty="row.planSum"
                    :remain-qty="row.remainSum"
                    :status="groupDispatchStatus(row.lines)"
                  />
                </template>
              </el-table-column>
            </el-table>
            <div class="nd-legend">
              <span><i class="is-none" />未派工</span>
              <span><i class="is-partial" />部分派工</span>
              <span><i class="is-done" />已派工</span>
              <span><i class="is-all" />所有已选工单都包含此工序</span>
              <span><i class="is-part" />部分工单包含此工序</span>
            </div>
          </template>

          <template v-else>
            <el-table :data="selectedLines" border height="100%">
              <el-table-column label="工单" width="130" prop="woNo" />
              <el-table-column label="工序" min-width="150">
                <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
              </el-table-column>
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ wageTypeLabel(row.pWageType) }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="96" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
              </el-table-column>
              <el-table-column label="加工工时" width="100" align="right">
                <template #default="{ row }">{{ fmtMachiningTime(row.machiningTime, row.timeUnit) }}</template>
              </el-table-column>
              <el-table-column label="派工状态/数量" width="148" align="right">
                <template #default="{ row }">
                  <DispatchQtyCell
                    :plan-qty="row.woQty"
                    :remain-qty="row.remainQty"
                    :wt-qty="row.wtQty"
                  />
                </template>
              </el-table-column>
              <el-table-column label="预估工费" width="100" align="right">
                <template #default="{ row }">{{ fmtNum(estimateBorWage(row)) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button link type="danger" @click="setLineChecked(row, false)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>

        <footer class="nd-prc-pane__foot">
          <span>已选 {{ selectedWoNos.length }} 张工单 · {{ selectedLines.length }} 道工序</span>
          <div>
            <el-button @click="clearSelection">清空</el-button>
            <el-button type="success" plain :loading="smartLoading" :disabled="!selectedWoNos.length" @click="openSmartDialog">
              智能派工
            </el-button>
            <el-button type="primary" :disabled="!selectedLines.length" @click="wizardStep = 1">
              下一步：选择人员
            </el-button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Step 2: 指派人员与数量 -->
    <div v-show="wizardStep === 1" class="nd-step nd-step--assign">
      <aside class="nd-side-summary">
        <header>已选工单</header>
        <ul>
          <li v-for="(woNo, i) in selectedWoNos" :key="woNo" :style="{ '--c': woColors[i % woColors.length] }">
            <i />{{ woNo }}
          </li>
        </ul>
        <dl>
          <div><dt>工单</dt><dd>{{ selectedWoNos.length }}</dd></div>
          <div><dt>工序</dt><dd>{{ selectedLines.length }}</dd></div>
          <div><dt>总量</dt><dd>{{ fmtNum(totalRemainQty) }}</dd></div>
          <div><dt>预估工费</dt><dd>{{ fmtNum(estimatedWageTotal) }}</dd></div>
        </dl>
      </aside>

      <section class="nd-assign-pane">
        <header class="nd-assign-pane__head">
          <div class="nd-assign-pane__head-left">
            <el-radio-group v-model="assignView" size="small">
              <el-radio-button value="wo">按工单查看</el-radio-button>
              <el-radio-button value="process">按工序汇总查看</el-radio-button>
            </el-radio-group>
            <span class="nd-hint">比例与数量联动：改比例自动算数量，改数量自动回写比例</span>
          </div>
          <div class="nd-assign-pane__head-right">
            <span class="nd-hint">
              {{
                mergeSameProcess
                  ? '同工序合并：按工费份额拆到各工单（单价不同更公平）'
                  : '按工序查看：工序下展示各工单，每张工单独立选人、填数量'
              }}
            </span>
            <el-button size="small" type="success" plain :loading="smartLoading" @click="openSmartDialog">
              智能派工
            </el-button>
            <el-button size="small" type="primary" plain :disabled="!selectedLines.length" @click="openEmpPickerGlobal">
              选择人员
            </el-button>
            <el-button size="small" type="primary" plain @click="applyEqualAll">全部平均</el-button>
          </div>
        </header>

        <el-table
          :data="assignTableData"
          border
          height="100%"
          row-key="rowKey"
          :row-class-name="assignRowClassName"
          :span-method="assignSpanMethod"
        >
          <el-table-column label="工单 / 工序" min-width="180">
            <template #default="{ row }">
              <template v-if="row.kind === 'wo-head'">
                <div class="nd-wo-head-row">
                  <b class="nd-wo-head">{{ row.woNo }}</b>
                  <DispatchQtyCell
                    align="left"
                    mode="alloc"
                    size="sm"
                    :assigned-qty="row.assignedQty"
                    :remain-qty="row.remainQty"
                  />
                </div>
              </template>
              <template v-else-if="row.kind === 'process-head'">
                <div class="nd-prc-cell nd-prc-cell--head">
                  <span>{{ row.prcCode }} {{ row.prcName }}</span>
                  <small>{{ row.mrName || '' }} · 含 {{ row.woCount }} 张工单</small>
                </div>
              </template>
              <template v-else-if="row.kind === 'line-sub'">
                <div class="nd-wo-under-prc">
                  <el-tag effect="plain" size="small" type="info">{{ row.woText }}</el-tag>
                  <small>本工单工序</small>
                </div>
              </template>
              <template v-else>
                <div class="nd-prc-cell">
                  <span>{{ row.prcCode }} {{ row.prcName }}</span>
                  <small v-if="row.woText">{{ row.woText }}</small>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="工序类型" min-width="100" prop="mrName" show-overflow-tooltip />
          <el-table-column label="计薪" width="72" align="center">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ row.wageTypeText }}</template>
            </template>
          </el-table-column>
          <el-table-column label="加工单价" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <div class="nd-up-cell">
                  <span>{{ row.upText }}</span>
                  <small v-if="row.upMixed">各工单单价不同，按工费份额拆量</small>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="加工工时" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ row.timeText }}</template>
            </template>
          </el-table-column>
          <el-table-column label="派工状态/数量" width="148" align="right">
            <template #default="{ row }">
              <DispatchQtyCell
                v-if="row.kind !== 'wo-head'"
                :plan-qty="row.planQty"
                :remain-qty="row.remainQty"
                :wt-qty="row.wtQty"
              />
            </template>
          </el-table-column>
          <el-table-column label="精细化指派（人员 / 比例 / 数量）" min-width="380">
            <template #default="{ row }">
              <div v-if="row.kind === 'process-head'" class="nd-fine nd-fine--head">
                <el-button :icon="Plus" size="small" type="primary" plain @click="openEmpForProcess(row.processKey)">
                  为各工单统一选人
                </el-button>
                <span class="nd-muted">快捷：一次选人并分别填各工单数量；也可在下方每张工单行单独配置</span>
              </div>
              <div v-else-if="row.kind !== 'wo-head'" class="nd-fine">
                <article v-for="w in row.workers" :key="w.empNo" class="nd-fine__card">
                  <div class="nd-fine__who">
                    <em>{{ (w.empName || '?').slice(0, 1) }}</em>
                    <div>
                      <strong>{{ w.empName || w.empNo }}</strong>
                      <span>{{ w.empNo }}</span>
                    </div>
                    <button
                      v-if="row.editable"
                      class="nd-fine__remove"
                      type="button"
                      title="移除"
                      @click="removeWorker(row.taskKey, w.empNo)"
                    >
                      ×
                    </button>
                  </div>
                  <div class="nd-fine__fields">
                    <label>
                      比例%
                      <el-input-number
                        v-model="w.ratio"
                        controls-position="right"
                        :disabled="!row.editable"
                        :max="100"
                        :min="0"
                        :precision="0"
                        :step="1"
                        @change="onWorkerRatioChange(row.taskKey)"
                      />
                    </label>
                    <label>
                      数量
                      <el-input-number
                        v-model="w.planQty"
                        controls-position="right"
                        :disabled="!row.editable"
                        :max="num(row.remainQty)"
                        :min="0"
                        :precision="2"
                        :step="1"
                        @change="onWorkerQtyChange(row.taskKey)"
                      />
                    </label>
                    <span v-if="row.lines?.[0]" class="nd-fine__wage">
                      工费 {{ fmtNum(num(w.planQty) * num(row.lines[0].machiningUp)) }}
                    </span>
                  </div>
                </article>
                <div v-if="row.editable" class="nd-fine__actions">
                  <el-button :icon="Plus" size="small" type="primary" @click="openEmpFor(row.taskKey)">
                    {{ row.kind === 'line-sub' ? '选择人员' : '加人' }}
                  </el-button>
                  <el-button size="small" :disabled="!row.workers.length" @click="applyEqualTask(row.taskKey)">
                    本行平均
                  </el-button>
                </div>
                <span v-if="!row.workers.length && !row.editable" class="nd-muted">由汇总行分配后按未派量比例拆分</span>
                <p v-if="row.editable && row.overAssign" class="nd-fine__warn">已分 {{ fmtNum(row.assignedQty) }} 超出未派 {{ fmtNum(row.remainQty) }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="本次分配/未派" width="148" align="right">
            <template #default="{ row }">
              <div v-if="row.kind !== 'wo-head'" :class="{ 'is-bad': row.overAssign }">
                <DispatchQtyCell
                  mode="alloc"
                  :assigned-qty="row.assignedQty"
                  :remain-qty="row.remainQty"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="预估工费" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <b class="is-ok">{{ fmtNum(row.estWage) }}</b>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <footer>
          <span>
            已分配任务 {{ assignedTaskCount }}/{{ assignRows.length }} · 数量
            {{ fmtNum(assignedTotalQty) }}/{{ fmtNum(totalRemainQty) }}
            · 预估工费 {{ fmtNum(estimatedWageTotal) }}
            <em v-if="hasOverAssign" class="is-bad"> · 存在超量分配</em>
          </span>
          <div>
            <el-button @click="wizardStep = 0">上一步</el-button>
            <el-button type="primary" :disabled="!canGoConfirm" @click="wizardStep = 2">确认派工</el-button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Step 3: 确认 -->
    <div v-show="wizardStep === 2" class="nd-step nd-step--confirm">
      <section class="nd-confirm">
        <header>
          <strong>确认派工内容</strong>
          <el-tag effect="plain" type="success">将生成 1 张派工单</el-tag>
        </header>
        <div class="nd-kpi">
          <div><em>工单</em><b>{{ selectedWoNos.length }}</b></div>
          <div><em>工序行</em><b>{{ selectedLines.length }}</b></div>
          <div><em>人员</em><b>{{ uniqueWorkerCount }}</b></div>
          <div><em>派量</em><b>{{ fmtNum(assignedTotalQty) }}</b></div>
          <div><em>预估工费</em><b>{{ fmtNum(estimatedWageTotal) }}</b></div>
        </div>
        <el-table :data="confirmItems" border max-height="420">
          <el-table-column label="工单" width="120" prop="woNo" />
          <el-table-column label="工序" min-width="140">
            <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
          </el-table-column>
          <el-table-column label="计薪" width="72" align="center" prop="wageTypeText" />
          <el-table-column label="加工单价" width="90" align="right">
            <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
          </el-table-column>
          <el-table-column label="加工工时" width="100" align="right" prop="timeText" />
          <el-table-column label="人员分配" min-width="200">
            <template #default="{ row }">
              <span v-for="w in row.workers" :key="w.empNo" class="nd-chip nd-chip--sm">
                {{ w.empName || w.empNo }} {{ fmtNum(w.planQty) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="派量" width="90" align="right">
            <template #default="{ row }">{{ fmtNum(row.qty) }}</template>
          </el-table-column>
          <el-table-column label="预估工费" width="100" align="right">
            <template #default="{ row }">{{ fmtNum(row.estWage) }}</template>
          </el-table-column>
        </el-table>
        <footer>
          <el-button @click="wizardStep = 1">上一步</el-button>
          <el-button type="primary" :loading="saving" :disabled="!canSubmit" @click="submit">提交派工</el-button>
        </footer>
      </section>
    </div>

    <EmpPickerDialog
      v-model="empDialog"
      :alloc-lines="editingAllocLines"
      :dialog-title="empDialogTitle"
      :line-workers="editingLineWorkers"
      :one-clickable="wizardStep === 1 && selectedLines.length > 0"
      :preferred-dept-id="preferredDeptId"
      :selected="empDialogSelected"
      @confirm="onEmpPickerConfirm"
      @confirm-alloc="onEmpPickerConfirmAlloc"
      @one-click="onEmpPickerOneClick"
    />

    <el-dialog v-model="smartDialog" title="智能派工" width="520px" append-to-body destroy-on-close>
      <p class="nd-smart-tip">
        按本车间近 {{ smartDays }} 天工序经验与在途负荷推荐人员；采用后按<strong>推荐得分占比</strong>分配比例（高分多派），再按工费份额拆到各工单。
      </p>
      <el-form label-width="88px">
        <el-form-item label="推荐人数">
          <el-input-number v-model="smartLimit" :max="5" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="回溯天数">
          <el-input-number v-model="smartDays" :max="90" :min="7" :step="1" />
        </el-form-item>
      </el-form>
      <ul v-if="smartPreview.length" class="nd-smart-list">
        <li v-for="(e, i) in smartPreview" :key="e.empNo">
          <b>{{ i + 1 }}. {{ e.empName || e.empNo }}</b>
          <span>{{ e.empNo }}</span>
          <em>{{ e.reason || '' }}</em>
          <small>得分 {{ e.score }} · 预计比例 {{ smartPreviewRatio(e) }}%</small>
        </li>
      </ul>
      <el-empty v-else-if="smartPreviewTried" :image-size="56" description="暂无推荐结果" />
      <template #footer>
        <el-button @click="smartDialog = false">取消</el-button>
        <el-button :loading="smartLoading" @click="previewSmartSuggest">预览推荐</el-button>
        <el-button type="primary" :loading="smartLoading" @click="applySmartDispatch">采用并分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  getQuickDispatchEmployees,
  getQuickDispatchPreview,
  getQuickDispatchProcesses,
  getQuickDispatchSmartSuggest,
  submitQuickDispatch,
} from '/@/api/procurement/quickDispatch'
import {
  applyEqualWorkers,
  fmtNum,
  num,
  redistributeWorkersByRatio,
  resolveDispatchStatus,
  splitWorkersByWage,
  syncWorkersRatioFromQty,
  type AllocWorker,
} from '/@/utils/dispatchAlloc'
import {
  borLineKey,
  estimateBorWage,
  fmtMachiningTime,
  summarizeBorWageFields,
  wageTypeLabel,
} from '/@/utils/dispatchBor'
import DispatchQtyCell from './DispatchQtyCell.vue'
import EmpPickerDialog, { type EmpAllocLine } from './EmpPickerDialog.vue'

defineOptions({ name: 'NormalDispatch' })

const route = useRoute()

const stepItems = [
  { key: 'pick', label: '选择工单与工序' },
  { key: 'assign', label: '指派人员与数量' },
  { key: 'confirm', label: '确认派工' },
]

const woColors = ['#3b82f6', '#2e7d5a', '#ea580c', '#7c3aed', '#0891b2']

const wizardStep = ref(0)
const loading = ref(false)
const prcLoading = ref(false)
const saving = ref(false)
const smartLoading = ref(false)
const smartDialog = ref(false)
const smartLimit = ref(2)
const smartDays = ref(30)
const smartPreview = ref<any[]>([])
const smartPreviewTried = ref(false)
const mergeSameProcess = ref(true)
const pickTab = ref<'current' | 'batch' | 'picked'>('batch')
const assignView = ref<'wo' | 'process'>('process')
/** 防止比例↔数量联动时互相触发 */
const allocSyncing = ref(false)
const woKeyword = ref('')
const queryWoNo = ref('')
const queryMoNo = ref('')
const activeWoNo = ref('')
const allWorkOrders = ref<any[]>([])
const linesByWo = ref<Record<string, any[]>>({})
const selectedWoSet = ref<Set<string>>(new Set())
const checkedLeafIds = ref<string[]>([])
/** taskKey → workers（合并时为工序键，非合并为行键） */
const assignMap = ref<Record<string, AllocWorker[]>>({})
const empDialog = ref(false)
const editingTaskKey = ref('')
const editingAllocLines = ref<EmpAllocLine[]>([])
const currentTableRef = ref<any>(null)
const syncingCurrentTable = ref(false)

const lineKey = borLineKey

const processKey = (row: any) => `${row.mrCode || ''}|${row.prcCode || ''}`

const taskKeyOf = (line: any) => (mergeSameProcess.value ? processKey(line) : lineKey(line))

const summarizeWageFields = summarizeBorWageFields

const selectedWoNos = computed(() => [...selectedWoSet.value])

const filteredWorkOrders = computed(() => {
  const kw = woKeyword.value.trim().toLowerCase()
  return allWorkOrders.value.filter((wo) => {
    if (!kw) return true
    return `${wo.woNo || ''}${wo.goodsName || ''}${wo.moNo || ''}`.toLowerCase().includes(kw)
  })
})

const activeWoLines = computed(() => {
  const woNo = activeWoNo.value || selectedWoNos.value[0]
  if (!woNo) return []
  return (linesByWo.value[woNo] || [])
    .filter((l) => num(l.remainQty) > 0)
    .map((l) => ({ ...l, __key: lineKey(l) }))
})

const selectedLines = computed(() => {
  const map = new Map<string, any>()
  for (const lines of Object.values(linesByWo.value)) {
    for (const line of lines || []) {
      if (num(line.remainQty) <= 0) continue
      map.set(lineKey(line), line)
    }
  }
  return checkedLeafIds.value.map((id) => map.get(id)).filter(Boolean)
})

const selectedTaskCount = computed(() => {
  if (!mergeSameProcess.value) return selectedLines.value.length
  return new Set(selectedLines.value.map(processKey)).size
})

const totalRemainQty = computed(() => selectedLines.value.reduce((s, l) => s + num(l.remainQty), 0))

const preferredDeptId = computed(() => {
  const woNo = selectedLines.value[0]?.woNo || selectedWoNos.value[0]
  return allWorkOrders.value.find((w) => w.woNo === woNo)?.deptId
})

/** 批量工序分组（来自已选工单的全部待派工序） */
const batchProcessGroups = computed(() => {
  const groups = new Map<string, any>()
  for (const woNo of selectedWoNos.value) {
    for (const line of linesByWo.value[woNo] || []) {
      if (num(line.remainQty) <= 0) continue
      const key = processKey(line)
      const g = groups.get(key) || {
        key,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        mrName: line.mrName,
        prcName: line.prcName,
        lines: [] as any[],
        remainSum: 0,
        planSum: 0,
        coverCount: 0,
      }
      g.lines.push(line)
      g.remainSum += num(line.remainQty)
      g.planSum += num(line.woQty)
      groups.set(key, g)
    }
  }
  for (const g of groups.values()) {
    g.coverCount = g.lines.filter((l: any) => checkedLeafIds.value.includes(lineKey(l))).length
    Object.assign(g, summarizeWageFields(g.lines))
  }
  return [...groups.values()].sort((a, b) => String(a.prcCode).localeCompare(String(b.prcCode)))
})

/** 可编辑任务行（合并或逐行） */
const assignRows = computed(() => {
  if (mergeSameProcess.value) {
    const grouped = new Map<string, any[]>()
    for (const line of selectedLines.value) {
      const key = processKey(line)
      const list = grouped.get(key) || []
      list.push(line)
      grouped.set(key, list)
    }
    return [...grouped.entries()].map(([key, lines]) => {
      const sample = lines[0]
      const remainQty = lines.reduce((s, l) => s + num(l.remainQty), 0)
      const planQty = lines.reduce((s, l) => s + num(l.woQty), 0)
      const workers = assignMap.value[key] || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      const wage = summarizeWageFields(lines)
      const split = splitWorkersByWage(workers, lines)
      const qtyMap = new Map(split.map(({ line, workers: ws }) => [lineKey(line), ws.reduce((s, w) => s + num(w.planQty), 0)]))
      const estWage = assignedQty > 0 ? wage.estWageByQty(qtyMap, assignedQty) : wage.estWageByQty(null, remainQty)
      return {
        kind: 'task',
        rowKey: key,
        taskKey: key,
        editable: true,
        prcCode: sample.prcCode,
        prcName: sample.prcName,
        mrName: sample.mrName,
        woText: `关联 ${[...new Set(lines.map((l) => l.woNo))].join('、')}`,
        remainQty,
        planQty,
        wtQty: lines.reduce((s, l) => s + num(l.wtQty), 0),
        assignedQty,
        overAssign: assignedQty - remainQty > 0.000001,
        workers,
        lines,
        ...wage,
        estWage,
      }
    })
  }
  return selectedLines.value.map((line) => {
    const key = lineKey(line)
    const workers = assignMap.value[key] || []
    const remainQty = num(line.remainQty)
    const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
    const wage = summarizeWageFields([line])
    const qty = assignedQty > 0 ? assignedQty : remainQty
    return {
      kind: 'task',
      rowKey: key,
      taskKey: key,
      editable: true,
      prcCode: line.prcCode,
      prcName: line.prcName,
      mrName: line.mrName,
      woText: line.woNo,
      remainQty,
      planQty: num(line.woQty),
      wtQty: num(line.wtQty),
      assignedQty,
      overAssign: assignedQty - remainQty > 0.000001,
      workers,
      lines: [line],
      ...wage,
      estWage: estimateBorWage(line, qty),
    }
  })
})

const lineSplitMap = computed(() => {
  const map = new Map<string, AllocWorker[]>()
  for (const row of assignRows.value) {
    const splits = splitWorkersByWage(row.workers, row.lines)
    for (const { line, workers } of splits) {
      map.set(lineKey(line), workers)
    }
  }
  return map
})

const assignTableRows = computed(() => {
  if (assignView.value === 'process' || !mergeSameProcess.value) {
    return assignRows.value
  }
  // 按工单查看：展示拆分后的人员（只读），编辑仍在汇总
  const rows: any[] = []
  const byWo = new Map<string, any[]>()
  for (const line of selectedLines.value) {
    const list = byWo.get(line.woNo) || []
    list.push(line)
    byWo.set(line.woNo, list)
  }
  for (const [woNo, lines] of byWo) {
    let remain = 0
    let assigned = 0
    const children = lines.map((line) => {
      const workers = lineSplitMap.value.get(lineKey(line)) || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      remain += num(line.remainQty)
      assigned += assignedQty
      const wage = summarizeWageFields([line])
      const qty = assignedQty > 0 ? assignedQty : num(line.remainQty)
      return {
        kind: 'line',
        rowKey: lineKey(line),
        taskKey: taskKeyOf(line),
        editable: !mergeSameProcess.value,
        woNo,
        prcCode: line.prcCode,
        prcName: line.prcName,
        mrName: line.mrName,
        remainQty: num(line.remainQty),
        planQty: num(line.woQty),
        wtQty: num(line.wtQty),
        assignedQty,
        overAssign: assignedQty - num(line.remainQty) > 0.000001,
        workers,
        lines: [line],
        ...wage,
        estWage: estimateBorWage(line, qty),
      }
    })
    rows.push({
      kind: 'wo-head',
      rowKey: `wo:${woNo}`,
      woNo,
      remainQty: remain,
      assignedQty: assigned,
    })
    rows.push(...children)
  }
  return rows
})

/** 不合并 + 按工序查看：同工多工单折叠为工序头 + 工单子行 */
const assignDisplayRows = computed(() => {
  const rows = assignRows.value
  const byProcess = new Map<string, any[]>()
  for (const row of rows) {
    const pk = processKey(row.lines[0])
    const list = byProcess.get(pk) || []
    list.push(row)
    byProcess.set(pk, list)
  }
  const out: any[] = []
  const entries = [...byProcess.entries()].sort((a, b) =>
    String(a[1][0]?.prcCode || '').localeCompare(String(b[1][0]?.prcCode || ''))
  )
  for (const [pk, groupRows] of entries) {
    if (groupRows.length > 1) {
      const sample = groupRows[0]
      const wage = summarizeWageFields(groupRows.flatMap((r) => r.lines))
      out.push({
        kind: 'process-head',
        rowKey: `proc:${pk}`,
        processKey: pk,
        prcCode: sample.prcCode,
        prcName: sample.prcName,
        mrName: sample.mrName,
        woCount: groupRows.length,
        remainQty: groupRows.reduce((s, r) => s + num(r.remainQty), 0),
        assignedQty: groupRows.reduce((s, r) => s + num(r.assignedQty), 0),
        estWage: groupRows.reduce((s, r) => s + num(r.estWage), 0),
        ...wage,
      })
      for (const row of groupRows) {
        out.push({
          ...row,
          kind: 'line-sub',
          rowKey: `sub:${row.rowKey}`,
          editable: true,
          woText: row.lines[0]?.woNo || row.woText,
        })
      }
    } else {
      out.push({ ...groupRows[0], kind: 'task', editable: true })
    }
  }
  return out
})

const assignTableData = computed(() => {
  if (mergeSameProcess.value) return assignTableRows.value
  if (assignView.value === 'wo') return assignTableRows.value
  return assignDisplayRows.value
})

const assignSpanMethod = ({ row, columnIndex }: any) => {
  if (row.kind === 'wo-head') {
    if (columnIndex === 0) return [1, 9]
    return [0, 0]
  }
  return [1, 1]
}

const assignRowClassName = ({ row }: { row: any }) => {
  if (row.kind === 'line-sub') return 'is-wo-sub-row'
  if (row.kind === 'process-head') return 'is-process-head-row'
  return ''
}

const assignedTaskCount = computed(() => assignRows.value.filter((r) => num(r.assignedQty) > 0).length)

const assignedTotalQty = computed(() =>
  [...lineSplitMap.value.values()].reduce((s, ws) => s + ws.reduce((a, w) => a + num(w.planQty), 0), 0)
)

const hasOverAssign = computed(() => assignRows.value.some((r) => r.overAssign))

const uniqueWorkerCount = computed(() => {
  const set = new Set<string>()
  for (const ws of Object.values(assignMap.value)) {
    for (const w of ws || []) set.add(w.empNo)
  }
  return set.size
})

const estimatedWageTotal = computed(() => {
  // 有已分数量时按已分量×各行单价；否则按未派量估算
  let total = 0
  for (const line of selectedLines.value) {
    const workers = lineSplitMap.value.get(lineKey(line)) || []
    const qty = workers.reduce((s, w) => s + num(w.planQty), 0)
    total += estimateBorWage(line, qty > 0 ? qty : undefined)
  }
  return total
})

const confirmItems = computed(() =>
  selectedLines.value
    .map((line) => {
      const workers = lineSplitMap.value.get(lineKey(line)) || []
      const qty = workers.reduce((s, w) => s + num(w.planQty), 0)
      return {
        woNo: line.woNo,
        prcCode: line.prcCode,
        prcName: line.prcName,
        wageTypeText: wageTypeLabel(line.pWageType),
        machiningUp: num(line.machiningUp),
        timeText: fmtMachiningTime(line.machiningTime, line.timeUnit),
        workers,
        qty,
        estWage: estimateBorWage(line, qty),
      }
    })
    .filter((r) => r.workers.length)
)

const canGoConfirm = computed(
  () => assignedTaskCount.value > 0 && assignedTotalQty.value > 0 && !hasOverAssign.value
)

const canSubmit = computed(() => confirmItems.value.length > 0 && !hasOverAssign.value)

const empDialogSelected = computed(() => {
  const lines = editingAllocLines.value
  if (lines.length > 0) {
    if (lines.length === 1) {
      const list = assignMap.value[lines[0].key] || []
      return list.map((w) => ({ empNo: w.empNo, empName: w.empName, deptName: w.deptName }))
    }
    const union = new Map<string, { empNo: string; empName?: string; deptName?: string }>()
    for (const line of lines) {
      for (const w of assignMap.value[line.key] || []) {
        if (!union.has(w.empNo)) {
          union.set(w.empNo, { empNo: w.empNo, empName: w.empName, deptName: w.deptName })
        }
      }
    }
    return [...union.values()]
  }
  if (!editingTaskKey.value) {
    const union = new Map<string, { empNo: string; empName?: string; deptName?: string }>()
    for (const line of selectedLines.value) {
      for (const w of assignMap.value[lineKey(line)] || []) {
        if (!union.has(w.empNo)) {
          union.set(w.empNo, { empNo: w.empNo, empName: w.empName, deptName: w.deptName })
        }
      }
    }
    return [...union.values()]
  }
  const list = assignMap.value[editingTaskKey.value] || []
  return list.map((w) => ({ empNo: w.empNo, empName: w.empName, deptName: w.deptName }))
})

const empDialogTitle = computed(() => {
  const lines = editingAllocLines.value
  if (lines.length === 1) {
    const l = lines[0]
    return `选择人员 · ${l.woNo} · ${l.prcCode || ''} ${l.prcName || ''}`.trim()
  }
  if (lines.length > 1) {
    const l = lines[0]
    return `选择人员 · ${l.prcCode || ''} ${l.prcName || ''}（${lines.length} 张工单）`.trim()
  }
  if (!editingTaskKey.value) {
    return `选择人员 · 全部 ${selectedLines.value.length} 道工序`
  }
  return '选择人员'
})

const editingLineWorkers = computed(() => {
  if (!editingAllocLines.value.length) return undefined
  const map: Record<string, AllocWorker[]> = {}
  for (const line of editingAllocLines.value) {
    map[line.key] = (assignMap.value[line.key] || []).map((w) => ({
      empNo: w.empNo,
      empName: w.empName,
      deptName: w.deptName,
      ratio: num(w.ratio),
      planQty: num(w.planQty),
    }))
  }
  return map
})

const buildAllocLine = (line: any): EmpAllocLine => ({
  key: lineKey(line),
  woNo: line.woNo,
  remainQty: num(line.remainQty),
  planQty: num(line.woQty),
  machiningUp: num(line.machiningUp),
  prcCode: line.prcCode,
  prcName: line.prcName,
})

const buildEditingAllocLines = (line: any): EmpAllocLine[] => {
  const pk = processKey(line)
  const group = selectedLines.value.filter((l) => processKey(l) === pk)
  return group.map(buildAllocLine)
}

const goStep = (idx: number) => {
  if (idx === 0) wizardStep.value = 0
  else if (idx === 1 && selectedLines.value.length) wizardStep.value = 1
  else if (idx === 2 && canGoConfirm.value) wizardStep.value = 2
}

const ensureWoLines = async (wo: any) => {
  const woNo = wo.woNo
  if (linesByWo.value[woNo]) return
  const lines = await getQuickDispatchProcesses({ woNo, moNo: queryMoNo.value || wo.moNo })
  linesByWo.value = { ...linesByWo.value, [woNo]: lines || [] }
}

const toggleWo = async (wo: any, checked: boolean) => {
  const next = new Set(selectedWoSet.value)
  if (checked) {
    next.add(wo.woNo)
    selectedWoSet.value = next
    activeWoNo.value = wo.woNo
    prcLoading.value = true
    try {
      await ensureWoLines(wo)
    } catch (e: any) {
      $baseMessage(e?.message || '加载工序失败', 'error', 'hey')
    } finally {
      prcLoading.value = false
    }
  } else {
    next.delete(wo.woNo)
    selectedWoSet.value = next
    const drop = new Set((linesByWo.value[wo.woNo] || []).map(lineKey))
    checkedLeafIds.value = checkedLeafIds.value.filter((id) => !drop.has(id))
    if (activeWoNo.value === wo.woNo) activeWoNo.value = selectedWoNos.value[0] || ''
  }
}

const setLineChecked = (line: any, checked: boolean) => {
  const id = lineKey(line)
  const set = new Set(checkedLeafIds.value)
  if (checked) set.add(id)
  else set.delete(id)
  checkedLeafIds.value = [...set]
}

const toggleGroup = (group: any, checked: boolean) => {
  const set = new Set(checkedLeafIds.value)
  for (const line of group.lines) {
    const id = lineKey(line)
    if (checked) set.add(id)
    else set.delete(id)
  }
  checkedLeafIds.value = [...set]
}

const onCurrentLineSelection = (rows: any[]) => {
  if (syncingCurrentTable.value) return
  const woNo = activeWoNo.value
  if (!woNo) return
  const other = checkedLeafIds.value.filter((id) => !String(id).startsWith(`${woNo}|`))
  const cur = (rows || []).map((r) => lineKey(r))
  checkedLeafIds.value = [...other, ...cur]
}

const syncCurrentTableSelection = async () => {
  await nextTick()
  const table = currentTableRef.value
  if (!table || pickTab.value !== 'current') return
  syncingCurrentTable.value = true
  table.clearSelection()
  const keep = new Set(checkedLeafIds.value)
  activeWoLines.value.forEach((row) => {
    if (keep.has(row.__key)) table.toggleRowSelection(row, true)
  })
  await nextTick()
  syncingCurrentTable.value = false
}

watch([activeWoNo, pickTab, () => checkedLeafIds.value.join('|')], () => {
  if (pickTab.value === 'current') syncCurrentTableSelection()
})

const clearSelection = () => {
  checkedLeafIds.value = []
  selectedWoSet.value = new Set()
  assignMap.value = {}
}

const openEmpFor = (taskKey: string) => {
  editingTaskKey.value = taskKey
  if (mergeSameProcess.value) {
    editingAllocLines.value = []
    empDialog.value = true
    return
  }
  const line = selectedLines.value.find((l) => lineKey(l) === taskKey)
  if (!line) return
  editingAllocLines.value = [buildAllocLine(line)]
  empDialog.value = true
}

const openEmpForProcess = (pk: string) => {
  const line = selectedLines.value.find((l) => processKey(l) === pk)
  if (!line) return
  editingTaskKey.value = lineKey(line)
  editingAllocLines.value = buildEditingAllocLines(line)
  empDialog.value = true
}

const openEmpPickerGlobal = () => {
  if (!selectedLines.value.length) {
    $baseMessage('请先选择工序', 'warning', 'hey')
    return
  }
  editingTaskKey.value = ''
  editingAllocLines.value = []
  empDialog.value = true
}

const taskCap = (taskKey: string) => {
  const row = assignRows.value.find((r) => r.taskKey === taskKey)
  return num(row?.remainQty)
}

const touchTask = (taskKey: string) => {
  assignMap.value = { ...assignMap.value, [taskKey]: [...(assignMap.value[taskKey] || [])] }
}

/** 比例 = 占本行未派量的百分比 */
const redistributeTaskByRatio = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length || cap <= 0) return
  redistributeWorkersByRatio(list, cap)
  touchTask(taskKey)
}

const syncTaskRatioFromQty = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length) return
  syncWorkersRatioFromQty(list, cap)
  touchTask(taskKey)
}

const applyEqualTask = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length) return
  applyEqualWorkers(list, cap)
  touchTask(taskKey)
}

const applyEqualAll = () => {
  for (const row of assignRows.value) {
    if (row.workers?.length) applyEqualTask(row.taskKey)
  }
}

const selectAllLinesForSelectedWos = async () => {
  prcLoading.value = true
  try {
    for (const woNo of selectedWoNos.value) {
      const wo = allWorkOrders.value.find((w) => w.woNo === woNo)
      if (wo) await ensureWoLines(wo)
    }
    const ids: string[] = []
    for (const woNo of selectedWoNos.value) {
      for (const line of linesByWo.value[woNo] || []) {
        if (num(line.remainQty) > 0) ids.push(lineKey(line))
      }
    }
    checkedLeafIds.value = ids
  } finally {
    prcLoading.value = false
  }
}

const selectedPrcCodes = computed(() => {
  const set = new Set<string>()
  for (const line of selectedLines.value) {
    if (line?.prcCode) set.add(String(line.prcCode))
  }
  return [...set]
})

/** 按推荐得分折算比例（合计 100%）；得分相同或缺失时退化为平均 */
const ratiosFromScores = (emps: any[]) => {
  const n = emps.length
  if (!n) return []
  if (n === 1) return [100]
  const weights = emps.map((e) => Math.max(0, num(e.score)))
  const sum = weights.reduce((s, w) => s + w, 0)
  if (sum <= 0) return equalRatios(n)
  let assigned = 0
  return emps.map((_, i) => {
    if (i === n - 1) return Math.max(0, 100 - assigned)
    const r = Math.round((weights[i] * 100) / sum)
    assigned += r
    return r
  })
}

const equalRatios = (n: number) => {
  if (n <= 0) return []
  const each = Math.floor(100 / n)
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 100 - each * (n - 1) : each))
}

const smartPreviewRatio = (emp: any) => {
  const list = smartPreview.value
  if (!list.length || !emp?.empNo) return 0
  const idx = list.findIndex((e) => e.empNo === emp.empNo)
  if (idx < 0) return 0
  return ratiosFromScores(list)[idx] ?? 0
}

const openSmartDialog = async () => {
  if (!selectedWoNos.value.length) {
    $baseMessage('请先勾选工单', 'warning', 'hey')
    return
  }
  smartPreview.value = []
  smartPreviewTried.value = false
  smartDialog.value = true
  if (!selectedLines.value.length) {
    await selectAllLinesForSelectedWos()
  }
}

const previewSmartSuggest = async () => {
  if (!selectedLines.value.length) {
    await selectAllLinesForSelectedWos()
  }
  if (!selectedLines.value.length) {
    $baseMessage('所选工单没有可派工序', 'warning', 'hey')
    return
  }
  smartLoading.value = true
  smartPreviewTried.value = true
  try {
    const data = await getQuickDispatchSmartSuggest({
      deptId: preferredDeptId.value,
      prcCodes: selectedPrcCodes.value,
      limit: smartLimit.value,
      days: smartDays.value,
    })
    smartPreview.value = Array.isArray(data?.employees) ? data.employees : []
    if (!smartPreview.value.length) {
      $baseMessage('未找到可推荐人员', 'warning', 'hey')
    }
  } catch (e: any) {
    smartPreview.value = []
    $baseMessage(e?.message || '智能推荐失败', 'error', 'hey')
  } finally {
    smartLoading.value = false
  }
}

const applyEmpsToAllTasks = async (emps: any[], successMsg: string, byScore = false) => {
  if (!emps.length) return
  const ratios = byScore ? ratiosFromScores(emps) : equalRatios(emps.length)
  const next: Record<string, AllocWorker[]> = {}
  for (const row of assignRows.value) {
    next[row.taskKey] = emps.map((e: any, i: number) => ({
      empNo: e.empNo,
      empName: e.empName,
      deptName: e.deptName,
      ratio: ratios[i] ?? 0,
      planQty: 0,
    }))
  }
  assignMap.value = next
  await nextTick()
  for (const row of assignRows.value) {
    if (byScore) redistributeTaskByRatio(row.taskKey)
    else applyEqualTask(row.taskKey)
  }
  smartDialog.value = false
  if (canGoConfirm.value) {
    wizardStep.value = 2
    $baseMessage(successMsg, 'success', 'hey')
  } else {
    wizardStep.value = 1
    $baseMessage('已自动分配，请检查数量后确认', 'success', 'hey')
  }
}

const applySmartDispatch = async () => {
  if (!selectedWoNos.value.length) {
    $baseMessage('请先勾选工单', 'warning', 'hey')
    return
  }
  smartLoading.value = true
  try {
    if (!selectedLines.value.length) await selectAllLinesForSelectedWos()
    await nextTick()
    if (!selectedLines.value.length) {
      $baseMessage('所选工单没有可派工序', 'warning', 'hey')
      return
    }
    let emps = smartPreview.value
    if (!emps.length) {
      const data = await getQuickDispatchSmartSuggest({
        deptId: preferredDeptId.value,
        prcCodes: selectedPrcCodes.value,
        limit: smartLimit.value,
        days: smartDays.value,
      })
      emps = Array.isArray(data?.employees) ? data.employees : []
      smartPreview.value = emps
      smartPreviewTried.value = true
    }
    if (!emps.length) {
      $baseMessage('智能推荐无结果，请打开选择人员窗口手动选人', 'warning', 'hey')
      return
    }
    const names = emps.map((e: any) => e.empName || e.empNo).join('、')
    const ratioHint = ratiosFromScores(emps).map((r) => `${r}%`).join(' / ')
    await applyEmpsToAllTasks(emps, `智能派工已采用（${names}，比例 ${ratioHint}），请确认提交`, true)
  } catch (e: any) {
    $baseMessage(e?.message || '智能派工失败', 'error', 'hey')
  } finally {
    smartLoading.value = false
  }
}

/** 改比例 → 重算数量 */
const onWorkerRatioChange = (taskKey: string) => {
  if (allocSyncing.value) return
  allocSyncing.value = true
  try {
    redistributeTaskByRatio(taskKey)
  } finally {
    allocSyncing.value = false
  }
}

/** 改数量 → 回写比例（与比例双向联动） */
const onWorkerQtyChange = (taskKey: string) => {
  if (allocSyncing.value) return
  allocSyncing.value = true
  try {
    syncTaskRatioFromQty(taskKey)
  } finally {
    allocSyncing.value = false
  }
}

const removeWorker = (taskKey: string, empNo: string) => {
  const list = (assignMap.value[taskKey] || []).filter((w) => w.empNo !== empNo)
  assignMap.value = { ...assignMap.value, [taskKey]: list }
  if (list.length) applyEqualTask(taskKey)
}

const onEmpPickerConfirmAlloc = (lines: { key: string; workers: AllocWorker[] }[]) => {
  const next = { ...assignMap.value }
  for (const { key, workers } of lines) {
    next[key] = workers
  }
  assignMap.value = next
  editingAllocLines.value = []
}

const onEmpPickerOneClick = async (
  emps: { empNo: string; empName?: string; deptName?: string }[]
) => {
  if (!emps.length) return
  editingAllocLines.value = []
  empDialog.value = false
  const names = emps.map((e) => e.empName || e.empNo).join('、')
  await applyEmpsToAllTasks(emps, `一键派工完成（${names}），请确认提交`, false)
}

const onEmpPickerConfirm = (emps: { empNo: string; empName?: string; deptName?: string }[]) => {
  editingAllocLines.value = []
  const key = editingTaskKey.value
  if (!key) return
  const prev = new Map((assignMap.value[key] || []).map((w) => [w.empNo, w]))
  const n = emps.length
  assignMap.value = {
    ...assignMap.value,
    [key]: emps.map((e) => {
      const old = prev.get(e.empNo)
      return {
        empNo: e.empNo,
        empName: e.empName,
        deptName: e.deptName,
        ratio: num(old?.ratio),
        planQty: num(old?.planQty),
      }
    }),
  }
  if (!n) return
  applyEqualTask(key)
}

const loadPreview = async () => {
  loading.value = true
  try {
    const data = await getQuickDispatchPreview({
      moNo: queryMoNo.value,
      woNo: queryWoNo.value,
    })
    allWorkOrders.value = (data.workOrders || []).filter((w: any) => num(w.remainQty) > 0)
    if (!activeWoNo.value && allWorkOrders.value[0]) activeWoNo.value = allWorkOrders.value[0].woNo
  } catch (e: any) {
    allWorkOrders.value = []
    $baseMessage(e?.message || '加载失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const onWoSearchEnter = () => {
  const kw = woKeyword.value.trim()
  if (/^W\d+/i.test(kw)) {
    queryWoNo.value = kw
    queryMoNo.value = ''
    loadPreview()
  }
}

const submit = async () => {
  if (!canSubmit.value) return
  const mo =
    queryMoNo.value ||
    selectedLines.value[0]?.moNo ||
    allWorkOrders.value.find((w) => w.woNo === selectedLines.value[0]?.woNo)?.moNo
  if (!mo) {
    $baseMessage('缺少制令号，无法生成派工单', 'warning', 'hey')
    return
  }
  const items = selectedLines.value
    .map((line) => {
      const workers = (lineSplitMap.value.get(lineKey(line)) || []).map((w) => ({
        empNo: w.empNo,
        planQty: num(w.planQty),
      }))
      return {
        woNo: line.woNo,
        moNo: line.moNo,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        goodsId: line.goodsId,
        woBorSno: line.woBorSno,
        workers,
      }
    })
    .filter((it) => it.workers.length)
  if (!items.length) {
    $baseMessage('没有可提交的工序分配', 'warning', 'hey')
    return
  }
  const workerAgg = new Map<string, number>()
  for (const it of items) {
    for (const w of it.workers) {
      workerAgg.set(w.empNo, (workerAgg.get(w.empNo) || 0) + num(w.planQty))
    }
  }
  saving.value = true
  try {
    const result = await submitQuickDispatch({
      moNo: mo,
      woNos: [...new Set(items.map((i) => i.woNo))],
      processes: items.map((i) => ({
        woNo: i.woNo,
        mrCode: i.mrCode,
        prcCode: i.prcCode,
        goodsId: i.goodsId,
        woBorSno: i.woBorSno,
      })),
      workers: [...workerAgg.entries()].map(([empNo, planQty]) => ({ empNo, planQty })),
      items,
    })
    $baseMessage(`已生成派工单 ${result?.wtNo || ''}`, 'success', 'hey')
    clearSelection()
    assignMap.value = {}
    wizardStep.value = 0
    await loadPreview()
  } catch (e: any) {
    $baseMessage(e?.message || '生成派工单失败', 'error', 'hey')
  } finally {
    saving.value = false
  }
}

watch(mergeSameProcess, () => {
  assignMap.value = {}
  if (mergeSameProcess.value) assignView.value = 'process'
  else assignView.value = 'process'
})

watch(selectedLines, () => {
  // 清理已不在选中范围的分配
  const valid = new Set(assignRows.value.map((r) => r.taskKey))
  const next: Record<string, AllocWorker[]> = {}
  for (const [k, v] of Object.entries(assignMap.value)) {
    if (valid.has(k)) next[k] = v
  }
  assignMap.value = next
})

onMounted(() => {
  const q = route.query || {}
  if (q.moNo) queryMoNo.value = String(q.moNo)
  if (q.woNo) {
    queryWoNo.value = String(q.woNo)
    woKeyword.value = String(q.woNo)
  }
  loadPreview()
})
</script>

<style lang="scss" scoped>
.nd-page {
  --nd-green: #2e7d5a;
  --nd-ink: #1f2d26;
  --nd-muted: #6b7c72;
  --nd-line: #d8e4dc;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  color: var(--nd-ink);
}

.nd-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: linear-gradient(100deg, #f3faf6 0%, #fff 55%, #f7fafc 100%);

  h1 {
    margin: 0;
    font-size: 18px;
    color: var(--nd-green);
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--nd-muted);
  }
}

.nd-steps {
  display: flex;
  gap: 8px;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    color: #8a9b90;
    cursor: pointer;

    i {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-style: normal;
      font-size: 12px;
      background: #dce8e0;
    }

    &.is-current,
    &.is-done {
      color: var(--nd-green);
      font-weight: 600;

      i {
        background: var(--nd-green);
        color: #fff;
      }
    }
  }
}

.nd-step--pick {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 8px;
}

.nd-wo-pane,
.nd-prc-pane,
.nd-assign-pane,
.nd-side-summary,
.nd-confirm {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.nd-wo-pane {
  padding: 10px;

  > header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    em {
      font-style: normal;
      font-size: 12px;
      color: var(--nd-muted);
    }
  }
}

.nd-wo-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin-top: 8px;
}

.nd-wo-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid #e5eee8;
  border-radius: 8px;
  cursor: pointer;

  &.is-checked {
    border-color: #9dceb3;
    background: #f3faf6;
  }

  &.is-active {
    box-shadow: inset 3px 0 0 var(--nd-green);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  p {
    margin: 4px 0;
    font-size: 12px;
    color: var(--nd-muted);
  }

}

.nd-prc-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e8f0eb;
  font-size: 13px;

  b {
    color: var(--nd-green);
    margin: 0 2px;
  }
}

.nd-prc-pane {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 12px;
  }
}

.nd-prc-pane__body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px;
}

.nd-prc-pane__foot,
.nd-assign-pane footer,
.nd-confirm footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e8f0eb;
  background: #fbfdfb;
  font-size: 12px;
  color: var(--nd-muted);
}

.nd-expand {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 12px 8px 48px;

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  &__meta {
    font-size: 12px;
    color: var(--nd-muted);
  }
}

.nd-mixed,
.nd-up-cell small {
  display: block;
  font-size: 11px;
  color: #ea580c;
}

.nd-up-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.nd-cover-tag {
  margin-left: 6px;
}

.nd-legend {
  display: flex;
  gap: 16px;
  padding: 6px 4px 0;
  font-size: 12px;
  color: var(--nd-muted);

  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;

    &.is-all,
    &.is-done {
      background: #2e7d5a;
    }

    &.is-none {
      background: #94a3b8;
    }

    &.is-part,
    &.is-partial {
      background: #ea580c;
    }
  }
}

.nd-step--assign {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 8px;
}

.nd-side-summary {
  padding: 12px;

  header {
    font-weight: 600;
    margin-bottom: 8px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 13px;

      i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--c);
      }
    }
  }

  dl {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    div {
      padding: 8px;
      border-radius: 8px;
      background: #f5f8f6;
    }

    dt {
      font-size: 11px;
      color: var(--nd-muted);
    }

    dd {
      margin: 2px 0 0;
      font-weight: 700;
      color: var(--nd-green);
    }
  }
}

.nd-assign-pane {
  > .nd-assign-pane__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-bottom: 1px solid #e8f0eb;
  }

  &__head-left,
  &__head-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .nd-hint {
    font-size: 12px;
    color: var(--nd-muted);
  }

  :deep(.el-table) {
    flex: 1;
  }

  :deep(.is-wo-sub-row > td) {
    background: #fbfdfb;
  }

  :deep(.is-wo-sub-row > td:first-child) {
    border-left: 3px solid #dce8e0;
    padding-left: 20px;
  }

  :deep(.is-process-head-row > td) {
    background: #f3faf6;
  }

  footer .is-bad,
  .is-bad {
    color: #c45656;

    :deep(.nd-dispatch-badge) {
      color: #c45656;
      background: #fef2f2;
      border-color: #fecaca;
    }
  }
}

.nd-prc-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &--head span {
    font-weight: 600;
    color: var(--nd-ink);
  }

  small {
    color: #8a9b90;
    font-size: 11px;
  }
}

.nd-wo-under-prc {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 4px;

  small {
    font-size: 11px;
    color: #9aaba0;
  }
}

.nd-fine {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;

  &--head {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__card {
    border: 1px solid #dce8e0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdfb;
  }

  &__who {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;

    em {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--nd-green);
      color: #fff;
      font-style: normal;
      font-size: 12px;
      font-weight: 700;
    }

    strong {
      display: block;
      font-size: 13px;
      line-height: 1.2;
    }

    span {
      font-size: 11px;
      color: #8a9b90;
    }
  }

  &__remove {
    border: 0;
    background: transparent;
    font-size: 18px;
    color: #a0aea6;
    cursor: pointer;
    line-height: 1;
  }

  &__fields {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
    align-items: end;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: var(--nd-muted);
    }

    :deep(.el-input-number) {
      width: 100%;
    }
  }

  &__wage {
    font-size: 12px;
    color: #2e7d5a;
    font-weight: 700;
    padding-bottom: 4px;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__warn {
    margin: 0;
    font-size: 12px;
    color: #c45656;
  }
}

.nd-wo-head-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.nd-wo-head {
  color: var(--nd-green);
}

.nd-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 4px;
  border-radius: 999px;
  background: #e8f4ec;
  font-size: 12px;

  &--sm {
    border-radius: 6px;
    padding: 2px 6px;
  }
}

.nd-muted {
  color: #9aaba0;
  font-size: 12px;
}

.is-ok {
  color: var(--nd-green);
}

.nd-step--confirm {
  flex: 1;
  min-height: 0;
}

.nd-confirm {
  padding: 12px;
  gap: 12px;

  > header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.nd-smart-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nd-muted);
  line-height: 1.5;
}

.nd-smart-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 240px;
  overflow: auto;

  li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    padding: 8px 10px;
    margin-bottom: 6px;
    border: 1px solid #dce8e0;
    border-radius: 8px;
    background: #f7fbf8;

    b {
      font-size: 13px;
      color: var(--nd-ink);
    }

    span {
      font-size: 12px;
      color: #8a9b90;
      justify-self: end;
    }

    em {
      grid-column: 1 / -1;
      font-style: normal;
      font-size: 12px;
      color: var(--nd-muted);
    }

    small {
      grid-column: 1 / -1;
      color: var(--nd-green);
      font-size: 12px;
    }
  }
}

.nd-kpi {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;

  div {
    padding: 10px;
    border-radius: 8px;
    background: #f3faf6;
  }

  em {
    display: block;
    font-style: normal;
    font-size: 12px;
    color: var(--nd-muted);
  }

  b {
    font-size: 18px;
    color: var(--nd-green);
  }
}

@media (max-width: 1100px) {
  .nd-step--pick,
  .nd-step--assign {
    grid-template-columns: 1fr;
  }

  .nd-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
