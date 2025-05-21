// ==UserScript==
// @name        boss招聘自动打招呼
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://rd6.zhaopin.com/app/recommend*
// @grant       none
// @run-at      document-start
// @version     1.0
// @description boss招聘自动打招呼
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
        background:rgba(66, 110, 255, 0.65);
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
        background: #426eff;
        transform: scale(1.1);
      }
      .panel {
        position: absolute;
        display: flex;
        right: 50px;
        top: 0;
        gap: 9px;
        justify-content: center;
 
        flex-wrap: wrap;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        width: 220px;
        padding: 10px;
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
        <slot name="input">Widget Missing</slot>
        </div>
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
customElements.define("float-button", FloatButton);
/**
 * @extends {HTMLElement}
 */
class InputNumber extends HTMLElement {
  #minus;
  #input;
  #plus;
  constructor() {
    super();
    this.min = 0.1;
    this.max = 300;
    this.step = 0.1;
    this.value = 1;

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
    this.#input.value = this.value;
    this.updateButtonState();

    // 绑定事件
    this.#minus.addEventListener("click", () => this.changeValue(-this.step));
    this.#plus.addEventListener("click", () => this.changeValue(this.step));
    this.#input.addEventListener("change", () => this.validateInput());
    this.#input.addEventListener("keydown", (e) => this.handleKeydown(e));
  }
  changeValue(delta) {
    // 避免浮点运算不准确
    const newValue = (this.value * 10 + delta * 10) / 10;
    this.value = Math.max(this.min, Math.min(this.max, newValue));
    console.log(this.value);
    this.#input.value = Number.isInteger(this.value)
      ? this.value
      : this.value.toFixed(1);
    this.updateButtonState();
  }
  validateInput() {
    let value = parseFloat(this.#input.value);
    if (isNaN(value)) {
      value = this.min;
    }
    this.value = Math.max(this.min, Math.min(this.max, value));
    this.#input.value = Number.isInteger(this.value)
      ? this.value
      : this.value.toFixed(1);
    // GM_setValue("redirectInterval", this.#input.value);
    this.updateButtonState();
  }
  updateButtonState() {
    this.#minus.disabled = this.value <= this.min;
    this.#plus.disabled = this.value >= this.max;
  }
  handleKeydown(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.changeValue(this.step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.changeValue(-this.step);
    }
  }
}
customElements.define("input-number", InputNumber);
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
            background-color: #557dff; 
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          button.danger {
            background-color: #dc3545; 
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
// 本地存储
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
// 防抖
function debounce(func, delay, isImmediate) {
  var timeout;
  function debounced() {
    clearTimeout(timeout);
    if (isImmediate && utils.isNothing(timeout)) {
      func();
    }
    timeout = setTimeout(func, delay || 100);
  }
  debounced.clearNext = function () {
    clearTimeout(timeout);
  };
  return debounced;
}
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
let greetingWorker;
let candidatesIterator;
let greetingTime = storage.get("GreetingTime", 5000);
let maxHandle = storage.get("MaxHandle", 100);

// 检测到加载完成后开始任务
// startTask生命周期：
// 创建worker；添加监听器；初始化候选人列表；发送启动信息；一轮循环结束后等待Candidates更新和接受启动信息
// 在发送n次后调用endTask结束任务
// 因为更新候选人可能需要等待网络请求（也有可能没有），所以需要别的手段重新启动(比如监听scroll事件等等，这里根据watch:range变量做防抖)
// 结束任务endTask：销毁worker，事件自动解绑
function startTask() {
  // 创建打招呼的worker
  greetingWorker = new Worker(url);
  // 记录需要打招呼的次数
  let taskCounter = maxHandle;
  candidatesIterator = getNeverChatCd()[Symbol.iterator]();
  // 启动任务
  greetingWorker.postMessage({ taskName: "handleCdClick", time: greetingTime });
  greetingWorker.addEventListener("message", function (e) {
    // 打招呼执行流程
    let next = candidatesIterator.next();
    if (next.done) {
      // 获取新的候选人
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth", // 平滑滚动，可选 'auto' 或 'smooth'
      });
      //await 获取新的列表
      return;
    }
    taskCounter--;
    // 打招呼
    getChatBtn(next.value).click();
    // console.log(taskCounter);
    // 如果达到了打招呼的次数
    if (!taskCounter) {
      endTask();
    }
    //继续给下一个候选人打招呼
    greetingWorker.postMessage({
      taskName: "handleCdClick",
      time: greetingTime,
    });
  });
}
// 结束打招呼任务
function endTask() {
  greetingWorker.terminate();
}
// 列表加载完成，监听range，因为range改变是在网络请求之后的,只要range变了就可以打招呼了
const loopInit = function () {
  console.log('脚本初始化中。。。')
  return new Promise((res, rej) => {
    setTimeout(res, 1000);
  })
    .then(() => {
      const debounceMsg = debounce(() => {
        // 更新候选人列表
        candidatesIterator = getNeverChatCd()[Symbol.iterator]();
        //通知worker继续工作
        greetingWorker.postMessage({
          taskName: "handleCdChange",
          time: greetingTime,
        });
      }, 3000);
      // 当前所有候选人
      document
        .querySelector(".recommend-list")
        .children[0].__vue__.$watch("range", (newValue, oldValue) => {
          console.log("下一次打招呼");
          debounceMsg();
        });
    })
    .catch((e) => {
      console.log(e);
      loopInit();
    });
};
loopInit();

// 过滤出未聊过的候选人
function getNeverChatCd() {
  return Array.from(document.querySelectorAll(".double-virtual-item")).filter(
    (item) => {
      return !item.__vue__.everChat;
    }
  );
}
// 筛选到候选人卡片上的聊天按钮
function getChatBtn(cardEle) {
  return Array.from(cardEle.querySelectorAll("button")).find((res) => {
    return res.textContent.includes("打招呼");
  });
}

// 在修改间隔后进行存储
// 打招呼间隔
const greetingInput = document.createElement("input-number");
greetingInput.value = greetingTime / 1000;
greetingInput._value = greetingInput.value;
Object.defineProperty(greetingInput, "value", {
  get() {
    return this._value;
  },
  set(value) {
    console.log("greeting:" + value);
    greetingTime = value * 1000;
    storage.set("GreetingTime", value * 1000);
    this._value = value;
  },
});
// 单次处理次数
const maxHandleInput = document.createElement("input-number");
maxHandleInput.value = maxHandle;
maxHandleInput.step = 1;
maxHandleInput.max = 1000;
maxHandleInput._value = maxHandleInput.value;
Object.defineProperty(maxHandleInput, "value", {
  get() {
    return this._value;
  },
  set(value) {
    console.log("maxHandle:" + value);
    maxHandle = value;
    storage.set("MaxHandle", value);
    this._value = value;
  },
});
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
// input插槽
const greetingSlot = document.createElement("div");
greetingSlot.style.display = "flex";
greetingSlot.style.alignItems = "center";
greetingSlot.style.margin = "2px";
greetingSlot.innerHTML = `<span style="width: 85px">打招呼间隔：</span>`;

const maxHandleSlot = document.createElement("div");
maxHandleSlot.style.display = "flex";
maxHandleSlot.style.alignItems = "center";
maxHandleSlot.style.margin = "2px";
maxHandleSlot.innerHTML = `<span style="width: 85px">单次处理数：</span>`;
// button插槽
greetingSlot.append(greetingInput);
maxHandleSlot.append(maxHandleInput);
const parent = document.createElement("div");
parent.slot = "input";
parent.style.display = "flex";
parent.style.flexDirection = "column"; // 如果你想让它们上下排列
parent.style.rowGap = "2px"; // 设置子元素间的间隔为2px
parent.style.padding = "2px";
const floatButton = document.createElement("float-button");
parent.append(greetingSlot, maxHandleSlot);
floatButton.append(parent, statusBtn);
document.documentElement.append(floatButton);
