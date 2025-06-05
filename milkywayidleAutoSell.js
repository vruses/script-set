// ==UserScript==
// @name        银河奶牛放置自动买卖
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://www.milkywayidle.com/game*
// @grant       none
// @version     1.0
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

async function modalShow() {
  return await new Promise((res) => {
    setTimeout(res, 50);
  })
    .then(() => {
      // 等待弹窗加载
      document.querySelectorAll(
        '[class*="Modal_modal"] [class*=MarketplacePanel_inputContainer]'
      )[0];
    })
    .catch(() => {
      console.log("弹窗加载中。。。");
      return modalShow();
    });
}
async function toolTipShow() {
  return await new Promise((res) => {
    setTimeout(res, 50);
  })
    .then(() => {
      // 等待提示框加载
      document.querySelectorAll(
        '[class*="MuiTooltip-tooltip"] [class*=Item_actionMenu]'
      )[0];
    })
    .catch(() => {
      console.log("提示框加载中。。。");
      return modalShow();
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
  await modalShow();
  const inputList = document.querySelectorAll(
    '[class*="Modal_modal"] [class*=MarketplacePanel_inputContainer]'
  );
  // 除2按钮
  const halfBtn = Array.from(inputList[0].querySelectorAll("button")).at(0);
  // 乘2按钮
  const twiceBtn = Array.from(inputList[0].querySelectorAll("button")).at(-1);
  // '全部'按钮
  const BothBtn = Array.from(inputList[1].querySelectorAll("button")).at(-1);
  // 发布购买订单的按钮
  const postBtn = document.querySelector(
    '[class*="Modal_modal"] [class*=MarketplacePanel_postButtonContainer] button'
  );
  // 如果系购买则加价，否则减价
  if (isBuy) {
    twiceBtn.click();
  } else {
    halfBtn.click();
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
      alert("在’市场‘才能执行任务！");
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
  const ele = document.querySelector("[class*=Inventory_items]");
  try {
    for (const item of ele.querySelectorAll("[class*=Item_clickable]")) {
      item.click();
      await toolTipShow();
      const firstTip = document.querySelector(
        '[class*="MuiTooltip-tooltip"] [class*=Item_amountInputContainer]'
      );
      // 如果不可售卖则跳过
      if (!firstTip) {
        // 再次点击物品跳过
        continue;
      }
      // '全部'按钮
      const bothBtn = Array.from(firstTip.querySelectorAll("button")).at(-1);
      const sellBtn = document.querySelector("[class*=Button_sell]");
      bothBtn.click();
      sellBtn.click();
      // 等待一会才能清空
      setTimeout(() => {
        sellBtn.click();
      }, 1000);
    }
  } catch (error) {
    console.log(error);
    alert("此页无库存商品!");
  }
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
    console.log("isDanger:" + isDanger);
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
