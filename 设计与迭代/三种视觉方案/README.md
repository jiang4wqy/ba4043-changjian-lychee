# 长健农业：视觉与转场选样

这是一份供选方向的独立样稿，包含 A / B / C 三种风格，每种有“荔香”和“荔礼”两幕。正式六幕 MVP 另存于 `ba4043-marketing-website`，本次没有改动其运行文件。

双击 `index.html` 即可打开，也可在此目录运行 `python -m http.server 4174`，再打开 `http://127.0.0.1:4174/`。保留 CSS、JavaScript 和 `assets` 文件夹的相对位置。样稿无安装依赖、无网络字体、无外部图片；参考链接需要联网。

- **A 荔影新国风**：浅青、枝叶线描、错位宋体、朱红小印。圆形实拍窗口展开到下一幕。适合保留清雅国风和礼赠气质。
- **B 山野沉浸影像**：深松绿、全幅实拍、大字留白。整幅照片收拢进下一幕展示框，再带出文案。影像冲击更强，需要后续补充足够清晰的横幅照片。
- **C 青绿当代画册**：明亮青绿、超大黑体、分栏细线。标题中的实拍图片扩展，并横向展开下一幕。更年轻、醒目，传统气质较少。

顶部 A / B / C 切换样稿。点击画中链接、主要文字按钮或“荔香 / 荔礼”目录播放转场。浏览器后退、章节地址和键盘操作均可使用。操作系统开启“减少动态效果”时，直接展示目标一幕。

这里仅比较视觉与动效，不收集个人信息，也不表示真实销售已开放。品牌、品种及照片沿用项目现有草稿和素材；具体商品信息仍需确认。示例字样不是调研结果。选定后需要把样式应用到正式网站，并保留信息说明、礼盒咨询、输入校验及手机可用性。

## 参考与自制部分

参考的是下列案例的视觉思路。本样稿 HTML、CSS、JavaScript、枝叶 SVG 均为本项目自行编写；没有复制案例源代码、照片或商标，也没有引入 GSAP、Lenis、框架或模板。

1. Codrops, [Fullscreen Clip Animation](https://tympanus.net/codrops/2023/03/14/fullscreen-clip-animation/), 14 March 2023 — 形状裁切与图片、排版联动。用于构思 A 的圆窗展开。
2. Codrops, [Large Image to Content Page Transition](https://tympanus.net/codrops/2022/08/03/large-image-to-content-page-transition/), 3 August 2022 — 大图进入内容展示框。用于构思 B 的影像连续转场。
3. Codrops, [On-Scroll Expanding Image Animation within Typography](https://tympanus.net/codrops/2024/04/02/on-scroll-expanding-image-animation-within-typography/), 2 April 2024 — 图片与大标题组合。C 改成点击触发，与现有分幕浏览偏好相符。

实现使用原生 Web Animations API、CSS `clip-path`、图片覆盖层和 History API。字体调用设备的宋体、微软雅黑或对应系统字体；不同设备的字形可能略有差异。公开素材授权、真实手机检查、后端和上线都不属于这份选样的已完成事项。
