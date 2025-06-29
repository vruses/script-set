// ==UserScript==
// @name        拼多多订单信息修改
// @namespace   vurses
// @license     Mit
// @author      layen
// @match       https://mms.pinduoduo.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 拼多多订单信息修改
// ==/UserScript==

(() => {
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
  const originalCall = Function.prototype.call;
  Function.prototype.call = function (...args) {
    if (this.name === "a4r6") {
      // 拦截打印大数组的函数
      return;
    }
    return originalCall.apply(this, args);
  };
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
      // 待发货和已发货的订单信息列表
      if (url.includes("/mangkhut/mms/recentOrderList")) {
        // 待发货的订单信息请求
        if (JSON.parse(init.body)?.orderType === 1) {
          // 处理待发货订单信息元素的编辑
          handleInfoEdit(
            awaitElementLoad,
            "[class*='TB_innerMiddle'] table tbody",
            "[class*='TB_innerMiddle']",
            "pendingOrders",
            queryPendingOrders
          );
          // 返回修改后的待发货订单信息响应体
          const newPendingOrdersResponse = replaceResponse(
            response,
            updatePendingOrders
          );
          return newPendingOrdersResponse;
        }
        // 已发货的订单信息请求
        if (JSON.parse(init.body)?.orderType === 0) {
        }
      }

      return response;
    });
  };
  // 修改响应
  async function replaceResponse(response, dataHandler) {
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    let modifiedData = data;
    // 修改信息
    modifiedData = dataHandler(modifiedData);
    return new Response(JSON.stringify(modifiedData), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

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

  // 单独处理goodsName文字显示被重置的问题
  function updateOrderElement(element, goods_name) {
    const reactInstanceKey = Object.keys(element).filter((key) =>
      key.startsWith("__reactInternalInstance")
    );
    const reactInstance = element[reactInstanceKey];
    reactInstance.pendingProps.children[2][0].props.recordCopy.goods_name =
      goods_name;
  }

  // 查询具体的订单信息
  function queryOrderInfo(target) {
    // target===tbody
    // 由于表结构比较复杂，直接递归元素获取所有文字节点
    function getTextNodes(element) {
      let textNodes = [];
      for (let node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== "") {
          textNodes.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          textNodes.push(...getTextNodes(node));
        }
      }
      return textNodes;
    }
    const textNodes = getTextNodes(target);
    const confirm_date = textNodes[4].nodeValue;
    const timestamp = Math.floor(new Date(confirm_date).getTime() / 1000);
    const address = textNodes[31].nodeValue.split(" ");
    const pageItem = {
      order_sn: textNodes[1].nodeValue,
      confirm_time: timestamp, //textNodes[4]
      goods_name: textNodes[17].nodeValue,
      goods_id: +textNodes[19].nodeValue,
      spec: textNodes[21].nodeValue,
      goods_number: +textNodes[24].nodeValue,
      goods_amount: +textNodes[25].nodeValue * 100,
      order_amount: +textNodes[26].nodeValue * 100,
      receive_name: textNodes[28].nodeValue,
      province_name: address[0],
      city_name: address[1],
      district_name: address[2],
      address_spec: address[3],
      nickname: textNodes[32].nodeValue,
      thumb_url:
        "https://img.pddpic.com/garner-api-new/5411da8f88be7d8f8ab61733716540a8.jpeg",
    };
    return pageItem;
  }

  // 查询待发货的订单
  function queryPendingOrders(target) {
    // target===TB_innerMiddle
    const pageItems = [];
    // 查询单个订单信息
    for (const orderEle of target.querySelectorAll("tbody")) {
      const pageItem = queryOrderInfo(orderEle);
      // 避免文字显示被重置，依赖对象浅拷贝的副作用
      updateOrderElement(orderEle, pageItem.goods_name);
      pageItems.push(pageItem);
    }
    return pageItems;
  }
  
  // 替换fetch的待发货订单响应数据
  function updatePendingOrders(data) {
    const pageItems = storage.get("pendingOrders");
    if (!pageItems) return data;
    for (const [index, pageItem] of pageItems.entries()) {
      data.result.pageItems[index] = {
        ...data.result.pageItems[index],
        ...pageItem,
      };
    }
    return data;
  }

  // 查询已发货的订单信息
  function queryShippedOrders(target) {}
  // 替换fetch的已发货订单响应数据
  function updateShippedOrders(data) {}
  // TODO:
  // 等待元素加载
  // 元素可编辑状态
  // 监听输入
  // 查询元素当前文本
  // 替换所有元素reactInstance(为了方便)上的dataSource(主要解决元素文字显示被重置的问题)
  // 替换fetch请求响应数据，修改数量以返回数为标准
})();
