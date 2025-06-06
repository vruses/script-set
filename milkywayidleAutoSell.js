// ==UserScript==
// @name        银河奶牛放置自动买卖
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://www.milkywayidle.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 自动买卖
// ==/UserScript==

/**
 * @extends {HTMLElement}
 */
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
        background:rgba(255, 255, 255, 0);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        width: 120px;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s ease;
        pointer-events: none;
      }
      .input-group {
        margin-bottom: 5px;
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
        <slot name="button1">Widget Missing</slot>
        </div>
        <div class="input-group">
        <slot name="button2">Widget Missing</slot>
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
    this.isDanger = false;
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
            background-color: #2fc4a7; 
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          button.danger {
            background-color: #d95961; 
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
    this.isDanger = !this.isDanger;
    this.updateButton();
  }

  updateButton() {
    if (this.isDanger) {
      this.button.classList.add("danger");
      this.button.textContent = this.dangerContent;
    } else {
      this.button.classList.remove("danger");
      this.button.textContent = this.successContent;
    }
  }
}
customElements.define("toggle-button", ToggleButton);
customElements.define("float-button", FloatButton);

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
      // 个人信息接口
      if (
        xhr._interceptUrl.includes("https://api.milkywayidle.com/v1/users/me")
      ) {
        const resJson = JSON.parse(xhr.responseText);
        Object.defineProperty(xhr, "responseText", {
          get: function () {
            let id = "";
            try {
              id = resJson?.characters[0].id;
            } catch (error) {
              console.log(error);
            }
            // 在首页
            if (location.href === "https://www.milkywayidle.com/") {
              // 已登录
              if (id) {
                // 跳转游戏界面
                location.href = `https://www.milkywayidle.com/game?characterId=${id}`;
              }
            }
          },
        });
      }
    }

    if (xhr._originalOnReadyStateChange) {
      xhr._originalOnReadyStateChange.apply(this, arguments);
    }
  };

  if (!xhr._isHooked) {
    xhr._originalOnReadyStateChange = xhr.onreadystatechange;
    xhr.onreadystatechange = customOnReadyStateChange;
    xhr._isHooked = true;
  }

  return originalSend.apply(this, arguments);
};

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
const blob = new Blob([`(${workerJs})()`], { type: "application/javascript" });
const url = URL.createObjectURL(blob);
let worker;

/**
 * 等待某个指定的 DOM 元素加载完成（出现在页面上）
 * @param {string} selector - 要等待的 CSS 选择器
 * @param {number} timeout - 可选，最大等待时间（毫秒），默认 5000
 * @returns {Promise<Element>} - 返回匹配的元素
 */
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

async function modalProcessor(isBuy) {
  const orderBookTables = document.querySelectorAll(
    'table[class*="orderBookTable"]'
  );
  const buyOrdersTable = orderBookTables[0];
  const sellOrdersTable = orderBookTables[1];
  // 打开的模态框
  // 如果购买则点第一个按钮，否则点第二个
  if (isBuy) {
    buyOrdersTable.querySelector("button").click();
  } else {
    sellOrdersTable.querySelector("button").click();
  }
  // 等待模态框加载
  await awaitElementLoad(
    '[class*="Modal_modal"] [class*=MarketplacePanel_inputContainer]'
  );
  const btnList = document.querySelectorAll('[class*="Modal_modal"] button');
  // 除2按钮
  const halfBtn = Array.from(btnList).filter((btn) => {
    return btn.textContent.trim() === "÷2";
  })[0];
  // 乘2按钮
  const twiceBtn = Array.from(btnList).filter((btn) => {
    return btn.textContent.trim() === "×2";
  })[0];
  // '全部'按钮
  const BothBtn = Array.from(btnList).filter((btn) => {
    if (btn.textContent.trim() === "全部" || btn.textContent.trim() === "All")
      return true;
  })[0];
  // 发布购买订单的按钮
  const postBtn = document.querySelector(
    '[class*="Modal_modal"] [class*=MarketplacePanel_postButtonContainer] button'
  );
  // 如果系购买则加价，否则减价
  if (isBuy) {
    twiceBtn.click();
    if (postBtn.className.includes("disabled")) {
      halfBtn.click();
    }
  } else {
    halfBtn.click();
    if (postBtn.className.includes("disabled")) {
      twiceBtn.click();
    }
  }
  // 点击所有
  BothBtn.click();
  // 点击发布订单
  postBtn.click();
}
function startTask() {
  // 创建自动化流程的worker
  worker = new Worker(url);
  // 启动任务
  worker.postMessage({ taskName: "doTask", time: 500 });
  worker.addEventListener("message", async function (e) {
    //执行任务,true为购买，false为出售
    try {
      await modalProcessor(true);
      await modalProcessor(false);
    } catch (error) {
      console.log(error);
      throw "在’市场‘才能执行任务！";
    }
    //等待一段时间再继续
    worker.postMessage({
      taskName: "doTask",
      time: 500,
    });
  });
}
function endTask() {
  worker.terminate();
}

// 清空仓库
async function clearStock() {
  // 仓库元素
  try {
    // 查找全部商品
    // 点击第一个
    const stockEle = document.querySelector("[class*=Inventory_items]");
    const filterKeys = [
      "货币",
      "饮料",
      "战利品",
      "Currencies",
      "Drinks",
      "Loots",
    ];
    // 商品的所有分类
    const cateCargo = stockEle.querySelectorAll("[class*=Inventory_itemGrid]");
    // 特定类的商品
    const specificCargos = Array.from(cateCargo).filter((item) => {
      // 过滤掉包含特定种类的商品
      return !filterKeys.includes(
        item.querySelector("[class*=Inventory_category]").textContent.trim()
      );
    });
    if (specificCargos.length === 0) {
      // 终止运行
      return true;
    }
    //第一种允许被卖出的商品
    const cargo = specificCargos[0].querySelector("[class*=Item_clickable]");
    // 打开菜单
    cargo.click();
    // 等待菜单加载
    await awaitElementLoad(
      '[class*="MuiTooltip-tooltip"] [class*=Item_actionMenu]'
    );
    // 点击’去市场‘按钮
    // 等待市场具体可买卖条目加载
    for (const btn of document.querySelector("[class*=Item_actionMenu]")
      .children) {
      if (
        btn.textContent.trim() === "View Marketplace" ||
        btn.textContent.trim() === "前往市场"
      ) {
        btn.click();
      }
    }
    await awaitElementLoad('table[class*="orderBookTable"] tr');
    // 等待一段时间
    await new Promise((res) => {
      setTimeout(() => {
        res();
      }, 500);
    });
    // 卖出商品
    await modalProcessor(false);
  } catch (error) {
    console.log(error);
  }
  // 递归执行
  await clearStock();
}

// 执行按钮
const statusBtn = document.createElement("toggle-button");
statusBtn.slot = "button1";
statusBtn.isDanger = false;
statusBtn._isDanger = statusBtn.isDanger;
Object.defineProperty(statusBtn, "isDanger", {
  get() {
    return this._isDanger;
  },
  set(isDanger) {
    // 开始执行
    if (isDanger) startTask();
    // 结束执行
    if (!isDanger) endTask();
    this._isDanger = isDanger;
  },
});
// 仓库清空按钮
const clearBtn = document.createElement("toggle-button");
clearBtn.slot = "button2";
clearBtn.isDanger = false;
clearBtn.successContent = "清空仓库";
clearBtn.dangerContent = "确认清空";
clearBtn._isDanger = clearBtn.isDanger;
Object.defineProperty(clearBtn, "isDanger", {
  get() {
    return this._isDanger;
  },
  set(isDanger) {
    // 确认清空仓库
    if (!isDanger) {
      clearStock();
    }
    this._isDanger = isDanger;
  },
});
const floatButton = document.createElement("float-button");
floatButton.append(statusBtn, clearBtn);
document.documentElement.append(floatButton);
