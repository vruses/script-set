// ==UserScript==
// @name        steam社区商品实时交易
// @namespace   vurses
// @license     Mit
// @author      layen
// @match       https://steamcommunity.com/market/listings/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 实时监测社区商品，在出现合适的价格时执行买操作
// ==/UserScript==

(() => {
  "use strict";
  // 四种请求
  // 1.刷新价格列表请求；2.订单前的预请求(其实是获取交易税);
  // 3.创建订单请求；4.订单状态请求
  // 仪表盘：控制请求1的频率
  // 汇率并不需要设置可以直接获取，只需要设置期望价格expectPrice，每个链接存储为一组数据

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

  // 封装webWorker
  const workerJs = function () {
    class TimerManager {
      constructor() {
        this.timers = new Map();
      }
      set(key, callback, delay) {
        this.clean(key);
        const id = setTimeout(() => {
          callback();
        }, delay);
        this.timers.set(key, id);
      }
      clean(key) {
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }
      cleanAll() {
        for (let id of this.timers.values()) {
          clearTimeout(id);
        }
        this.timers.clear();
      }
      has(key) {
        return this.timers.has(key);
      }
    }
    const manager = new TimerManager();
    // 根据taskName设置定时
    self.addEventListener("message", function (e) {
      manager.set(
        e.data.taskName,
        () => self.postMessage(e.data.taskName),
        e.data.time
      );
    });
  };

  workerJs.toString();
  const blob = new Blob([`(${workerJs})()`], {
    type: "application/javascript",
  });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  // 用于判断是否被风控
  let riskCount = 0;
  // 用于首次请求获取本页商品id
  let runOnce = false;

  // XHR响应拦截
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (...args) {
    // 便于在send阶段筛选特定请求
    this._interceptUrl = args[1];
    return originalOpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this;
    const customOnReadyStateChange = function () {
      if (xhr.readyState === 4) {
        if (xhr._interceptUrl.includes("")) {
          const response = JSON.parse(xhr.responseText);
          if(checkPriceExpectation()){
            createBuyOrder()
          }
        }
      }

      if (xhr._originalOnReadyStateChange) {
        xhr._originalOnReadyStateChange.apply(this, arguments);
      }
    };
    // 防止重复hook
    if (!xhr._isHooked) {
      xhr._originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = customOnReadyStateChange;
      xhr._isHooked = true;
    }

    return originalSend.apply(this, arguments);
  };

  // 查询正在销售的商品列表
  function querySellOrderList() {}

  // 检查当前价格是否符合期望
  function checkPriceExpectation() {}

  // 创建订单请求
  function createBuyOrder() {}
  // 思路
  // 按一定频率请求1，同时拦截请求1，先拿到steam自身请求后的item_nameid
  // （因为steam网页还是用的php和jquery,item_nameid不好拿到
  // 只要检测到请求1存在价格列表而且价格合适的话（汇率换算）

  // 风控检测：
  // 需要对请求1做一些额外的检测，记录429的次数，当且仅当下一次429时计数加1，当累计10次后停止请求
  // 当成功请求后将计数重置

  // 购买流程：
  // 则请求接下来的几个接口
  // 订单前的与请求
  // 以上四种接口的调用函数都可以直接从steam网页上下文直接获取
  // 测试到接口2不必须，以防万一还是加上（其实不是必须的，交易税字段恒为0
  // 测试到接口4不必须，使用接口3返回的提示信息足矣

  // 完整的请求执行链为：
  // 执行链1：请求1，检测到价格合适；请求2，请求3；等待请求3完成，根据请求3的提示信息做出对应提示与操作。
  // 执行执行链1，无论返回哪种响应，提示对应信息，然后再次执行执行链1。

  // e.g.
  // 1.
  // {
  //   success: 29,
  //   message:
  //     "您已对该物品提交有效的订购单。在提交新的订单之前，您需要取消该订单，或等待交易完成。",
  // }
  // 2.
  // {
  //   success: 40,
  //   message: "直到前一个操作完成之前，您不能购买任何物品。",
  // }
  // 3.
  // {
  //   success: 1,
  //   buy_orderid: "7914341128",
  // }
})();
