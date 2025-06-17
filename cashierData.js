// ==UserScript==
// @name        拼多多对账修改
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://cashier.pinduoduo.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 拼多多对账修改
// ==/UserScript==

(() => {
  const logo = "";
  // 封装本地存储
  const storage = {
    set(key, value) {
      try {
        const data = JSON.stringify(value);
        localStorage.setItem(key, data);
      } catch (e) {
        console.error("Storage Set Error:", e);
      }
    },

    get(key, defaultValue = null) {
      try {
        const data = localStorage.getItem(key);
        return data !== null ? JSON.parse(data) : defaultValue;
      } catch (e) {
        console.error("Storage Get Error:", e);
        return defaultValue;
      }
    },
  };
  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    let url = "";
    // 处理 input 可能是字符串或 Request 对象
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
    }
    // 调用原始 fetch
    return originalFetch.call(this, input, init).then(async (response) => {
      if (url.includes("templar/api/finance/account/queryAccountLoginInfo")) {
        // 克隆响应流
        const clonedResponse = response.clone();
        // 读取 JSON 数据
        const data = await clonedResponse.json();
        console.log(data);
        // 修改数据后返回一个新的 Response
        let modifiedData = data;
        if (storage.get("shopInfo")) {
          let extra = JSON.parse(modifiedData.result.extra);
          extra.logo = logo;
          extra.mallAndUserInfo.mallName = storage.get("shopInfo").mallName;
          modifiedData.result.extra = JSON.stringify(extra);
        }
        // 返回未读的响应体
        return new Response(JSON.stringify(modifiedData), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      if (url.includes("templar/api/bill/queryMallBalanceMonthlySummary")) {
        // 克隆响应流
        const clonedResponse = response.clone();
        // 读取 JSON 数据
        const data = await clonedResponse.json();
        // 修改数据后返回一个新的 Response
        let modifiedData = data;
        if (storage.get("monthBill")) {
          storage.get("monthBill").forEach((value, index) => {
            console.log(modifiedData.result.summaryList);
            if (index >= modifiedData.result.summaryList.length) return;
            modifiedData.result.summaryList[index] = {
              ...modifiedData.result.summaryList[index],
              ...value,
            };
          });
          // 返回未读的响应体
          return new Response(JSON.stringify(modifiedData), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }
      return response;
    });
  };
  // 等待元素加载
  async function awaitElementLoad(selector, timeout = 5000, interval = 100) {
    console.log(document.querySelector(selector));
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        try {
          const element = document.querySelector(selector);
          if (element !== undefined && element !== null) {
            clearInterval(timer);
            resolve(element);
          } else if (Date.now() - start >= timeout) {
            clearInterval(timer);
            reject(new Error(`元素 "${selector}" 加载超时 (${timeout}ms)`));
          }
        } catch (err) {
          // 如果报错也继续轮询，直到超时
          if (Date.now() - start >= timeout) {
            clearInterval(timer);
            reject(
              new Error(
                `元素 "${selector}" 加载出错并超时 (${timeout}ms): ${err.message}`
              )
            );
          }
        }
      };

      const timer = setInterval(check, interval);
    });
  }
  // 处理月汇总表里的数字
function processValue(value) {
  const str = String(value);

  // 如果包含 dash 且不是开头的负号，视为日期
  if (str.includes("-") && !str.startsWith("-")) {
    return str;
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;

  // 判断是否是小数
  if (str.includes('.') && !Number.isInteger(num)) {
    return Math.round(num * 100); // 乘以100并四舍五入
  }

  return num; // 原样返回整数
}

  
  // 查询月汇总信息
  function queryMonthBillInfo(target) {
    const keys = [
      "time",
      "incomeAmount",
      "incomeNumber",
      "outcomeAmount",
      "outcomeNumber",
      "benefit",
      "beforeAmount",
      "afterAmount",
    ];

    return Array.from(target.querySelectorAll("tr")).map((el) =>
      Object.fromEntries(
        Array.from(el.children)
          .slice(0, keys.length)
          .map((child, i) => [keys[i], processValue(child.textContent)])
      )
    );
  }
  // 查询店铺信息
  function queryShopInfo(target) {
    return {
      mallName: target.textContent,
    };
  }
  // 处理信息编辑
  async function handleInfoEdit(
    waitFunc,
    waitSelector,
    selector,
    storageKey,
    queryFunc
  ) {
    // 等待前置元素加载
    await waitFunc(waitSelector, 10e5, 1000);
    // 获取元素信息
    const ele = document.querySelector(selector);
    ele.contentEditable = "true";
    ele.addEventListener("input", function () {
      // 获取数据
      const data = queryFunc(this);
      console.log(data);
      // 本地存储数据
      storage.set(storageKey, data);
    });
  }
  function main() {
    // 处理店铺信息编辑
    handleInfoEdit(
      awaitElementLoad,
      'span[class*="Header_header_name"]',
      'span[class*="Header_header_name"]',
      "shopInfo",
      queryShopInfo
    );
    // 处理月汇总信息编辑
    handleInfoEdit(
      awaitElementLoad,
      ".tab2 [data-testid=beast-core-table] tbody tr td",
      ".tab2 [data-testid=beast-core-table] tbody",
      "monthBill",
      queryMonthBillInfo
    );
  }
  main();
})();
