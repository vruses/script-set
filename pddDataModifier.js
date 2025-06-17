// ==UserScript==
// @name        拼多多后台信息修改
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://mms.pinduoduo.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 拼多多后台信息修改
// ==/UserScript==

(() => {
  // 店铺logo
  const mall_logo = "";
  // 每月份的成交量，每组可写入31组数据，数字对应月份
  const monthList = {
    1: [10000, 20000, 30000, 40000, 100000, 10000, 20000, 30000, 40000],
    2: [10000, 20000, 30000, 40000, 200000, 10000, 20000, 30000, 40000],
    3: [10000, 20000, 30000, 40000, 300000, 10000, 20000, 30000, 40000],
    4: [10000, 20000, 30000, 40000, 400000, 10000, 20000, 30000, 40000],
    5: [10000, 20000, 30000, 40000, 500000, 10000, 20000, 30000, 40000],
    6: [10000, 20000, 30000, 40000, 600000, 10000, 20000, 30000, 40000],
    7: [10000, 20000, 30000, 40000, 700000, 10000, 20000, 30000, 40000],
    8: [10000, 20000, 30000, 40000, 800000, 10000, 20000, 30000, 40000],
    9: [10000, 20000, 30000, 40000, 900000, 10000, 20000, 30000, 40000],
    10: [10000, 20000, 30000, 40000, 1000000, 10000, 20000, 30000, 40000],
    11: [10000, 20000, 30000, 40000, 1100000, 10000, 20000, 30000, 40000],
    12: [10000, 20000, 30000, 40000, 1200000, 10000, 20000, 30000, 40000],
  };
  console.table = () => {};
  console.clear = () => {};
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
  // 交易信息对应的月份
  let transactionMonth = 0;
  // 每月的交易信息列表
  const transactionInfoList = storage.get("transactionInfoList", {});
  // 由于ssr直接返回了img，需要单独更改店铺logo
  window.addEventListener("load", () => {
    document.querySelector(".avatar img").src = mall_logo;
  });

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
      // 交易数据信息
      if (url.includes("/sydney/api/mallTrade/getMallTradeInfo")) {
        console.log(url);
        // 克隆响应流
        const clonedResponse = response.clone();
        // 读取 JSON 数据
        const data = await clonedResponse.json();
        // 每次获取数据时调用更新一次统计事件
        handleDateRender(
          '#mf-mms-sycm-container [class*="MmsUiBlockTitle"] + div span'
        );
        // 修改数据后返回一个新的 Response
        let modifiedData = data;
        // 如果没有修改过，将返还原来的月份数据

        // 如果不是月份信息，而是天，周等
        if (JSON.parse(init.body)?.queryType !== 4) {
          // 如果信息修改过，则共用0月份数据
          if (transactionInfoList[0]) {
            modifiedData.result = {
              ...modifiedData.result,
              ...transactionInfoList[0],
            };
          }
        }
        // 如果查看的是月交易量数据
        if (JSON.parse(init.body)?.queryType === 4) {
          const date = JSON.parse(init.body)?.queryDate;
          const month = new Date(date).getMonth() + 1;
          transactionMonth = month;
          // 如果有对应月份的编辑信息
          if (transactionInfoList[transactionMonth]) {
            modifiedData.result = {
              ...modifiedData.result,
              ...transactionInfoList[transactionMonth],
            };
          }
          // 每次请求时都需要处理一次
          // 交易数据信息编辑
          handleInfoEdit(
            awaitElementLoad,
            '#mf-mms-sycm-container [class*="card_cardWrapper"] [class*="card_cardItem"]',
            '[class*="card_cardWrapper"]',
            "transactionInfoList",
            queryTransInfo
          );
        }
        // 返回未读的响应体
        return new Response(JSON.stringify(modifiedData), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      // 交易数据列表
      if (url.includes("/sydney/api/mallTrade/queryMallTradeList")) {
        // 如果查看的是月交易量数据
        if (JSON.parse(init.body)?.queryType === 4) {
          const date = JSON.parse(init.body)?.queryDate;
          const month = new Date(date).getMonth() + 1;
          const dayList = monthList[month];
          // 克隆响应流
          const clonedResponse = response.clone();
          // 读取 JSON 数据
          const data = await clonedResponse.json();
          // 修改数据后返回一个新的 Response
          let modifiedData = data;
          // dayList
          dayList.forEach((value, index) => {
            try {
              if (index >= modifiedData.result.dayList.length) return;
              modifiedData.result.dayList[index].payOrdrAmt = value;
            } catch (error) {
              console.log(error);
            }
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

  // IKlv是获取ssr信息的函数
  const originalCall = Function.prototype.call;
  Function.prototype.call = function (...args) {
    if (this.name === "a4r6") {
      let funcStr = this.toString();
      // console.log(funcStr.indexOf("QmmNP"));
      // 拦截打印大数组的函数
      return;
    }
    if (this.name === "IKlv") {
      let funcStr = this.toString();
      funcStr.indexOf("__NEXT_DATA__");
      const shopInfo = storage.get("shopInfo");
      // 替换用户名，昵称，店铺名
      if (shopInfo) {
        const mall_name = shopInfo.mall_name;
        const username = shopInfo.username;
        const nickname = shopInfo.nickname;
        funcStr = funcStr.replace(
          `JSON.parse(document.getElementById("__NEXT_DATA__").textContent);`,
          (res) =>
            res +
            `k.props.headerProps.serverData.userInfo.username="${username}";
          k.props.headerProps.serverData.userInfo.nickname="${nickname}";
          k.props.headerProps.serverData.userInfo.mall.mall_name="${mall_name}";
          k.props.headerProps.serverData.userInfo.mall.logo="${mall_logo}";
          `
        );
      }
      funcStr = eval("(" + funcStr + ")");
      return originalCall.apply(funcStr, args);
    }
    return originalCall.apply(this, args);
  };

  // 等待元素加载
  async function awaitElementLoad(selector, timeout = 5000, interval = 100) {
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
  // 查询统计时间
  function queryDateInfo(target) {
    const descriptor = Object.getOwnPropertyDescriptor(
      Node.prototype,
      "firstChild"
    );
    // 修改前还原descriptor
    Object.defineProperty(target, "firstChild", descriptor);
    const privateValue = target.firstChild.nodeValue;
    // 修改后继续拦截修改前还原descriptor
    Object.defineProperty(target, "firstChild", {
      get() {
        return document.createTextNode("Aloha");
      },
      configurable: true,
    });
    return {
      // 只有自己才能修改‘textContent‘（实际触发输入事件被修改的应该是textNode.nodeValue
      // 另一部分hack过程见handleDateRender
      date: privateValue,
    };
  }
  // 单独处理统计时间的渲染
  async function handleDateRender(selector) {
    await awaitElementLoad(selector, 10e5, 100);
    if (storage.get("statisticTime")) {
      document.querySelector(selector).firstChild.nodeValue =
        storage.get("statisticTime").date;

      // 劫持react更新文字节点的两种方式
      // 劫持firstChild防止react获取textnode，更新nodValue
      Object.defineProperty(document.querySelector(selector), "firstChild", {
        get() {
          return document.createTextNode("Aloha");
        },
        configurable: true,
      });
      // 劫持textContent防止react设置span.textContent
      Object.defineProperty(document.querySelector(selector), "textContent", {
        set(value) {
          console.log(value);
        },
        configurable: true,
      });
    }
  }
  // 查询交易信息
  function queryTransInfo(target) {
    // 展示数据的文字被用某种字体加密的
    // 找到spider_font类就好了
    const textList = target.querySelectorAll("span.__spider_font");
    // 需要控制month,防止乱改信息
    transactionInfoList[transactionMonth] = {
      // 成交金额
      payOrdrAmt: textList[0]?.textContent || "占位符",
      // 成交金额百分比
      payOrdrAmtPct: textList[1]?.textContent || "占位符",
      //成交订单数
      payOrdrCnt: textList[2]?.textContent || "占位符",
      // 成交订单数百分比
      payOrdrCntPct: textList[3]?.textContent || "占位符",
      // 成交买家数
      payOrdrUsrCnt: textList[4]?.textContent || "占位符",
      // 成交买家数百分比
      payOrdrUsrCntPct: textList[5]?.textContent || "占位符",
      // 成交转换率
      payUvRto: textList[6]?.textContent
        ? textList[6]?.textContent + "%"
        : "占位符%",
      // 成交转化率百分比
      payUvRtoPct: textList[7]?.textContent || "占位符",
      // 客单价
      payOrdrAup: textList[8]?.textContent || "占位符",
      // 客单价百分比
      payOrdrAupPct: textList[9]?.textContent || "占位符",
      // 成交老买家占比
      rpayUsrRtoDth: textList[10]?.textContent
        ? textList[10]?.textContent + "%"
        : "占位符%",
      // 成交老买家占比百分比
      rpayUsrRtoDthPct: textList[11]?.textContent || "占位符",
      // 店铺关注数
      mallFavCnt: textList[12]?.textContent || "占位符",
      // 店铺关注数百分比
      mallFavCntPct: textList[13]?.textContent || "占位符",
      // 退款金额
      sucRfOrdrAmt1d: textList[14]?.textContent || "占位符",
      // 退款金额百分比
      sucRfOrdrAmt1dPct: textList[15]?.textContent || "占位符",
      // 退款单数
      sucRfOrdrCnt1d: textList[16]?.textContent || "占位符",
      // 退款单数百分比
      sucRfOrdrCnt1dPct: textList[17]?.textContent || "占位符",
      // 平均访客价值
      uvCfmVal: textList[18]?.textContent || "占位符",
      // 平均访客价值百分比
      uvCfmValPct: textList[19]?.textContent || "占位符",
    };
    return transactionInfoList;
  }
  // 查询店铺信息
  function queryShopInfo(target) {
    const ele = target.querySelectorAll("span");
    const mall_name = ele[0].textContent;
    let inside = "";
    let before = "";
    let userStr = "";
    try {
      userStr = ele[1].textContent;
      // 提取括号里的内容
      inside = userStr.substring(
        userStr.indexOf("(") + 1,
        userStr.indexOf(")")
      );
      // 提取括号前面的内容
      before = userStr.substring(0, userStr.indexOf("("));
    } catch (error) {
      before = "请按照";
      inside = "格式";
    }
    console.log(before, inside);
    return {
      mall_name,
      nickname: inside,
      username: before,
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
    // 店铺信息编辑
    handleInfoEdit(
      awaitElementLoad,
      ".user-name",
      ".user-name",
      "shopInfo",
      queryShopInfo
    );
    // 统计时间单独处理
    // 等待dom元素挂载，修改文字，同时劫持span的属性防止react再次修改文字
    handleInfoEdit(
      awaitElementLoad,
      '#mf-mms-sycm-container [class*="MmsUiBlockTitle"] + div span',
      '#mf-mms-sycm-container [class*="MmsUiBlockTitle"] + div span',
      "statisticTime",
      queryDateInfo
    );
    // 还需要每次请求时候调用一次，为了在组件卸载再挂载时生效
    handleDateRender(
      '#mf-mms-sycm-container [class*="MmsUiBlockTitle"] + div span'
    );
    // 交易数据信息编辑
    handleInfoEdit(
      awaitElementLoad,
      '#mf-mms-sycm-container [class*="card_cardWrapper"] [class*="card_cardItem"]',
      '[class*="card_cardWrapper"]',
      "transactionInfoList",
      queryTransInfo
    );
  }

  main();
})();
