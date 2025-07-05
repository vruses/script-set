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
  // 汇率并不需要设置可以直接获取，只需要设置期望价格expectPrice，每个链接存储为一组数据

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

  // 用于首次请求获取本页商品id
  let runOnce = false;
  // 用于缓存本页面的商品信息
  const orderInfo = reactive({
    itemID: 0, // 商品id
    riskCount: 0, // 计数用于判断是否被风控
  });
  // 商品id变化时，开始轮询商品列表
  watch(
    () => orderInfo.itemID,
    (newValue, _oldValue) => {
      querySellOrderList(newValue);
    }
  );
  // riskCount变化时，判断是否达到风控标准
  watch(
    () => orderInfo.riskCount,
    (newValue, _oldValue) => {
      if (newValue <= 10) {
        console.log("暂时没被风控");
      } else {
        console.log("被风控");
      }
    }
  );
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
              orderInfo.itemID = params.get("item_nameid");
              runOnce = true;
            }
            const response = JSON.parse(this.responseText);
            console.log(response);
            const currentPrice = response?.sell_order_graph?.[0]?.[0] ?? 0;
            const expectedPrice = storage.get("expectedPrice", 3);
            if (checkPriceExpectation(currentPrice, expectedPrice)) {
              createBuyOrder();
            }
            orderInfo.riskCount;
            console.log("riskCountReset=>", orderInfo.riskCount);
          }
        }
      }
    });

    return originalSend.apply(this, arguments);
  };

  // 查询正在销售的商品列表
  function querySellOrderList(itemID) {
    console.log("queryOrder=>", itemID);
    // 调用steam暴露的api方法
    Market_LoadOrderSpread(itemID);
  }

  // 检查当前价格是否符合期望
  function checkPriceExpectation(current, expected) {
    return current <= expected;
  }

  // 创建订单请求
  function createBuyOrder() {
    console.log("订单已创建");
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

  //
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
