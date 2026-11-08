# 价格数据来源与豆包接入核查（2026-11-08）

## 豆包与官方可接入能力
豆包购物 FAQ 说明合作方为抖音电商与抖音生活服务，基于合作平台搜索展示卡片；不能据此认定全量价格开放或普通模型 API 具备相同权限。
https://lf9-cdn-tos.draftstatic.com/obj/ies-hotsoon-draft/grace_legal/Shopping-Payment-FAQ.html

火山引擎联网问答 Agent Pro 的能力表明确列出电商数据，说明为抖音电商提供的 ToB 合规电商内容。值得试用，但不是全量成交数据库。
- 能力：https://docs.volcengine.com/docs/NetworkedQAAgent/ProductOverview?lang=zh
- 接入：https://docs.volcengine.com/docs/networked-qa-agent/quick-start?lang=en
- API：https://docs.volcengine.com/docs/networked-qa-agent/intelligent-experience-api?lang=en
- 计费：https://docs.volcengine.com/docs/networked-qa-agent/product-billing?lang=zh
- 控制台：https://console.volcengine.com/ask-echo

API Key 方式地址为 https://open.feedcoopapi.com/agent_api/agent/chat/completion ，返回回复、参考资料和卡片。不能假定现有 Web 搜索 Key 可以直接调用。尚未验证当前账号试用、资源权限、中国线下餐饮或酒店覆盖、能否返回多条结构化价格、存储和二次统计的使用条件。没有实际调用或开通付费服务。

## 开源项目怎么拿数据
- https://github.com/guocaoyi/meituan-spider ：作者介绍按区域找 POI，再通过浏览器抓取 H5 店铺和商品价格。是爬虫练习项目，不是授权数据服务；本次未运行，不保证目前仍可用。可参考地域筛选与字段提取，不能直接当稳定后台。
- https://github.com/shopsavvy/shopsavvy-mcp-server ：开源的是通往 ShopSavvy 托管 MCP 的桥，数据来自其服务。匿名使用有限流，更高额度用 Key。可借鉴价格来源和检查时间展示，未验证中国同城餐饮覆盖。
- https://github.com/buywhere/buywhere ：文档围绕自己的商品目录 API，需要 Key，介绍主要覆盖美国和东南亚。可以参考商品结构与搜索接口，不应当成中国线下菜单数据源。

扣子可编排外部 API；这轮没有核实到带可靠同城价格库、可以直接复用的完整公开扣子项目。换编排平台不等于获得数据。

## 当前评分边界
微信云端计算近90天、精确同名同地点、同实付/报价类型、同场景的公开用户报价；补价仅来自公开原帖；每位其他用户取最近一条，排除原帖作者，留言不计入；至少5位才评分。
百分位=(更低价数量+0.5×同价数量)/有效样本数×100。展示称号、中位价、样本数和明细。普通商品规格尚未完全核实，所以只能表述为当前同城同名用户报价中的位置，不能称全市场价格分布。酒店等条件缺失不评分。每类最多读取100条，返回截断标记。

## 接下来验证什么
先检查 Pro 试用和电商资源资格，不购买套餐。以同城蛋炒饭单份、拿铁中杯和指定日期房型的酒店为测试集，逐条核对多个报价、原始链接、城市、规格和发生时间。记录有效样本数与费用。只有一句“正常价”或最低价，不能计算分位。
