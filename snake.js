// ==UserScript==
// @name        贪吃蛇自动得分
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://kinetic.xyz/play*
// @grant       none
// @version     1.0
// run-at       document-start
// @description 5/19/2025, 10:26:43 AM
// ==/UserScript==
const dEvent = new KeyboardEvent("keydown", {
  key: "d",
  code: "KeyD",
  keyCode: 68, // 可选，部分老浏览器使用
  charCode: 0, // 可选
  bubbles: true, // 事件可以冒泡
  cancelable: true, // 事件可以取消
});
const spaceEvent = new KeyboardEvent("keydown", {
  key: " ",
  code: "Space",
  keyCode: 32, // 空格键的 keyCode
  bubbles: true,
  cancelable: true,
});

const rEvent = new KeyboardEvent("keydown", {
  key: "r",
  code: "KeyR",
  keyCode: 82, // 'r' 的 keyCode
  bubbles: true,
  cancelable: true,
});

const originalCall = Function.prototype.call;
// 蛇身不能触碰食物
Function.prototype.call = function (...args) {
  if (this.name === "77935") {
    let temp = this.toString();
    temp.indexOf(`while(p.current.has("".concat(e,":").concat(r)));`);
    // 初始-50是因为默认会加执行三次，游戏开始food位置正好为10
    temp = temp.replace(
      `while(p.current.has("".concat(e,":").concat(r)));`,
      (res) =>
        res +
        `window.yCoord=window.yCoord!==undefined?window.yCoord:-50;
        window.yCoord+=20;
        console.log(window.yCoord)
        `
    );
    temp = temp.replace(
      `g.current={row:e,col:r}}`,
      `g.current={row:0,col:window.yCoord}}`
    );
    temp = eval("(" + temp + ")");
    return originalCall.apply(temp, args);
  }
  return originalCall.apply(this, args);
};

function getButton(textContent) {
  return Array.from(document.querySelectorAll("button")).filter((res) => {
    return res.textContent.includes(textContent);
  })[0];
}
window.addEventListener("load", () => {
  setInterval(() => {
    let startBtn = getButton("Start");
    let stopBtn = getButton("Stop");
    let resetBtn = getButton("Reset");
    document.dispatchEvent(dEvent);
    if (startBtn.disabled) {
      // 没办法，tailwindCss类名太多，根本不好判断按钮状态
      if (stopBtn.classList.length !== resetBtn.classList.length) {
        // 游戏结束
        // 初始化food
        window.yCoord = 10;
        setTimeout(() => {
          document.dispatchEvent(rEvent);
          setTimeout(() => {
            document.dispatchEvent(spaceEvent);
          }, 500);
        }, 500);
      }
    }
  }, 1000);
});
