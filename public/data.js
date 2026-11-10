export const snapshot = { capturedAt: '2026-11-05T00:33:32.547Z', label: '2026-11-05 08:33:32', workspace: 'cx_test_new', tasks: 10, runs: 22, logs: 6960, demo: false };

const evidence = (file, title, description) => ({ src: `./assets/${file}.png`, title, description });
export const pages = [
  {
    id: 'tasks', title: '任务监控', category: '工作流', icon: 'tasks', short: '任务监控',
    intro: '先看清任务状态，再找到值得点开的那一行。',
    before: './assets/before-tasks.png', after: './assets/after-tasks.png',
    scenario: '10 个真实任务 · 列表与层级',
    afterNote: '优化任务行、状态配色与图标分工。',
    changes: [
      { title: '把阅读尺寸还给内容', before: '任务标题约 13px，状态与元信息约 11px；长标题和层级需要反复辨认。', after: '任务标题采用 14–15px，辅助信息不低于 12px；固定编号、标题、状态和运行信息的对齐关系。' },
      { title: '区分当前待办与历史失败', before: '待审核与历史失败的黄色提示接近，容易把旧失败当作当前异常。', after: '待审核保留蜂蜜色，历史失败使用克制的描边标签；状态文字始终保留。' },
      { title: '图标有角色，主题有统一规则', before: '多类任务重复使用剪贴板图标，较难通过图形识别内容。', after: '文档、审查、构建、环境各用独立图标；奶油底、细描边、圆角和选中蓝贯穿整套页面。' },
    ],
    evidence: [
      evidence('evidence-tasks-laptop', '1366 × 768 · 笔记本', '检查列表密度、标题长度与可见行数。'),
      evidence('evidence-tasks-mobile', '390 × 844 · 窄屏', '检查导航、层级与长任务名称的实际展示。'),
    ],
  },
  {
    id: 'detail', title: '任务详情与审阅', category: '工作流', icon: 'review', short: '详情与审阅',
    intro: '把“运行完成”和“等待人工放行”讲清楚，让结论与证据同时可达。',
    before: './assets/before-detail.png', after: './assets/after-detail.png',
    scenario: 'CXTE-9 · 审阅结论展开',
    afterNote: '本图对应 CXTE-9 的审阅状态；多次运行时间线另附实测截图。',
    changes: [
      { title: '让实际运行进入首屏', before: '在 1366 × 768 下，首条运行行约在 y=725，低于可见主区底部；标题与说明占去大半空间。', after: '压缩顶部重复信息，把任务状态、结论摘要和运行轨道放在连续的阅读区。' },
      { title: '结论、阻塞、下一步分层', before: '要展开内容才能区分“G1 评审通过”和任务仍在“待审核”的状态。', after: '直接展示评审结论、16 项检查与 2 项非阻塞偏差；保留“等待人工放行”，不把评审通过写成业务验收完成。' },
      { title: '保留两种时间视角', before: '任务内多次运行的时间线，与单次运行的日志时间瀑布承担不同的排查任务。', after: '详情继续保留多次运行时间线；打开具体运行后才进入日志瀑布、输入输出或执行过程。' },
    ],
    evidence: [
      evidence('evidence-detail-default', '审阅任务 · 默认状态', 'CXTE-9 的两次运行与审阅入口。'),
      evidence('evidence-detail-timeline', '多次运行时间线', 'CXTE-4 的 9 次运行；已操作筛选、排序、缩放和适配。'),
      evidence('evidence-detail-restored', '关闭详情后的恢复', '关闭展开面板后，原有时间线视图仍能恢复。'),
    ],
  },
  {
    id: 'graph', title: '调用流图', category: '工作流', icon: 'graph', short: '调用流图',
    intro: '保留完整调用关系，把侧栏占用还给图的阅读空间。',
    before: './assets/before-graph.png', after: './assets/after-graph.png',
    scenario: 'CXTE-4 · 9 个节点 · 5 条已确认关系',
    afterNote: '节点、重跑与委派关系沿用快照；未确认的关系不补线。',
    changes: [
      { title: '只保留一个上下文详情栏', before: '关系详情与运行详情可同时占据约 340px 和 535px，图画布一度只剩约 211px。', after: '关系和节点共用一个上下文侧栏，切换内容并保留返回路径；让调用链持续可见。' },
      { title: '让关系类型可以直接读', before: '展开详情后画布拥挤，重跑链与委派关系需要频繁缩放和来回查证。', after: '将重跑、委派和独立节点分清，保留方向和文字标记；筛选、聚焦、缩放、适配继续提供。' },
      { title: '角色与运行状态分别编码', before: '部分角色使用相似头像，角色辨认与运行状态混在一起。', after: '分析师、项目经理各有专属头像；失败、完成使用独立状态标签，不让头像承担状态含义。' },
    ],
    evidence: [
      evidence('evidence-graph-default', '调用流图 · 完整画布', '9 个节点均已逐一打开核对。'),
      evidence('evidence-graph-edge', '关系详情 · 实际展开', '5 条服务端确认关系均已打开，并检查跳转目标。'),
      evidence('evidence-graph-crowded', '关系 + 运行 · 同时展开', '画布被压缩到约 211px，是这页最需要处理的空间冲突。'),
    ],
  },
  {
    id: 'waterfall', title: '时间瀑布', category: '工作流', icon: 'waterfall', short: '时间瀑布',
    intro: '点击片段就地展开：先读解析摘要，长内容再进入完整阅读。',
    before: './assets/before-waterfall.png', after: './assets/after-waterfall-shell-v4.png',
    afterSource: '新版交互实拍',
    scenario: '#d1701910 · 1,088 条日志 · 343 个片段',
    afterNote: '新版实拍：统一左侧菜单、运行切换与行内展开；shell #244–245 的解析概览保留两条依赖警告。',
    changes: [
      { title: '时间轴使用主区全宽', before: '分栏时瀑布画布约 467px 宽，顶部信息又将首条轨道推到视窗下缘。原型已有展开功能。', after: '新版独立阅读页使用主区全宽；压缩运行摘要和筛选区，把时间轴、当前片段和关键警告放在连续视线内。' },
      { title: '在片段下方展开，内容按工具解析', before: '片段详情内的输入、输出各约 150px；上一版底部详情在长内容场景仍占空间。', after: '点击该行展开、再次点击收起，默认只展开一条。先读解析概览，切换输入、输出与原始记录；长内容用完整阅读查找，保留警告和截断状态。' },
      { title: '窄屏也能在原位阅读', before: '移动端 313px 容器内有 420px 时间表，可横向滚动，但名称与时间难以同时比较。', after: '新版按屏宽压缩名称、刻度与跨度列，详情在该行下方使用整行宽度。长文档进入完整阅读；保留搜索、筛选、分页、缩放和平移。' },
    ],
    evidence: [
      evidence('evidence-waterfall-split', '分栏模式 · 真实宽度', '可见图表与顶部信息在窄侧栏中竞争空间。'),
      evidence('evidence-waterfall-expanded', '展开模式 · 实际操作', '现有展开、缩放、拖移、适配均已操作。'),
      evidence('evidence-waterfall-mobile', '窄屏 · 横向滚动', '横向滚动可用；问题在发现成本和同时阅读能力。'),
    ],
  },
  {
    id: 'process', title: '执行过程', category: '工作流', icon: 'terminal', short: '执行过程',
    intro: '沿对话时间线读思考、调用与回复，展开后直接阅读整理过的输入输出。',
    before: './assets/before-process.png', after: './assets/after-process-shell-v4.png',
    afterSource: '新版交互实拍',
    scenario: '#d1701910 · 完整快照 · 190 条过程记录',
    afterNote: '新版实拍：统一左侧菜单及运行切换；#96–97 返回的 3 份文档按章节整理，默认显示 141 条过程记录。',
    changes: [
      { title: '恢复顺着对话阅读的节奏', before: '独立工具卡片过于相似，思考、调用和回复的关系需要来回追查。', after: '时间脊线串联轻量思考记录、成对工具调用与智能体回复；右侧时间脉络可直接跳转。' },
      { title: '先读解析结果，再核对原文', before: '长命令、Markdown 标记和 JSON 字段直接堆在输入输出中，读者需要自己整理。', after: '文档按文件和章节分组，JSON 按层级展示，警告、文件差异分别解析；完整阅读支持查找、复制与原始记录下载。' },
      { title: '允许对照，同时说明数据范围', before: '最近 1,000 条消息窗口与过程条目是不同口径；多次打开长内容容易丢失位置。', after: '本地加载完整 1,088 条原始日志，合并为 190 条过程记录；默认隐藏 49 条空白输出，支持多条展开，保留截断提示与来源。' },
    ],
    evidence: [
      evidence('evidence-process-default', '执行过程 · 初始状态', '检查进入过程页后的默认位置与工具记录。'),
      evidence('evidence-process-laptop', '笔记本 · 分栏展开', '实际检查 shell 搜索、输入输出展开、开头与最新定位。'),
    ],
  },
  {
    id: 'alerts', title: '异常提醒', category: '监控', icon: 'bell', short: '异常提醒',
    intro: '当前需要处理什么，与历史发生过什么，分别给出答案。',
    before: './assets/before-alerts.png', after: './assets/after-alerts.png',
    scenario: '当前提醒 0 · 历史失败 8 次 · 2 个任务',
    afterNote: '历史按 3 个原始原因分组，保留错误码与关联任务。',
    changes: [
      { title: '当前提醒与历史失败分开', before: '“当前无异常”与历史失败记录在同屏出现，缺少清晰的时间范围分隔。', after: '明确区分“待处理 0”和“历史失败 8”；空状态说明仍可追查历史。' },
      { title: '先读原因，再查看原始证据', before: '任务、重复失败、原始报错一起出现，读者需先自行归类。', after: '按任务与原因分为 3 组，展示次数和最近发生时间；展开后查看原始错误及关联任务。' },
      { title: '规则退到次一级', before: '监控规则与失败记录具有相近视觉分量，分散排查注意力。', after: '6 条规则和历史范围折叠收纳；不将当前无提醒推断为旧问题已经修复。' },
    ], evidence: [],
  },
  {
    id: 'performance', title: '执行性能', category: '监控', icon: 'chart', short: '执行性能',
    intro: '有数据就说明口径，没采集到就明确留空，不制造运行正常的假象。',
    before: './assets/before-performance.png', after: './assets/after-performance.png',
    scenario: '3 次运行有用量记录 · 终态统计样本 0',
    afterNote: '保留输入、输出与缓存 Token；成本未上报，机器资源未接入。',
    changes: [
      { title: '空样本是一种明确状态', before: '耗时与失败率没有本次采集的终态样本，多个空值需要读者自行理解。', after: '用一条“暂无终态样本”说明统计边界：采集启动前的历史运行不计入本次耗时与失败率。' },
      { title: '用量与成本不混为一谈', before: '已有 Token 用量，但缺失成本和缺失机器指标容易被当作零。', after: '并列展示输入 / 输出、缓存、已上报成本；成本明确为“未上报”，不按 0 估算。' },
      { title: '不把未知数据画成趋势', before: 'CPU、内存没有接口数据，不能据此评价机器健康。', after: '机器资源说明采集未接入，保留真正可用的数值；11 个智能体的并发信息按需展开。' },
    ], evidence: [],
  },
  {
    id: 'runtime', title: '运行时', category: '监控', icon: 'server', short: '运行时',
    intro: '统一比较连接状态，并始终标明这是采集时刻的快照。',
    before: './assets/before-runtime.png', after: './assets/after-runtime.png',
    scenario: '4 个节点 · 快照时可接收任务 4 · 执行中 0',
    afterNote: 'Antigravity、Claude、Codex、Opencode 的最后在线时间均保留。',
    changes: [
      { title: '同类信息按列比较', before: '节点名称、提供方、机器名、在线信息需要逐个浏览，横向比较成本较高。', after: '四个运行时统一成紧凑表格，名称与机器名归组；提供方、状态和时间各自对齐。' },
      { title: '在线状态绑定时间', before: '快照中的绿色在线标签容易被读成此刻仍然在线。', after: '直接写明“快照时状态”，保留最后在线 11-05 08:33:04，区分当前时间与采集时间。' },
      { title: '连接与健康各有边界', before: '可接收任务说明连接可用，不能证明 CPU、内存或执行质量正常。', after: '将可见节点、可接收任务、执行中和离线并列；连接状态不代替机器资源健康判断。' },
    ], evidence: [],
  },
];

for (const page of pages) {
  if (['tasks','detail','graph','alerts','performance','runtime'].includes(page.id)) {
    page.designReference=page.after;
    page.after=page.id==='detail'?'./assets/after-detail-compact-v2.png':'./assets/after-'+page.id+'-live.png';
    page.afterSource='新版交互页面实拍';
    page.afterNote='已在本设计对比站实现，可从上方入口进入实际页面；数据来自 11 月 5 日真实快照。';
  }
}

for (const page of pages) {
 if (['detail','graph','waterfall','process'].includes(page.id)) {
  page.after='./assets/after-'+page.id+'-context-v3.png';
  page.afterSource='新版交互页面实拍';
  page.afterNote+=' 当前业务任务、业务状态、任务切换和原任务入口已贯穿各运行视图。';
 }
}

for (const page of pages) { page.after='./assets/after-'+page.id+'-navigation-v4.png'; page.afterSource='新版交互页面实拍'; }

export const coverage = [
  { title: '真实数据', detail: '使用 11 月 5 日 08:33 的本地快照：10 个任务、22 次运行、6,960 条日志；demo=false。', tag: '已核对' },
  { title: '调用流图', detail: 'CXTE-4 的 9 个运行节点、5 条已确认关系逐一打开；检查聚焦、筛选、缩放、适配、关系到节点跳转及多栏共存。', tag: '已操作' },
  { title: '多次运行时间线', detail: '检查任务内运行筛选、顺序、缩放、适配，以及展开 / 关闭详情后的视图恢复。', tag: '已操作' },
  { title: '单次运行时间瀑布', detail: '#d1701910：1,088 条日志、343 个片段；检查缩放、拖移、适配、搜索、工具筛选、按序查看、分页、片段输入输出与时间轴定位。', tag: '已操作' },
  { title: '执行过程', detail: '对话流读取完整快照：190 条过程记录，默认显示 141 条。检查多条展开、文档目录、JSON、差异与长输入阅读、搜索、时间跳转及原文下载。', tag: '已操作' },
  { title: '不同屏幕', detail: '实测 1440 × 1000 桌面、1366 × 768 笔记本与 390 × 844 窄屏；保留真实展开状态截图。', tag: '已查看' },
];
