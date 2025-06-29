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
  // 在这里添加数个不同的订单缩略图
  const thumb_urls = {
    1: "https://img.pddpic.com/garner-api-new/5411da8f88be7d8f8ab61733716540a8.jpeg",
    2: "",
    3: "",
    // ...
  };

  /*   复用缩略图，下面的两个数组分别用于控制 待发货的订单 和 已发货的订单 的缩略图列表显示和显示顺序：
  第1个订单的缩略图用上方第1个链接
  第2个订单的缩略图用上方第2个链接
  第3个订单的缩略图用上方第3个链接...
  总共20个链接，可自行调整顺序和增减缩略图链接 */

  // 待发货的订单缩略图
  const pendingThumbDisplayHolder = [
    1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2,
  ];
  // 已发货的订单缩略图
  const shippedThumbDisplayHolder = [
    1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2,
  ];

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

  // 告诉fetch替换收货人信息是属于待发货还是已发货的
  let currentStatus = "pending";
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
        currentStatus = "pending";
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
        if (JSON.parse(init.body)?.orderType === 2) {
          currentStatus = "shipped";
          // 处理已发货订单信息元素的编辑
          handleInfoEdit(
            awaitElementLoad,
            "[class*='TB_innerMiddle'] table tbody",
            "[class*='TB_innerMiddle']",
            "shippedOrders",
            queryShippedOrders
          );
          // 返回修改后的待发货订单信息响应体
          const newShippedOrdersResponse = replaceResponse(
            response,
            updateShippedOrders
          );
          return newShippedOrdersResponse;
        }
      }
      // 查看收货人详细信息的请求
      if (url.includes("/fopen/order/receiver")) {
        // 传递请求参数payload，用于判断具体的请求发出者
        const payload = JSON.parse(init.body);
        if (currentStatus === "pending") {
          const newPendingReceiverResponse = replaceResponse(
            response,
            updatePendingReceiverDetails,
            payload
          );
          // 返回修改后的待发货收货人详细信息响应体
          return newPendingReceiverResponse;
        }
        if (currentStatus === "shipped") {
          const newShippedReceiverResponse = replaceResponse(
            response,
            updateShippedReceiverDetails,
            payload
          );
          // 返回修改后的已发货收货人详细信息响应体
          return newShippedReceiverResponse;
        }
      }
      return response;
    });
  };
  // 修改响应,增加可选参数请求体
  async function replaceResponse(response, dataHandler, payload) {
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    let modifiedData = data;
    // 修改信息
    modifiedData = dataHandler(modifiedData, payload);
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
    // 因为待发货和已发货切换后元素容器不变，在容器上绑定回调函数引用避免监听器重复绑定
    if (ele._inputCallback) {
      ele.removeEventListener("input", ele._inputCallback);
    }
    const callback = function () {
      // 获取数据
      const data = queryFunc(ele);
      // 本地存储数据
      storage.set(storageKey, data);
    };
    ele._inputCallback = callback;
    ele.addEventListener("input", callback);
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

  // 查询具体的待发货订单信息
  function queryPendingOrderInfo(target) {
    // target===tbody
    // 表结构比较复杂
    const confirm_date = target
      ?.querySelector("tr")
      ?.querySelectorAll("span")[4]?.lastChild?.nodeValue;
    const timestamp = Math.floor(new Date(confirm_date).getTime() / 1000);
    const address = target
      ?.querySelectorAll("tr td")[7]
      ?.querySelectorAll("style")[1]
      ?.nextSibling?.nodeValue?.split(" ");
    const len = target
      ?.querySelectorAll("tr td")[2]
      ?.querySelectorAll("style").length;
    // 商品规格
    const spec = target
      ?.querySelectorAll("tr td")[2]
      ?.querySelectorAll("style")[len - 1]?.nextSibling?.nodeValue;
    const pageItem = {
      order_sn:
        target?.querySelector("tr")?.querySelectorAll("span")[2]?.lastChild
          ?.nodeValue ?? "占位符",
      confirm_time: timestamp,
      goods_name:
        target?.querySelectorAll("tr td")[2]?.querySelector("a").firstChild
          ?.nodeValue ?? "占位符",
      goods_id:
        +target?.querySelectorAll("tr td")[2]?.querySelector("p")?.lastChild
          ?.nodeValue ?? "占位符",
      // 选定后一个style
      spec: spec ?? "占位符",
      order_status_str:
        target?.querySelectorAll("tr td")[3]?.firstChild?.firstChild
          ?.nodeValue ?? "占位符",
      goods_number: +target?.querySelectorAll("tr td")[4]?.textContent ?? 0,
      goods_amount:
        +target?.querySelectorAll("tr td")[5]?.textContent * 100 ?? 0,
      order_amount:
        +target?.querySelectorAll("tr td")[6]?.textContent * 100 ?? 0,
      receive_name:
        target?.querySelectorAll("tr td")[7]?.querySelectorAll("style")[0]
          ?.nextSibling?.firstChild?.nodeValue ?? "占位符",
      province_name: address[0] ?? "占位符",
      city_name: address[1] ?? "占位符",
      district_name: address[2] ?? "占位符",
      address_spec: address[3] ?? "占位符",
      nickname:
        target?.querySelectorAll("tr td")[8]?.querySelector("span")
          ?.previousSibling?.nodeValue ?? "占位符",
      thumb_url: "",
    };
    return pageItem;
  }

  // 查询待发货的订单
  function queryPendingOrders(target) {
    // target===TB_innerMiddle
    const pageItems = [];
    // 查询单个订单信息
    for (const orderEle of target.querySelectorAll("tbody")) {
      const pageItem = queryPendingOrderInfo(orderEle);
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
      // 替换缩略图
      data.result.pageItems[index].thumb_url =
        thumb_urls[pendingThumbDisplayHolder[index]] ?? "";
    }
    return data;
  }

  // 查询具体的已发货订单信息
  function queryShippedOrderInfo(target) {
    // 表结构大差不差，调已发货的逻辑就行
    return queryPendingOrderInfo(target);
  }

  // 查询已发货的订单信息
  function queryShippedOrders(target) {
    // target===TB_innerMiddle
    const pageItems = [];
    // 查询单个订单信息
    for (const orderEle of target.querySelectorAll("tbody")) {
      const pageItem = queryShippedOrderInfo(orderEle);
      // 避免文字显示被重置，依赖对象浅拷贝的副作用
      updateOrderElement(orderEle, pageItem.goods_name);
      pageItems.push(pageItem);
    }
    return pageItems;
  }

  // 替换fetch的已发货订单响应数据
  function updateShippedOrders(data) {
    const pageItems = storage.get("shippedOrders");
    if (!pageItems) return data;
    for (const [index, pageItem] of pageItems.entries()) {
      data.result.pageItems[index] = {
        ...data.result.pageItems[index],
        ...pageItem,
      };
      // 替换缩略图
      data.result.pageItems[index].thumb_url =
        thumb_urls[shippedThumbDisplayHolder[index]] ?? "";
    }
    return data;
  }

  // 替换fetch的待发货的收货人的详细信息
  function updatePendingReceiverDetails(data, payload) {
    const order_sn = payload?.order_sn;
    const pageItems = storage.get("pendingOrders");
    if (!pageItems) return data;
    // 匹配订单编码
    const item = pageItems.filter((value) => {
      return value.order_sn === order_sn;
    })[0];
    data.result.name_pure = item.receive_name;
    data.result.province = item.province_name;
    data.result.city = item.city_name;
    data.result.district = item.district_name;
    data.result.address_pure = item.address_spec;
    return data;
  }

  // 替换fetch的已发货的收货人的详细信息
  function updateShippedReceiverDetails(data, payload) {
    const order_sn = payload?.order_sn;
    const pageItems = storage.get("shippedOrders");
    if (!pageItems) return data;
    // 匹配订单编码
    const item = pageItems.filter((value) => {
      return value.order_sn === order_sn;
    })[0];
    data.result.name_pure = item.receive_name;
    data.result.province = item.province_name;
    data.result.city = item.city_name;
    data.result.district = item.district_name;
    data.result.address_pure = item.address_spec;
    return data;
  }
})();
