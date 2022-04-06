const { chromium } = require("playwright");
const request = require("request");

require("dotenv").config();

const NAME = process.env.NAME;
const PWD = process.env.PWD;
const API_KEY = process.env.API_KEY;
const METHOD = "geetest";
const PAGE_URL = "https://www.bilibili.com/";
let validate = "";

const RES_RETRY_ERROR = [
  "CAPCHA_NOT_READY",
  "ERROR_CAPTCHA_UNSOLVABLE",
  "ERROR_BAD_DUPLICATES",
];

(async () => {
  // 选择Chrome浏览器，设置headless: false 能看到浏览器界面，devtools: true 打开控制台
  const browser = await chromium.launch({
    headless: false,
    // devtools: true,
  });

  const page = await browser.newPage();

  // 提前监听请求，修改校验参数
  await page.route("https://api.geetest.com/ajax.php?**", async (route) => {
    // Fetch original response.
    const response = await page.request.fetch(route.request());

    let body = await response.text();

    console.log("修改验证码校验接口 ajax.php，使用 validate", validate);
    // 修改为校验成功
    let callback = body.split("(")[0];
    body =
      callback +
      "(" +
      JSON.stringify({
        status: "success",
        data: {
          result: "success",
          validate: validate,
          score: "99",
          msg: [],
        },
      }) +
      ")";
    route.fulfill({
      // Pass all fields from the response.
      response,
      // Override response body.
      body,
      headers: response.headers(),
    });
  });

  console.log("打开B站");
  
  // 打开B站
  await page.goto(PAGE_URL);

  console.log("点击顶部按钮，请求验证码接口");

  const [response] = await Promise.all([
    // 请求验证码接口
    page.waitForResponse(
      (response) =>
        response.url().includes("/x/passport-login/captcha") &&
        response.status() === 200
    ),
    // 点击顶部的登录按钮
    page.click(".header-login-entry"),
  ]);

  // 获取到接口返回信息
  const responseJson = await response.body();

  // 解析出 gt 和 challenge
  const json = JSON.parse(responseJson);
  const gt = json.data.geetest.gt;
  const challenge = json.data.geetest.challenge;

  console.log("得到 gt", gt, "challenge", challenge);

  // 请求 in.php 接口

  const inData = {
    key: API_KEY,
    method: METHOD,
    gt: gt,
    challenge: challenge,
    pageurl: PAGE_URL,
    json: 1,
  };

  console.log("in.php 请求");

  postInPHP(inData)
    .then((id) => {
      console.log("in.php 成功 id", id);

      console.log("等待20秒");
      sleep(20000);

      console.log("res.php 请求");
      getResPHP(id)
        .then((data) => {
          console.log("res.php 成功 ", data);

          // 存储校验结果
          validate = data && data.geetest_validate;

          login(page);
        })
        .catch((e) => {
          console.error("res.php 报错", e);
        });
    })
    .catch((e) => {
      console.error("in.php 返回", e);
    });
})();

function postInPHP(inData) {
  return new Promise((resolve, reject) => {
    request.post(
      "http://2captcha.com/in.php",
      { json: inData },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          // 如果显示 ERROR_ZERO_BALANCE，表明您的账户余额不足，需要充值，支持
          if (body.status == 1) {
            resolve(body.request);
          } else {
            reject(body);
          }
        } else {
          reject(error);
        }
      }
    );
  });
}

function getResPHP(ID) {
  return new Promise((resolve, reject) => {
    let count = 0;

    res();

    function res() {
      request.get(
        `http://2captcha.com/res.php?key=${API_KEY}&action=get&id=${ID}&json=1`,
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            const data = JSON.parse(body);

            // res.php支持重新发送请求的情况下，重新尝试，超过5次没有成功也退出
            if (
              data.status == 0 &&
              RES_RETRY_ERROR.includes(data.request) &&
              count < 5
            ) {
              count++;

              console.log("res.php 返回", data.request, "重新请求");
              sleep(5000);
              res();
            } else if (data.status == 1) {
              resolve(data.request);
            } else {
              reject(data);
            }
          } else {
            reject(error);
          }
        }
      );
    }
  });
}

async function login(page) {
  console.log("填入用户名、密码，开始登陆");
  // 在登录弹框内填入账号和密码，我们采用Nodejs的命令行设置process环境变量，来输入自己的账号密码，防止将账号密码写入代码中
  await page.locator(".bili-mini-account input").fill(NAME);

  sleep(1000);

  await page.locator(".bili-mini-password input").fill(PWD);

  console.log("点击弹框内的登录按钮");

  sleep(1000);

  // 点击弹框内的登录按钮
  const handle = await page.$(".login-btn");
  await handle.hover();
  await handle.click();
}

/**
 * 模拟sleep功能，延迟一定时间，单位毫秒
 * Delay for a number of milliseconds
 */
function sleep(delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}
