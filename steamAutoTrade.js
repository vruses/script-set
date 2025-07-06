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
  // 全局变量存储依赖收集相关信息
  let currentEffect = null;
  const targetMap = new WeakMap();

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

  /* 主运行逻辑 */
  function main() {
    // 用于首次请求获取本页商品id
    let runOnce = false;
    // 用于缓存本页面的商品信息
    const orderInfo = reactive({
      itemID: 0, // 商品id
      riskCount: 0, // 计数用于判断是否被风控
      intervalID: 0, //当前页面的计时器id
    });
    // riskCount变化时，判断是否达到风控标准
    watch(
      () => orderInfo.riskCount,
      (newValue, _oldValue) => {
        if (newValue <= 10) {
          // 暂时不用做什么
          console.log('risk');
        } else {
          // 放慢请求
          console.log("被风控");
        }
      }
    );

    // 注册WebComponent
    customElements.define("grid-layout", GridLayout);
    customElements.define("toggle-button", ToggleButton);
    customElements.define("float-button", FloatButton);
    customElements.define("input-number", InputNumber);

    const grid = document.createElement("grid-layout");
    // 设置网格配置
    grid.setGridConfig({
      rows: "repeat(3, 45px)",
      cols: "repeat(2, minmax(auto, 1fr))", //文字溢出暂无解决方案
      gap: "2px",
    });
    grid.slot = "setting";
    const label1 = document.createElement("div");
    const label2 = document.createElement("div");
    const label3 = document.createElement("div");
    label1.textContent = "期望价格";
    label2.textContent = "汇率";
    label3.textContent = "查询间隔";

    const input1 = document.createElement("input-number");
    const input2 = document.createElement("input-number");
    const input3 = document.createElement("input-number");
    // 三个value先从storage里获取，否则使用默认值
    // 当前页面的配置项
    const currentSettings = queryUrlSettings(location.href) ?? {
      expectedPrice: 0,
      exchangeRate: 0,
      queryInterval: 1,
    };
    // 各配置项属性对应的响应式对象
    const expectedPriceOptions = reactive({
      min: 0,
      max: 10e8,
      step: 1,
      value: currentSettings.expectedPrice,
    });
    const exchangeRateOptions = reactive({
      min: 0,
      max: 10e8,
      step: 1,
      value: currentSettings.exchangeRate,
    });
    const queryIntervalOptions = reactive({
      min: 0.01,
      max: 10e8,
      step: 1,
      value: currentSettings.queryInterval,
    });
    input1.props = expectedPriceOptions;
    input2.props = exchangeRateOptions;
    input3.props = queryIntervalOptions;

    // 变化时更新配置项
    watch(
      () => expectedPriceOptions.value,
      (newValue, _oldValue) => {
        const currentUrl = location.href;
        currentSettings.expectedPrice = newValue;
        // 存储当前页面的期望价格
        updateUrlSettings(currentUrl, currentSettings);
      }
    );
    watch(
      () => exchangeRateOptions.value,
      (newValue, _oldValue) => {
        const currentUrl = location.href;
        currentSettings.exchangeRate = newValue;
        // 存储当前页面的汇率
        updateUrlSettings(currentUrl, currentSettings);
      }
    );
    watch(
      () => queryIntervalOptions.value,
      (newValue, _oldValue) => {
        const currentUrl = location.href;
        // 更新当前的查询间隔
        currentSettings.queryInterval = newValue;
        // 存储当前页面的查询间隔
        updateUrlSettings(currentUrl, currentSettings);
      }
    );
    grid.addItems(label1, input1, label2, input2, label3, input3);
    const status = reactive({
      isActive: false,
    });
    const timer = new AccurateTimer();
    // 变化时关闭或者开启轮询定时器
    watch(
      () => status.isActive,
      (newValue, _oldValue) => {
        //如果orderInfo不存在itemID的信息则不执行
        if (!orderInfo.itemID) return;

        // 创建定时器，关闭定时器
        if (newValue) {
          orderInfo.intervalID = timer.setInterval(
            () => {
              querySellOrderList(orderInfo.itemID);
            },
            currentSettings.queryInterval * 1000,
            { accurate: true, maxDrift: 5, name: "轮询商品列表" }
          );
        } else {
          timer.clearTimer(orderInfo.intervalID);
        }
      }
    );
    // 执行按钮
    const statusBtn = document.createElement("toggle-button");
    statusBtn.slot = "trigger";
    statusBtn.props = status;
    const floatButton = document.createElement("float-button");
    floatButton.append(grid, statusBtn);
    document.documentElement.append(floatButton);

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
            // 可能response为空可能为429
            // 429错误此处捕获不到，需要调用$ajax.error
            if (this.status === 200) {
              if (!runOnce) {
                const params = new URL(this._url).searchParams;
                orderInfo.itemID = params.get("item_nameid");
                runOnce = true;
              }
              const response = JSON.parse(this.responseText);
              console.log(response);
              // 当获取信息错误时应将当前价格设置为无穷避免误购买
              const currentPrice =
                response?.sell_order_graph?.[0]?.[0] ?? 10e20;
              const expectedPrice = currentSettings.expectedPrice;
              const exchangeRate = currentSettings.exchangeRate;
              // 如果符合计算后的期望价格创建订单请求
              if (
                checkPriceExpectation(currentPrice, expectedPrice, exchangeRate)
              ) {
                createBuyOrder();
              }
              orderInfo.riskCount;
            }
          }
        }
      });

      return originalSend.apply(this, arguments);
    };
  }

  // 查询正在销售的商品列表
  function querySellOrderList(itemID) {
    // 改用steam暴露的api以处理错误信息
    $J.ajax({
      url: "https://steamcommunity.com/market/itemordershistogram",
      type: "GET",
      data: {
        country: g_strCountryCode,
        language: g_strLanguage,
        currency:
          typeof g_rgWalletInfo != "undefined" &&
          g_rgWalletInfo["wallet_currency"] != 0
            ? g_rgWalletInfo["wallet_currency"]
            : 1,
        item_nameid: itemID,
      },
    }).error(function () {
      // 处理错误监测风控
      orderInfo.riskCount++;
    });
  }

  // 检查当前价格是否符合期望
  function checkPriceExpectation(current, expected, exchangeRate) {
    return current <= expected * exchangeRate;
  }

  // 从URL获取创建订单所需
  function getItemInfoFromURL() {
    const url = window.location.href;
    const urlPattern = /\/market\/listings\/(\d+)\/(.+)/;
    const match = url.match(urlPattern);

    if (match) {
      const appId = match[1];
      const itemName = decodeURIComponent(match[2]);
      return {
        appId: appId,
        itemName: itemName,
      };
    }
    return null;
  }

  // 创建订单请求
  function createBuyOrder() {
    // 直接用steam暴露的api
    var currency = GetPriceValueAsInt(
      $J("#market_buy_commodity_input_price").val()
    );
    var quantity = parseInt($J("#market_buy_commodity_input_quantity").val());
    var price_total = Math.round(currency * quantity);

    var first_name = $J("#first_name") ? $J("#first_name").val() : "";
    var last_name = $J("#last_name") ? $J("#last_name").val() : "";
    var billing_address = $J("#billing_address")
      ? $J("#billing_address").val()
      : "";
    var billing_address_two = $J("#billing_address_two")
      ? $J("#billing_address_two").val()
      : "";
    var billing_country = $J("#billing_country")
      ? $J("#billing_country").val()
      : "";
    var billing_city = $J("#billing_city") ? $J("#billing_city").val() : "";
    var billing_state = g_bHasBillingStates
      ? $J("#billing_state_select")
        ? $J("#billing_state_select").val()
        : ""
      : "";
    var billing_postal_code = $J("#billing_postal_code")
      ? $J("#billing_postal_code").val()
      : "";
    var save_my_address = $J("#save_my_address")
      ? $J("#save_my_address").prop("checked")
      : false;

    $J.ajax({
      url: "https://steamcommunity.com/market/createbuyorder/",
      type: "POST",
      data: {
        sessionid: g_sessionID,
        currency: g_rgWalletInfo["wallet_currency"],
        appid: getItemInfoFromURL()?.appId,
        // market_hash_name: getItemInfoFromURL()?.itemName,
        price_total: price_total,
        tradefee_tax: GetPriceValueAsInt(
          $J("#market_buy_commodity_input_localtax").val()
        ),
        quantity: quantity,
        first_name: first_name,
        last_name: last_name,
        billing_address: billing_address,
        billing_address_two: billing_address_two,
        billing_country: billing_country,
        billing_city: billing_city,
        billing_state: billing_state,
        billing_postal_code: billing_postal_code,
        save_my_address: save_my_address ? "1" : "0",
      },
      crossDomain: true,
      xhrFields: { withCredentials: true },
    });
  }

  // 查询对应url的本地配置
  function queryUrlSettings(url) {
    const storageKey = "urlSettings";

    try {
      const data = storage.get(storageKey, []);
      const found = data.find((item) => item.url === url);

      return found ? found.settings : null;
    } catch (error) {
      console.error("查询配置失败:", error);
      return null;
    }
  }

  // 更新对应url的本地配置
  function updateUrlSettings(url, newSettings) {
    const storageKey = "urlSettings";
    let data = storage.get(storageKey, []);

    const existingIndex = data.findIndex((item) => item.url === url);

    if (existingIndex !== -1) {
      // 更新现有配置
      data[existingIndex].settings = {
        ...data[existingIndex].settings,
        ...newSettings,
      };
    } else {
      // 新建配置
      data.push({
        url: url,
        settings: newSettings,
      });
    }
    storage.set(storageKey, data);
    return data;
  }

  // 依赖收集：将当前effect与对象属性关联
  function track(target, key) {
    if (!currentEffect) return;

    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = new Set()));
    }

    dep.add(currentEffect);
  }

  // 触发依赖：执行与对象属性关联的所有effects
  function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const dep = depsMap.get(key);
    if (dep) {
      dep.forEach((effect) => effect());
    }
  }

  // 创建响应式对象
  function reactive(target) {
    if (typeof target !== "object" || target === null) {
      return target;
    }

    // 如果已经是响应式对象，直接返回
    if (target.__isReactive) {
      return target;
    }

    const proxy = new Proxy(target, {
      get(obj, key) {
        // 标记为响应式对象
        if (key === "__isReactive") {
          return true;
        }

        // 依赖收集
        track(obj, key);

        const result = obj[key];

        // 如果值是对象，递归转换为响应式
        if (typeof result === "object" && result !== null) {
          return reactive(result);
        }

        return result;
      },

      set(obj, key, value) {
        const oldValue = obj[key];

        // 设置新值
        obj[key] = value;

        // 触发依赖更新
        if (oldValue !== value) {
          trigger(obj, key);
        }

        return true;
      },
    });

    return proxy;
  }

  // 监听器函数
  function watch(source, callback, options = {}) {
    const { immediate = false, deep = false } = options;

    let getter;
    let oldValue;

    // 处理不同类型的source
    if (typeof source === "function") {
      getter = source;
    } else if (typeof source === "object" && source !== null) {
      getter = () => (deep ? JSON.stringify(source) : source);
    } else {
      getter = () => source;
    }

    // 创建effect函数
    const effect = () => {
      const newValue = getter();

      if (oldValue !== newValue || deep) {
        callback(newValue, oldValue);
        oldValue = newValue;
      }
    };

    // 设置当前effect并执行getter收集依赖
    const runEffect = () => {
      currentEffect = effect;
      const value = getter();
      currentEffect = null;
      return value;
    };

    // 初始收集依赖
    oldValue = runEffect();

    // 如果需要立即执行
    if (immediate) {
      callback(oldValue, undefined);
    }

    // 返回停止监听的函数
    return () => {
      // 这里可以实现停止监听的逻辑
      // 简化版本，实际需要从dep中移除effect
    };
  }

  // 准确定时器类
  class AccurateTimer {
    constructor() {
      this.timers = new Map(); // 存储所有定时器
      this.nextId = 1; // 定时器ID计数器
    }

    /**
     * 创建一个准确的定时器
     * @param {Function} callback - 回调函数
     * @param {number} delay - 延迟时间（毫秒）
     * @param {Object} options - 配置选项
     * @returns {number} 定时器ID
     */
    setTimeout(callback, delay, options = {}) {
      const {
        accurate = true, // 是否使用高精度定时
        maxDrift = 10, // 允许的最大漂移（毫秒）
        name = null, // 定时器名称（可选）
      } = options;

      const id = this.nextId++;
      const startTime = performance.now();
      const targetTime = startTime + delay;

      const timer = {
        id,
        name,
        callback,
        delay,
        startTime,
        targetTime,
        accurate,
        maxDrift,
        timeoutId: null,
        cancelled: false,
        completed: false,
      };

      if (accurate) {
        this._createAccurateTimer(timer);
      } else {
        timer.timeoutId = setTimeout(() => {
          if (!timer.cancelled) {
            timer.completed = true;
            callback();
            this.timers.delete(id);
          }
        }, delay);
      }

      this.timers.set(id, timer);
      return id;
    }

    /**
     * 创建准确的定时器
     */
    _createAccurateTimer(timer) {
      const checkTime = () => {
        if (timer.cancelled) return;

        const currentTime = performance.now();
        const remaining = timer.targetTime - currentTime;

        if (remaining <= 0) {
          // 时间到了
          timer.completed = true;
          timer.callback();
          this.timers.delete(timer.id);
        } else if (remaining <= timer.maxDrift) {
          // 剩余时间很短，使用setTimeout精确控制
          timer.timeoutId = setTimeout(() => {
            if (!timer.cancelled) {
              timer.completed = true;
              timer.callback();
              this.timers.delete(timer.id);
            }
          }, Math.max(0, remaining));
        } else {
          // 还有较长时间，继续检查
          timer.timeoutId = setTimeout(checkTime, Math.min(remaining / 2, 100));
        }
      };

      checkTime();
    }

    /**
     * 创建间隔定时器
     * @param {Function} callback - 回调函数
     * @param {number} interval - 间隔时间（毫秒）
     * @param {Object} options - 配置选项
     * @returns {number} 定时器ID
     */
    setInterval(callback, interval, options = {}) {
      const {
        accurate = true,
        maxDrift = 10,
        name = null,
        maxCount = Infinity, // 最大执行次数
      } = options;

      const id = this.nextId++;
      const startTime = performance.now();

      const timer = {
        id,
        name,
        callback,
        interval,
        startTime,
        accurate,
        maxDrift,
        maxCount,
        count: 0,
        timeoutId: null,
        cancelled: false,
        nextTime: startTime + interval,
      };

      if (accurate) {
        this._createAccurateInterval(timer);
      } else {
        timer.timeoutId = setInterval(() => {
          if (!timer.cancelled && timer.count < timer.maxCount) {
            timer.count++;
            callback(timer.count);
            if (timer.count >= timer.maxCount) {
              this.clearTimer(id);
            }
          }
        }, interval);
      }

      this.timers.set(id, timer);
      return id;
    }

    /**
     * 创建准确的间隔定时器
     */
    _createAccurateInterval(timer) {
      const executeNext = () => {
        if (timer.cancelled || timer.count >= timer.maxCount) {
          this.timers.delete(timer.id);
          return;
        }

        const currentTime = performance.now();
        const remaining = timer.nextTime - currentTime;

        if (remaining <= 0) {
          // 执行回调
          timer.count++;
          timer.callback(timer.count);

          // 计算下次执行时间，避免漂移累积
          timer.nextTime = timer.startTime + (timer.count + 1) * timer.interval;

          if (timer.count < timer.maxCount) {
            executeNext();
          } else {
            this.timers.delete(timer.id);
          }
        } else if (remaining <= timer.maxDrift) {
          // 剩余时间很短，使用setTimeout精确控制
          timer.timeoutId = setTimeout(executeNext, Math.max(0, remaining));
        } else {
          // 还有较长时间，继续检查
          timer.timeoutId = setTimeout(
            executeNext,
            Math.min(remaining / 2, 100)
          );
        }
      };

      executeNext();
    }

    /**
     * 取消定时器
     * @param {number} id - 定时器ID
     * @returns {boolean} 是否成功取消
     */
    clearTimer(id) {
      const timer = this.timers.get(id);
      if (!timer) return false;

      timer.cancelled = true;
      if (timer.timeoutId) {
        clearTimeout(timer.timeoutId);
      }
      this.timers.delete(id);
      return true;
    }

    /**
     * 重新启动定时器
     * @param {number} id - 定时器ID
     * @param {number} newDelay - 新的延迟时间（可选）
     * @returns {boolean} 是否成功重启
     */
    restartTimer(id, newDelay) {
      const timer = this.timers.get(id);
      if (!timer) return false;

      // 取消当前定时器
      this.clearTimer(id);

      // 重新创建
      if (timer.interval !== undefined) {
        // 间隔定时器
        return this.setInterval(timer.callback, newDelay || timer.interval, {
          accurate: timer.accurate,
          maxDrift: timer.maxDrift,
          name: timer.name,
          maxCount: timer.maxCount,
        });
      } else {
        // 单次定时器
        return this.setTimeout(timer.callback, newDelay || timer.delay, {
          accurate: timer.accurate,
          maxDrift: timer.maxDrift,
          name: timer.name,
        });
      }
    }

    /**
     * 暂停定时器
     * @param {number} id - 定时器ID
     * @returns {boolean} 是否成功暂停
     */
    pauseTimer(id) {
      const timer = this.timers.get(id);
      if (!timer || timer.cancelled) return false;

      timer.pausedAt = performance.now();
      timer.paused = true;

      if (timer.timeoutId) {
        clearTimeout(timer.timeoutId);
        timer.timeoutId = null;
      }

      return true;
    }

    /**
     * 恢复定时器
     * @param {number} id - 定时器ID
     * @returns {boolean} 是否成功恢复
     */
    resumeTimer(id) {
      const timer = this.timers.get(id);
      if (!timer || !timer.paused) return false;

      const pausedDuration = performance.now() - timer.pausedAt;

      if (timer.interval !== undefined) {
        // 间隔定时器
        timer.nextTime += pausedDuration;
        timer.paused = false;
        this._createAccurateInterval(timer);
      } else {
        // 单次定时器
        timer.targetTime += pausedDuration;
        timer.paused = false;
        this._createAccurateTimer(timer);
      }

      return true;
    }

    /**
     * 获取定时器信息
     * @param {number} id - 定时器ID
     * @returns {Object|null} 定时器信息
     */
    getTimerInfo(id) {
      const timer = this.timers.get(id);
      if (!timer) return null;

      const currentTime = performance.now();
      const elapsed = currentTime - timer.startTime;

      let remaining = 0;
      if (timer.interval !== undefined) {
        remaining = Math.max(0, timer.nextTime - currentTime);
      } else {
        remaining = Math.max(0, timer.targetTime - currentTime);
      }

      return {
        id: timer.id,
        name: timer.name,
        type: timer.interval !== undefined ? "interval" : "timeout",
        delay: timer.delay || timer.interval,
        elapsed: Math.round(elapsed),
        remaining: Math.round(remaining),
        count: timer.count || 0,
        maxCount: timer.maxCount || 1,
        cancelled: timer.cancelled,
        completed: timer.completed || false,
        paused: timer.paused || false,
        accurate: timer.accurate,
      };
    }

    /**
     * 获取所有定时器列表
     * @returns {Array} 定时器列表
     */
    getAllTimers() {
      return Array.from(this.timers.keys()).map((id) => this.getTimerInfo(id));
    }

    /**
     * 清除所有定时器
     */
    clearAllTimers() {
      for (const id of this.timers.keys()) {
        this.clearTimer(id);
      }
    }

    /**
     * 获取定时器统计信息
     */
    getStats() {
      const timers = this.getAllTimers();
      return {
        total: timers.length,
        running: timers.filter((t) => !t.cancelled && !t.completed && !t.paused)
          .length,
        paused: timers.filter((t) => t.paused).length,
        completed: timers.filter((t) => t.completed).length,
        cancelled: timers.filter((t) => t.cancelled).length,
        accurate: timers.filter((t) => t.accurate).length,
      };
    }
  }

  // WebComponent组件
  class FloatButton extends HTMLElement {
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
      :host {
        /* 避免外部css的影响 */
        all: initial;
        font-size: normal;
        position: fixed;
        right: 5px;
        top: 40%;
        transform: translateY(-50%);
        z-index: 1000;
      }
      .float-button {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        background:rgba(67, 87, 175, 0.65);
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .float-button:hover {
        background: #4357af;
        transform: scale(1.1);
      }
      .panel {
        position: absolute;
        display: flex;
        right: 50px;
        top: 0;
        justify-content: center;
 
        flex-wrap: wrap;
        background:rgba(255, 255, 255);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        width: 230px;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s ease;
        pointer-events: none;
      }
      .input-group {
        padding: 5px 10px;
      }
      .panel.open {
        opacity: 1;
        transform: translateX(0);
        pointer-events: all;
      }
      .close {
        transform: rotate(180deg);
      }`;
      shadowRoot.innerHTML = `
    <button class="float-button">+</button>
      <div class="panel">
        <div class="input-group">
        <slot name="setting">Widget Missing</slot>
        </div>
        <div class="input-group">
        <slot name="trigger">Widget Missing</slot>
        </div>
      </div>`;
      shadowRoot.append(style);
      const floatBtn = shadowRoot.querySelector(".float-button");
      const panel = shadowRoot.querySelector(".panel");

      floatBtn.addEventListener("click", () => {
        panel.classList.toggle("open");
        floatBtn.classList.toggle("close");
      });
    }
  }
  class ToggleButton extends HTMLElement {
    constructor() {
      super();
      this.props = {
        isActive: false,
      };
      this.dangerContent = "结束执行";
      this.successContent = "开始执行";
      this.attachShadow({ mode: "open" });

      // 初始化按钮样式与结构
      this.shadowRoot.innerHTML = `
        <style>
          button {
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 6px;
            color: white;
            background-color:#719d44; 
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          button.danger {
            background-color:#a73d44; 
          }

          button:focus {
            outline: none;
          }
        </style>
        <button><slot>按钮</slot></button>
      `;
    }

    connectedCallback() {
      this.button = this.shadowRoot.querySelector("button");
      this.updateButton(); // 初始更新
      this.button.addEventListener("click", () => this.toggleState());
    }

    toggleState() {
      this.props.isActive = !this.props.isActive;
      this.updateButton();
    }

    updateButton() {
      if (this.props.isActive) {
        this.button.classList.add("danger");
        this.button.textContent = this.dangerContent;
      } else {
        this.button.classList.remove("danger");
        this.button.textContent = this.successContent;
      }
    }
  }
  class InputNumber extends HTMLElement {
    #minus;
    #input;
    #plus;
    constructor() {
      super();
      this.props = {
        min: 0,
        max: 1000000000,
        step: 1,
        value: 0,
      };

      this.#minus = document.createElement("button");
      this.#input = document.createElement("input");
      this.#plus = document.createElement("button");
      this.#minus.classList.add(
        "number-input__button",
        "number-input__button--minus"
      );
      this.#minus.type = "button";
      this.#input.classList.add("number-input__input");
      this.#plus.classList.add(
        "number-input__button",
        "number-input__button--plus"
      );
      this.#plus.type = "button";
      const shadowRoot = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
        .number-input__button {
            width: 32px;
            height: 34px;
            background: #f5f7fa;
            border: none;
            outline: none;
            cursor: pointer;
            position: relative;
            transition: background 0.3s;
        }
        .number-input__button:hover {
            background: #e4e7ed;
        }
        .number-input__button:disabled {
            cursor: not-allowed;
            color: #c0c4cc;
            background: #f5f7fa;
        }
        .number-input__button::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 10px;
            height: 2px;
            background: #606266;
        }
        .number-input__button--plus::after {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 2px;
            height: 10px;
            background: #606266;
        }
        .number-input__input {
            width: 60px;
            height: 32px;
            border: none;
            border-left: 1px solid #dcdfe6;
            border-right: 1px solid #dcdfe6;
            text-align: center;
            outline: none;
            font-size: 14px;
            color: #606266;
        }
        :host {
            box-sizing: border-box;
            display: inline-flex;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            overflow: hidden;
            transition: all 0.25s linear;
        }
        :host(:hover) {
            box-shadow: 0 0 0 1px #dbe6f1;
        }
        :host(:focus-within) {
            box-shadow: 0 0 0 1px #409effd9;
            transition: all 0.25s linear;
        }
        .number-input__input:disabled {
            background: #f5f7fa;
            cursor: not-allowed;
        }`;
      shadowRoot.append(style, this.#minus, this.#input, this.#plus);
    }
    connectedCallback() {
      this.init();
    }
    attributeChangedCallback() {
      // update value
    }
    init() {
      this.#input.value = this.props.value;
      this.updateButtonState();

      // 绑定事件
      this.#minus.addEventListener("click", () =>
        this.changeValue(-this.props.step)
      );
      this.#plus.addEventListener("click", () =>
        this.changeValue(this.props.step)
      );
      this.#input.addEventListener("change", () => this.validateInput());
      this.#input.addEventListener("keydown", (e) => this.handleKeydown(e));
    }
    changeValue(delta) {
      // 避免浮点运算不准确
      const newValue =
        (Math.round(this.props.value * 100) + Math.round(delta * 100)) / 100;
      this.props.value = Math.max(
        this.props.min,
        Math.min(this.props.max, newValue)
      );
      this.#input.value = Number.isInteger(this.props.value)
        ? this.props.value
        : this.props.value.toFixed(2);
      this.updateButtonState();
    }
    validateInput() {
      let value = parseFloat(this.#input.value);
      if (isNaN(value)) {
        value = this.props.min;
      }
      this.props.value = Math.max(
        this.props.min,
        Math.min(this.props.max, value)
      );
      this.#input.value = Number.isInteger(this.props.value)
        ? this.props.value
        : this.props.value.toFixed(2);
      this.updateButtonState();
    }
    updateButtonState() {
      this.#minus.disabled = this.props.value <= this.props.min;
      this.#plus.disabled = this.props.value >= this.props.max;
    }
    handleKeydown(e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.changeValue(this.props.step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.changeValue(-this.props.step);
      }
    }
  }
  class GridLayout extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.render();
    }

    static get observedAttributes() {
      return ["rows", "cols", "gap", "auto-fit", "min-width", "max-width"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        this.updateGridStyles();
      }
    }

    render() {
      this.shadowRoot.innerHTML = `
                    <style>
                        :host {
                            display: block;
                            width: 100%;
                            box-sizing: border-box;
                        }

                        .grid-container {
                            display: grid;
                            width: 100%;
                            gap: 10px;
                            grid-template-columns: repeat(3, 1fr);
                            grid-template-rows: auto;
                            box-sizing: border-box;
                        }

                        .grid-item {
                            background: var(--item-bg, #f5f5f5);
                            border: var(--item-border, 1px solid #ddd);
                            border-radius: var(--item-radius, 4px);
                            padding: var(--item-padding, 12px);
                            transition: all 0.3s ease;
                            box-sizing: border-box;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: var(--item-min-height, 60px);
                        }

                        .grid-item:hover {
                            background: var(--item-hover-bg, #e8f4f8);
                            transform: translateY(-2px);
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        }

                        ::slotted(*) {
                            width: 100%;
                            height: 100%;
                            margin: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }

                        /* 响应式支持 */
                        @media (max-width: 768px) {
                            .grid-container {
                                grid-template-columns: repeat(2, 1fr);
                                gap: 8px;
                            }
                        }

                        @media (max-width: 480px) {
                            .grid-container {
                                grid-template-columns: 1fr;
                            }
                        }
                    </style>
                    <div class="grid-container">
                        <slot></slot>
                    </div>
                `;

      this.updateGridStyles();
    }

    updateGridStyles() {
      const container = this.shadowRoot.querySelector(".grid-container");
      if (!container) return;

      const rows = this.getAttribute("rows") || "auto";
      const cols = this.getAttribute("cols") || "repeat(3, 1fr)";
      const gap = this.getAttribute("gap") || "10px";
      const autoFit = this.getAttribute("auto-fit") === "true";
      const minWidth = this.getAttribute("min-width") || "200px";
      const maxWidth = this.getAttribute("max-width") || "1fr";

      // 直接设置grid样式，不依赖CSS变量
      if (autoFit) {
        container.style.gridTemplateColumns = `repeat(auto-fit, minmax(${minWidth}, ${maxWidth}))`;
        container.style.gridTemplateRows = "auto";
      } else {
        container.style.gridTemplateColumns = cols;
        container.style.gridTemplateRows = rows;
      }
      container.style.gap = gap;
    }

    // 添加多个网格项
    addItems(...elements) {
      for (const element of elements) {
        const item = document.createElement("div");
        item.className = "grid-item";
        item.appendChild(element);
        this.appendChild(item);
      }
    }

    // 清空所有项
    clearItems() {
      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }
    }

    // 设置网格配置
    setGridConfig(config) {
      if (config.rows) this.setAttribute("rows", config.rows);
      if (config.cols) this.setAttribute("cols", config.cols);
      if (config.gap) this.setAttribute("gap", config.gap);
      if (config.autoFit !== undefined)
        this.setAttribute("auto-fit", config.autoFit);
      if (config.minWidth) this.setAttribute("min-width", config.minWidth);
      if (config.maxWidth) this.setAttribute("max-width", config.maxWidth);
    }
  }

  main()
  // TODO:风控，实现购买订单逻辑
})();
