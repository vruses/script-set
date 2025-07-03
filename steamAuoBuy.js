// ==UserScript==
// @name         Steam Auto Purchase Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Steam market auto purchase helper
// @author       Your name
// @match        *://steamcommunity.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // 状态管理
  const STATE_KEY = "steamAutoPurchaseState";
  const SETTINGS_KEY = "steamAutoPurchaseSettings";

  // 获取保存的状态
  function loadState() {
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      isRunning = state.isRunning;
      currentConfigIndex = state.currentConfigIndex || 0;
      currentConfigs = state.currentConfigs || [];
    }
  }

  // 保存状态
  function saveState() {
    const state = {
      isRunning,
      currentConfigIndex,
      currentConfigs,
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  // 保存设置
  function saveSettings() {
    const configs = [];
    const rows = document.querySelectorAll("#config-tbody tr");

    rows.forEach((row) => {
      configs.push({
        url: row.querySelector(".url-input").value,
        price: parseFloat(row.querySelector(".price").value),
      });
    });

    const settings = {
      configs,
      exchangeRate: parseFloat(document.getElementById("exchange-rate").value),
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // 获取保存的设置
  function loadSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);

      // 清空现有行
      const tbody = document.getElementById("config-tbody");
      tbody.innerHTML = "";

      // 添加保存的配置
      if (settings.configs && settings.configs.length > 0) {
        settings.configs.forEach((config) => {
          addConfigRow(config);
        });
      } else {
        // 添加一个默认行
        addConfigRow({
          url: "",
          price: 0.22,
        });
      }

      // 设置汇率
      if (settings.exchangeRate) {
        document.getElementById("exchange-rate").value = settings.exchangeRate;
      }

      return settings;
    }

    // 如果没有保存的设置，添加一个默认行
    addConfigRow({
      url: "",
      price: 0.22,
    });

    return null;
  }

  // 添加Steam风格的CSS
  GM_addStyle(`
        .auto-purchase-panel {
            position: fixed;
            top: 50px;
            left: 20px;
            background: linear-gradient(to bottom, #2a475e, #1b2838);
            border: 1px solid #4b6b8d;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            padding: 20px;
            color: #c6d4df;
            font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
            z-index: 9999;
            border-radius: 3px;
            transition: transform 0.3s ease;
        }

        .auto-purchase-panel.hidden {
            transform: translateX(-820px);
        }

        .toggle-panel-button {
            position: fixed;
            top: 50px;
            left: 20px;
            background: linear-gradient(to bottom, #2a475e, #1b2838);
            border: 1px solid #4b6b8d;
            color: #c6d4df;
            padding: 8px 12px;
            cursor: pointer;
            z-index: 10000;
            border-radius: 3px;
            display: none;
        }

        .toggle-panel-button.visible {
            display: block;
        }

        .hide-panel-button {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: #c6d4df;
            cursor: pointer;
            font-size: 16px;
            padding: 5px;
        }

        .hide-panel-button:hover {
            color: #66c0f4;
        }

        .auto-purchase-panel textarea {
            background: #1a2634;
            border: 1px solid #4b6b8d;
            color: #fff;
            padding: 8px;
            margin: 8px 0;
            width: 100%;
            min-height: 100px;
            resize: vertical;
            font-family: Consolas, monospace;
            font-size: 13px;
            line-height: 1.4;
        }
        .auto-purchase-panel input {
            background: #1a2634;
            border: 1px solid #4b6b8d;
            color: #fff;
            width: 100%;
            height: 32px;
            border-radius: 2px;
            font-size: 13px;
            transition: border-color 0.2s;
        }
        .auto-purchase-panel input:focus,
        .auto-purchase-panel textarea:focus {
            border-color: #66c0f4;
            outline: none;
            box-shadow: 0 0 3px #66c0f4;
        }
        .auto-purchase-panel label {
            display: block;
            margin-top: 12px;
            color: #66c0f4;
            font-size: 14px;
            font-weight: 500;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
        }
        .auto-purchase-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 3px;
        }
        .auto-purchase-row > div {
            flex: 1;
        }
        .auto-purchase-button {
            background: linear-gradient(to right, #47bfff 0%, #1a44c2 100%);
            border: none;
            color: white;
            padding: 12px;
            margin-top: 10px;
            cursor: pointer;
            width: 100%;
            border-radius: 2px;
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.2s;
            text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
        }
        .auto-purchase-button:hover {
            background: linear-gradient(to right, #1a44c2 0%, #47bfff 100%);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .auto-purchase-button:active {
            transform: translateY(1px);
        }
        .input-group {
            margin-right: 3px;
        }
        ::placeholder {
            color: #4b6b8d;
        }
        .config-table {
            width: 100%;
            max-height: 300px;
            overflow-y: auto;
            overflow-x: hidden;
            margin-bottom: 10px;
            scrollbar-width: thin;
            scrollbar-color: #4b6b8d #1a2634;
        }

        .config-table::-webkit-scrollbar {
            width: 8px;
        }

        .config-table::-webkit-scrollbar-track {
            background: #1a2634;
            border-radius: 4px;
        }

        .config-table::-webkit-scrollbar-thumb {
            background: #4b6b8d;
            border-radius: 4px;
        }

        .config-table::-webkit-scrollbar-thumb:hover {
            background: #66c0f4;
        }

        .config-table thead {
            position: sticky;
            top: 0;
            background: #1b2838;
            z-index: 1;
        }

        .config-table th {
            padding: 8px;
            text-align: left;
            white-space: nowrap;
            border-bottom: 1px solid #4b6b8d;
        }

        .config-table td {
            padding: 4px 8px;
            white-space: nowrap;
        }

        .config-table input {
            width: 100%;
            height: 24px;
            padding: 4px;
            font-size: 12px;
        }

        .config-table .url-input {
            width: 400px !important;
        }

        .config-table .price {
            width: 80px !important;
        }

        .delete-row {
            background: #c22;
            color: white;
            border: none;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 2px;
        }

        .add-row-button {
            background: #47bfff;
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            width: 100%;
            border-radius: 2px;
            margin-top: 10px;
        }

        .global-settings {
            margin: 20px 0;
            padding-top: 20px;
            border-top: 1px solid #4b6b8d;
        }

        .toggle-visibility-button {
            position: absolute;
            top: 10px;
            left: 10px;
            background: none;
            border: none;
            color: #c6d4df;
            cursor: pointer;
            font-size: 16px;
            padding: 5px;
            z-index: 10001;
        }

        .toggle-visibility-button:hover {
            color: #66c0f4;
        }
    `);

  let isRunning = false;
  let currentConfigIndex = 0;
  let currentConfigs = [];

  // 页面加载完成后的初始化
  window.addEventListener("load", function () {
    // 加载保存的状态
    loadState();

    // 创建并添加面板和显示按钮
    document.body.appendChild(panel);
    document.body.appendChild(toggleButton);

    // 加载保存的设置
    loadSettings();

    // 更新按钮状态
    const button = document.getElementById("start-button");
    if (isRunning) {
      button.textContent = "关闭";
      button.style.background = "linear-gradient(to right, #c22 0%, #911 100%)";
    }

    // 恢复面板状态
    const panelVisible = localStorage.getItem("panelVisible") !== "false";
    if (!panelVisible) {
      panel.classList.add("hidden");
      toggleButton.classList.add("visible");
    }

    log("插件面板已加载");

    // 如果正在运行且有配置，继续处理
    if (isRunning && currentConfigs.length > 0) {
      const currentConfig = currentConfigs[currentConfigIndex];
      processPage(
        currentConfig,
        parseFloat(document.getElementById("exchange-rate").value)
      );
    }
  });

  // 添加自动保存功能
  function setupAutoSave() {
    // 监听所有输入框的变化
    const panel = document.querySelector(".auto-purchase-panel");

    // 使用事件委托来处理所有输入框的变化
    panel.addEventListener("change", (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        saveSettings();
      }
    });

    // 监听输入框的值变化（用于处理粘贴等操作）
    panel.addEventListener("input", (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        saveSettings();
      }
    });
  }

  // 在页面加载完成后设置自动保存
  window.addEventListener("load", setupAutoSave);

  // 添加按钮点击事件
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "start-button") {
      const button = e.target;
      const exchangeRate = parseFloat(
        document.getElementById("exchange-rate").value
      );

      // 获取所有配置
      const configs = [];
      const rows = document.querySelectorAll("#config-tbody tr");

      rows.forEach((row) => {
        const url = row.querySelector(".url-input").value;
        const price = parseFloat(row.querySelector(".price").value);

        if (url && !isNaN(price)) {
          configs.push({ url, price });
        }
      });

      // 验证输入
      if (configs.length === 0 || isNaN(exchangeRate)) {
        log("错误：请填写所有必要信息");
        alert("请填写所有必要信息");
        return;
      }

      if (!isRunning) {
        // 开始运行
        isRunning = true;
        button.textContent = "关闭";
        button.style.background =
          "linear-gradient(to right, #c22 0%, #911 100%)";
        log("开始运行自动购买");

        // 保存设置
        saveSettings();

        try {
          startAutoPurchase(configs, exchangeRate);
        } catch (error) {
          log("错误：" + error.message);
          console.error("自动购买过程出错:", error);
        }
      } else {
        // 停止运行
        isRunning = false;
        button.textContent = "启动";
        button.style.background =
          "linear-gradient(to right, #47bfff 0%, #1a44c2 100%)";
        log("已停止自动购买");
      }
      saveState();
    }
  });

  // 主要处理逻辑
  async function startAutoPurchase(configs, exchangeRate) {
    log("开始自动购买流程");
    currentConfigs = configs;
    currentConfigIndex = 0;

    // 保存状态
    saveState();

    log(`共找到 ${configs.length} 个配置待处理`);

    if (configs.length > 0) {
      const currentConfig = configs[currentConfigIndex];
      // 如果当前页面不是目标URL，则跳转
      if (window.location.href !== currentConfig.url) {
        log("跳转到目标URL");
        window.location.href = currentConfig.url;
      } else {
        log("当前页面即为目标URL，开始处理");
        await processPage(currentConfig, exchangeRate);
      }
    } else {
      log("没有找到有效的配置");
    }
  }

  // 在页面跳转前保存状态
  window.addEventListener("beforeunload", function () {
    if (isRunning) {
      saveState();
    }
  });

  // 创建面板HTML
  const panel = document.createElement("div");
  panel.className = "auto-purchase-panel";
  panel.innerHTML = `
        <button class="toggle-visibility-button">≡</button>
        <button class="hide-panel-button">✕</button>
        <div class="config-table">
            <table id="config-table">
                <thead>
                    <tr>
                        <th>URL地址</th>
                        <th>金额</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="config-tbody">
                    <tr>
                        <td><input type="text" class="url-input" placeholder="输入Steam市场URL"></td>
                        <td><input type="number" class="price" step="0.01" placeholder="购买金额"></td>
                        <td><button class="delete-row">删除</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <button class="add-row-button" id="add-row">新增配置</button>

        <div class="global-settings">
            <div class="input-group">
                <label>汇率</label>
                <input type="number" id="exchange-rate" step="0.01" placeholder="当前汇率" value="7.3">
            </div>
        </div>

        <button class="auto-purchase-button" id="start-button">启动</button>
        <div id="log-container" style="margin-top: 10px; max-height: 150px; overflow-y: auto; color: #66c0f4; font-size: 12px;"></div>
    `;

  // 添加日志功能
  function log(message) {
    const logContainer = document.getElementById("log-container");
    if (logContainer) {
      const time = new Date().toLocaleTimeString();
      const logMessage = `[${time}] ${message}`;
      console.log(logMessage); // 同时在控制台输出
      logContainer.innerHTML = logMessage + "<br>" + logContainer.innerHTML;
    }
  }

  // 检查价格是否在预算范围内
  function isPriceInRange(priceStr, maxPrice, exchangeRate) {
    // 更新价格计算逻辑
    const price = parseFloat(
      (parseFloat(priceStr.split("€")[0]) * exchangeRate).toFixed(3)
    );
    return price <= maxPrice;
  }

  // 处理单个页面的商品
  async function processPage(config, exchangeRate) {
    log("开始处理当前页面...");
    log(`当前配置: 价格 ${config.price}`);

    // 等待页面加载完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const table = document.querySelector(
      "#market_commodity_forsale_table table"
    );
    if (!table) {
      log("未找到商品列表，准备处理下一个配置");

      // 检查是否还有下一个配置
      if (isRunning && currentConfigIndex < currentConfigs.length - 1) {
        currentConfigIndex++;
        log(
          `跳转到下一个配置 (${currentConfigIndex + 1}/${
            currentConfigs.length
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        window.location.href = currentConfigs[currentConfigIndex].url;
      } else if (isRunning) {
        log("所有配置处理完成，重新从第一个配置开始");
        currentConfigIndex = 0;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        window.location.href = currentConfigs[currentConfigIndex].url;
      }
      return;
    }

    const priceElement = document.querySelector(
      "#market_commodity_forsale"
    ).lastChild;
    if (priceElement) {
      // 获取价格
      const priceStr = priceElement.textContent.trim();
      log(`检查商品价格: ${priceStr}`);
      // 检查价格是否在预算范围内
      if (!isPriceInRange(priceStr, config.price, exchangeRate)) {
        log(`价格 ${priceStr} 超出预算范围，跳过`);
      } else {
        if (!isRunning) {
          log("检测到停止信号，终止处理");
          return;
        }

        log("找到符合条件的商品，尝试购买");

        // 找到购买按钮并点击
        // 注意第一个buy_button为买第二个为卖
        const buyButton = document.querySelector(
          ".market_commodity_buy_button"
        );
        if (buyButton) {
          buyButton.click();
          log("已点击购买按钮，等待弹窗...");

          // 等待购买弹窗出现
          await new Promise((resolve) => {
            const checkDialog = setInterval(() => {
              const checkbox = document.getElementById(
                "market_buyorder_dialog_accept_ssa"
              );
              if (checkbox) {
                clearInterval(checkDialog);
                resolve();
              }
            }, 500);
          });

          // 检查并选中同意选择框
          const checkbox = document.getElementById(
            "market_buyorder_dialog_accept_ssa"
          );
          if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            log("已选中同意选择框");
          }

          // 点击购买按钮
          const purchaseButton = document.getElementById(
            "market_buyorder_dialog_purchase"
          );
          if (purchaseButton) {
            purchaseButton.click();
            log("已点击确认购买按钮，等待结果...");

            // 等待可能的错误信息
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const errorText = document.getElementById(
              "market_buyorder_dialog_error_text"
            );
            if (
              errorText &&
              errorText.textContent.includes("您不能购买此物品")
            ) {
              log("检测到购买限制错误，取消购买");
              const cancelButton = document.getElementById(
                "market_buyorder_dialog_cancel"
              );
              if (cancelButton) {
                cancelButton.click();
              }
              // 移除多余逻辑，刷新页面无法进行一些操作
              location.reload();
            } else {
              // 等待查看库存按钮出现（表明购买成功）
              await new Promise((resolve) => {
                const checkSuccess = setInterval(() => {
                  const viewInventoryButton = document.getElementById(
                    "market_buyorder_dialog_viewinventory"
                  );
                  if (viewInventoryButton) {
                    clearInterval(checkSuccess);
                    resolve();
                  }
                }, 500);
              });
              // 等待1min，如果购买不成功则跳转到求购
              log("等待一分钟");
              await new Promise((resolve) => setTimeout(resolve, 6 * 1e4));
              // 点击关闭按钮
              const closeButton = document.getElementById(
                "market_buyorder_dialog_close"
              );
              if (closeButton) {
                closeButton.click();
                log("购买成功，已关闭弹窗");
              }
            }
          }
        }
      }
    }

    // 处理完当前页面后，检查是否还有下一个配置
    if (isRunning && currentConfigIndex < currentConfigs.length - 1) {
      currentConfigIndex++;
      log(
        `准备跳转到下一个配置 (${currentConfigIndex + 1}/${
          currentConfigs.length
        })`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      window.location.href = currentConfigs[currentConfigIndex].url;
    } else if (isRunning) {
      log("所有配置处理完成，重新从第一个配置开始");
      currentConfigIndex = 0;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      window.location.href = currentConfigs[currentConfigIndex].url;
    } else {
      log("检测到停止信号，终止处理");
    }
  }

  // 添加配置行
  function addConfigRow(config = {}) {
    const tbody = document.getElementById("config-tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
            <td><input type="text" class="url-input" placeholder="输入Steam市场URL" value="${
              config.url || ""
            }"></td>
            <td><input type="number" class="price" step="0.01" placeholder="购买金额" value="${
              config.price || ""
            }"></td>
            <td><button class="delete-row">删除</button></td>
        `;
    tbody.appendChild(row);
  }

  // 添加事件监听
  document.addEventListener("click", function (e) {
    if (e.target.id === "add-row") {
      addConfigRow();
      saveSettings(); // 新增行后保存配置
    } else if (e.target.classList.contains("delete-row")) {
      const tbody = document.getElementById("config-tbody");
      if (tbody.children.length > 1) {
        e.target.closest("tr").remove();
        saveSettings(); // 删除行后保存配置
      }
    } else if (
      e.target.classList.contains("toggle-visibility-button") ||
      e.target.classList.contains("hide-panel-button") ||
      e.target.classList.contains("toggle-panel-button")
    ) {
      // 统一处理显示/隐藏逻辑
      if (panel.classList.contains("hidden")) {
        // 显示面板
        panel.classList.remove("hidden");
        toggleButton.classList.remove("visible");
      } else {
        // 隐藏面板
        panel.classList.add("hidden");
        toggleButton.classList.add("visible");
      }
      // 保存状态
      localStorage.setItem("panelVisible", !panel.classList.contains("hidden"));
    }
  });

  // 创建显示按钮
  const toggleButton = document.createElement("button");
  toggleButton.className = "toggle-panel-button";
  toggleButton.textContent = "显示配置面板";

  // 在页面加载时添加显示按钮
  window.addEventListener("load", function () {
    document.body.appendChild(toggleButton);
  });

  // 在页面加载时恢复面板状态
  window.addEventListener("load", function () {
    const panelVisible = localStorage.getItem("panelVisible") !== "false";
    if (!panelVisible) {
      panel.classList.add("hidden");
      toggleButton.classList.add("visible");
    }
  });
})();
