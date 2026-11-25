# 第 11 组研究与测试资料

研究的问题是，探访亲友的访客能否按预算选出礼盒，并判断预计配送能否赶上探访。2026 年 11 月 24 日，已有三站各 20 条公开评论、7 份小组互评及逐条主题编码。访客选盒任务的 10 个记录位仍为空。

| 要查什么 | 从哪里打开 |
|---|---|
| 60 条原文、原站链接、采集与复核时间 | [正式评论](BA4043-评论采集/正式评论.csv) · [采集与重建说明](BA4043-评论采集/README.md) |
| 哪份互评提了什么问题 | [七份互评对照表及原件](BA4043-评论采集/小组互评与网页改版.md) |
| 最常提的需求与改版依据 | [用户需求分析](BA4043-用户需求分析/2.1-用户需求与改版优先级.md) · [各平台主题计数](BA4043-用户需求分析/各平台主题计数.csv) |
| 改版前访客能看到什么 | [原站首页](改版前网站/index.html) · [原站存档说明](改版前网站/README.md) |
| 怎么测量改版成效 | [选盒任务与评分规则](BA4043-目标与衡量/2.2-目标与衡量.md) · [访客测试记录表](BA4043-目标与衡量/选盒测试记录.xlsx) |

从本目录运行下面三条命令，即可用留存数据重建试采表、正式表及跨平台统计。Python 3.12 的合并步骤仅使用标准库；生成图表还需 matplotlib。在线重新采集或从单站快照回放的方法见各平台说明。京东解析另用 requests 与 beautifulsoup4。三条命令会更新相应输出文件，想保留原样时请在副本中运行。

```powershell
py -3.12 -B ".\BA4043-评论采集\合并样本.py"
py -3.12 -B ".\BA4043-评论采集\合并样本.py" --full
py -3.12 -B ".\BA4043-用户需求分析\分析评论.py"
```

**读数口径。** 原始评论来自平台公开页面。七份互评针对本组网站，单独计数。一条公开评论可涉及多个主题，每个主题内只计一次。两款礼盒的箱价、净重和 2027 年 7 月班次用于课堂情境；访客的选择、用时、是否求助和最终成功率，须由组员依真实测试记录。2026 年 12 月 6 日内部测试截止前，已开始且未完成判断的个案按记录表保留。

**Submission evidence.** The three independent community sources, dated captures, cleaning code, and cleaned sample are under BA4043-评论采集. The coding table, counting script, and resulting figure are under BA4043-用户需求分析. The archived website supports the before-and-after comparison. The observation workbook contains the test protocol and empty participant records.
