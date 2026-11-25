# Case Study 1 原站存档

本目录保存 2026 年 10 月 12 日长健农业第 11 组提交版的前端、Flask 后端、依赖清单、测试代码和页面使用的图片。它们从原提交文件 `BA4043_Website_Source.zip` 的 `changjian-lychee-online/` 提取，保留原始源码与素材的字节。原压缩包的 SHA-256 为 `d984edcf90e01e2aa9cac65b73f6faf2f44f2a71e15c2663ef5671b056f42d6d`。

直接打开[原版首页](index.html)可查看六章页面。原站公开地址存为[长健农业原网站](https://changjian.86.53.181.46.sslip.io/)。原提交包已有[首页桌面截图](docs/screenshots-online/01-home-desktop.png)、[礼盒页桌面截图](docs/screenshots-online/03-gift-desktop.png)和[礼盒页手机截图](docs/screenshots-online/12-gift-mobile.png)。

离线页面处于演示模式。需在本机测试原版的咨询保存功能时，进入本目录，在独立 Python 环境中安装 `requirements-lock.txt` 依赖，运行 `python app.py --setup` 设置自己的本地管理密码，再运行 `python app.py`，使用终端显示的本机地址。数据库与密钥由程序在本机首次配置时生成。本存档仅含公开网页所需内容及程序代码。
