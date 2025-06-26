// ==UserScript==
// @name        拼多多店铺信息修改
// @namespace   vurses
// @license     Mit
// @author      layen
// @match       https://mms.pinduoduo.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 拼多多店铺信息修改
// ==/UserScript==

(() => {
  // 店铺logo
  const mallLogo = "";
  // 营业执照
  const businessLicenseImgUrl = "";
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
  function main() {
    // main可省略，在fetch里完成
    // 处理店铺基本信息编辑
    handleInfoEdit(
      awaitElementLoad,
      "[class*='content_basicWrapper'] [class*='ItemWrap_item'] div",
      "[class*='content_basicWrapper']",
      "mallBasicInfo",
      queryMallBasicInfo
    );
    // 处理店铺主体信息编辑
    handleInfoEdit(awaitElementLoad, "", "", queryMallSubjectInfo);
  }
  main();
  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    let url = "";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
    }

    // 调用原始 fetch
    return originalFetch.call(this, input, init).then(async (response) => {
      // 店铺基本信息请求
      if (url.includes("/earth/api/mallInfo/queryFinalCredentialNew")) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        let modifiedData = data;

        // 替换修改后的店铺基本信息
        modifiedData = replaceMallBasicInfo(modifiedData);

        return new Response(JSON.stringify(modifiedData), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      return response;
    });
  };

  const originalCall = Function.prototype.call;
  Function.prototype.call = function (...args) {
    if (this.name === "a4r6") {
      // 拦截打印大数组的函数
      return;
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
      // 本地存储数据
      storage.set(storageKey, data);
    });
  }

  // 查询店铺基本信息
  function queryMallBasicInfo(target) {
    const infoEleList = target.querySelectorAll(
      "[class*='ItemWrap_item'] > div"
    );
    // 简单递归一下第一个子节点的文本
    function getNodeValue(target) {
      if (target.firstChild === null) return "";
      if (target.firstChild.nodeValue) return target.firstChild.nodeValue;
      return getNodeValue(target.firstChild);
    }
    const infoList = Array.from(infoEleList).map((element) => {
      return getNodeValue(element);
    });

    return {
      mallInfo: {
        id: infoList[0],
        mallName: infoList[1],
        mallDesc: infoList[8],
        logo: mallLogo,
        yunyingUserName: infoList[5],
        staple: [infoList[4]],
      },
      queryDetailResult: {
        firstPassTime: new Date(infoList[2]).getTime(),
      },
    };
  }

  // 查询店铺主题信息
  function queryMallSubjectInfo() {}

  // 替换fetch的店铺基本信息response
  function replaceMallBasicInfo(data) {
    const mallBasicInfo = storage.get("mallBasicInfo");
    if (!mallBasicInfo) return data;
    data.result.mallInfo = {
      ...data.result.mallInfo,
      ...mallBasicInfo.mallInfo,
    };
    data.result.queryDetailResult = {
      ...data.result.queryDetailResult,
      ...mallBasicInfo.queryDetailResult,
    };
    return data;
  }
})();
