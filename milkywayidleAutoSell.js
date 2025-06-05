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
        <slot name="button">Widget Missing</slot>
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
      this.button.textContent = "结束执行";
    } else {
      this.button.classList.remove("danger");
      this.button.textContent = "开始执行";
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
  // 包含价格和数量调整的输入元素
  // while (
  //   document.querySelectorAll(
  //     '[class*="Modal_modal"] [class*=MarketplacePanel_inputContainer]'
  //   )
  // ) {
  //   break;
  // }
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

// 状态按钮
const statusBtn = document.createElement("toggle-button");
statusBtn.slot = "button";
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
const floatButton = document.createElement("float-button");
floatButton.append(statusBtn);
document.documentElement.append(floatButton);
