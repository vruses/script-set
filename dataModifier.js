// ==UserScript==
// @name        修改订单数据
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://fxg.jinritemai.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 修改订单数据
// ==/UserScript==

(() => {
  // 修改头像
  // 店铺Logo
  const shopLogo =
    "data:image/jpeg;base64,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";
  // 营业照
  const businessLiscenseImg =
    "data:image/jpeg;base64,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";
  // 身份证正面
  const idCardFrontImg =
    "data:image/jpeg;base64,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";
  // 身份证背面
  const idCardBackImg =
    "data:image/jpeg;base64,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";
  window.addEventListener("load", () => {
    Object.defineProperty(
      window["__SSR_CONFIG_ECOM_FXG_ADMIN"].initialData["fxg-admin"].userData
        .user,
      "shop_logo",
      {
        get() {
          return shopLogo;
        },
        set(value) {
          // 可选：你也可以禁止修改或打印设置值
          console.warn("shop_logo 被尝试设置为:", value);
        },
        configurable: true, // 允许后续修改或删除
      }
    );
  });

  // 转化特定格式的字符串
  function parseMoneyToInt(str) {
    // 移除 ¥ 符号、逗号、空格
    let cleaned = str.replace(/[¥,\s]/g, "");
    // 处理负号（可能在 ¥ 前）
    const isNegative = cleaned.startsWith("-");
    cleaned = cleaned.replace("-", "");
    // 拆分整数和小数部分
    let [integerPart, decimalPart = "00"] = cleaned.split(".");
    // 确保小数是两位（不够补 0）
    decimalPart = (decimalPart + "00").slice(0, 2);
    const result = parseInt(integerPart + decimalPart, 10);
    return isNegative ? -result : result;
  }
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
        // 资质照接口
        if (
          xhr._interceptUrl.includes(
            "https://fxg.jinritemai.com/center/qualification/subject/info"
          )
        ) {
          const resJson = JSON.parse(xhr.responseText);
          Object.defineProperty(xhr, "responseText", {
            get: function () {
              try {
                // 营业照
                resJson.data.subject_qual_info.company_info.license_img[0].url =
                  businessLiscenseImg;
                // 身份证正面
                resJson.data.subject_qual_info.legal_person_info.identity_img[0].url =
                  idCardFrontImg;
                // 身份证背面
                resJson.data.subject_qual_info.legal_person_info.identity_img[1].url =
                  idCardBackImg;
              } catch (error) {
                console.log(error);
              }
              return JSON.stringify(resJson);
            },
          });
        }
        // 汇总请求接口
        if (
          xhr._interceptUrl.includes("/bill_center/domestic/shop/query_item")
        ) {
          // 是否为月汇总请求携带的特定参数
          if (JSON.parse(body).query_type === "SHOP_SETTLE_BILLS") {
            const resJson = JSON.parse(xhr.responseText);
            Object.defineProperty(xhr, "responseText", {
              get: function () {
                // 如果storage里已经存有数据
                let customData = storage.get("monthBill", []);
                if (customData.length) {
                  // 如果后端返回的数据不为空
                  if (resJson.total) {
                    customData.forEach((item, index) => {
                      // 自定义数据条目修改超过后端返回的条目
                      if (index >= resJson.total) return;
                      // 需要进行字符与数字换算,注意每份data是字符串需parse
                      // 结算月份
                      try {
                        const bill = JSON.parse(resJson.data[index]);
                        bill.bill_time = item.billTime;
                        // 总比数
                        bill.sum_settled_count = JSON.parse(
                          item.sumSettledCount
                        );
                        // 总金额
                        bill.sum_shop_net_earning = parseMoneyToInt(
                          item.sumShopNetEarning
                        );
                        // 收入金额
                        bill.sum_settled_income_amount = parseMoneyToInt(
                          item.sumSettledIncomeAmount
                        );
                        // 支出金额
                        bill.sum_settled_outcome_amount = parseMoneyToInt(
                          item.sumSettledOutcomeAmount
                        );
                        // 还原成字符串
                        resJson.data[index] = JSON.stringify(bill);
                      } catch (error) {
                        console.warn("某条目输入不合规范！");
                      }
                    });
                  }
                }
                return JSON.stringify(resJson);
              },
            });
          }
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

  async function tableMounted() {
    return await new Promise((res) => {
      setTimeout(res, 500);
    })
      .then(() => {
        // 等待表格数据加载
        document
          .querySelector('[id*="X-TABLE-fxg-bill"][id*="month"]')
          .querySelectorAll("[data-row-key]")[1]
          .querySelector("td");
      })
      .catch(() => {
        return tableMounted();
      });
  }
  // 查询table并获取数据
  function queryData(target) {
    // 获取包含非表头行的数据的元素
    let dataEl = target.querySelectorAll("[data-row-key]");
    let dataList = [];
    for (const el of dataEl) {
      const [
        billTime,
        sumSettledCount,
        sumShopNetEarning,
        sumSettledIncomeAmount,
        sumSettledOutcomeAmount,
        // 去掉首尾非数据的表列
      ] = Array.from(el.children)
        .slice(1, -1)
        .map((value) => {
          return value.textContent;
        });
      const data = {
        billTime,
        sumSettledCount,
        sumShopNetEarning,
        sumSettledIncomeAmount,
        sumSettledOutcomeAmount,
      };
      dataList.push(data);
    }
    return dataList;
  }

  async function main() {
    // 等待月汇总表格加载完成
    await tableMounted();
    // 获取table元素
    const table = document.querySelector(
      '[id*="X-TABLE-fxg-bill"][id*="month"]'
    );
    table.contentEditable = "true";
    table.addEventListener("input", function () {
      // 获取数据
      const data = queryData(this);
      // 本地存储数据
      storage.set("monthBill", data);
    });
  }
  main();
})();
