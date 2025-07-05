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

  // 用于判断是否被风控
  let riskCount = 0;
  // 用于首次请求获取本页商品id
  let runOnce = false;
  // 用于缓存本页面的商品id
  let itemID = 0;

  // XHR响应拦截
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (_method, url, ...args) {
    // 便于在send阶段筛选特定请求
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    // 监听状态变化
    this.addEventListener("readystatechange", function () {
      if (this.readyState === 4) {
        // 查询商品列表
        if (
          this._url.includes(
            "https://steamcommunity.com/market/itemordershistogram"
          )
        ) {
          console.log(this.status);
          // 可能response为空可能为429
          // 429错误此处捕获不到，需要调用$ajax.error
          if (this.status === 200) {
            if (!runOnce) {
              const params = new URL(this._url).searchParams;
              itemID = params.get("item_nameid");
              runOnce = true;
            }
            const response = JSON.parse(this.responseText);
            console.log(response);
            const currentPrice = response?.sell_order_graph?.[0]?.[0];
            console.log(currentPrice);
            if (checkPriceExpectation(currentPrice, 3)) {
              createBuyOrder();
            }
            riskCount = 0;
            console.log("riskCountReset=>", riskCount);
          }
        }
      }
    });

    return originalSend.apply(this, arguments);
  };

  // 查询正在销售的商品列表
  function querySellOrderList() {}

  // 检查当前价格是否符合期望
  function checkPriceExpectation(current, expected) {
    return current <= expected;
  }

  // 创建订单请求
  function createBuyOrder() {
    console.log("订单已创建");
  }
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
