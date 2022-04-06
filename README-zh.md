# Bypass Captcha

简体中文 | [English](./README.md)

## 介绍

使用 Nodejs + Playwright + 2Captcha 自动登陆B站

完整分析 [Nodejs Playwright 验证码识别实现自动登陆](https://lwebapp.com/zh/post/bypass-captcha)

## 使用

1. 拉取项目，安装依赖
```sh
git clone https://github.com/openhacking/bypass-captcha
cd bypass-captcha
npm i
```

2. 修改`.env`文件中的登陆信息和 `API Key`

3. 启动
```sh
node captcha.js
```

## 参考

- [Playwright](https://playwright.dev/)
- [2Captcha](https://2captcha.com?from=13803059)
