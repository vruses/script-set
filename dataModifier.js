// ==UserScript==
// @name        修改店铺数据
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://fxg.jinritemai.com/*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 修改店铺数据
// ==/UserScript==

(() => {
  // 修改头像
  // 店铺Logo
  const shopLogo = "";
  // 营业照
  const businessLiscenseImg = "";
  // 身份证正面
  const idCardFrontImg = "";
  // 身份证背面
  const idCardBackImg = "";
  window.addEventListener("load", () => {
    Object.defineProperty(
      window["__SSR_CONFIG_ECOM_FXG_ADMIN"].initialData["fxg-admin"].userData
        .user,
      "shop_logo",
      {
        get() {
          return shopLogo;
        },
      }
    );
    let _shop_name =
      window["__SSR_CONFIG_ECOM_FXG_ADMIN"].initialData["fxg-admin"].userData
        .user.shop_name;
    let _toutiao_id =
      window["__SSR_CONFIG_ECOM_FXG_ADMIN"].initialData["fxg-admin"].userData
        .user.toutiao_id;
    Object.defineProperty(
      window["__SSR_CONFIG_ECOM_FXG_ADMIN"].initialData["fxg-admin"].userData
        .user,
      "shop_name",
      {
        get() {
          if (storage.get("shopInfo")) {
            return storage.get("shopInfo").shop_name;
          } else {
            return _shop_name;
          }
        },
      }
    );
    Object.defineProperty(
      window["__SSR_CONFIG_ECOM_FXG_ADMIN"].initialData["fxg-admin"].userData
        .user,
      "toutiao_id",
      {
        get() {
          if (storage.get("shopInfo")) {
            return storage.get("shopInfo").toutiao_id;
          } else {
            return _toutiao_id;
          }
        },
      }
    );
  });
  /**
   * 等待某个指定的 DOM 元素加载完成（即出现在页面中）
   * @function
   * @param {string} selector - 要等待的 DOM 元素的 CSS 选择器。
   * @param {number} [timeout=5000] - 最大等待时间（以毫秒为单位），默认值为 5000 毫秒。
   * @param {number} [interval=100] - 轮询检测间隔（以毫秒为单位），默认值为 100 毫秒。
   * @returns {Promise<Element>} 返回一个 Promise，在元素出现在页面中时解析为该元素；如果超时则拒绝。
   *
   * @throws {Error} 如果在指定的超时时间内未找到元素，则会抛出错误。
   */
  async function awaitElementLoad(selector, timeout = 5000, interval = 100) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        try {
          const element = document.querySelector(selector);
          // console.log(selector);
          // console.log(document.querySelector(selector));
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
        //店铺信息接口
        if (
          xhr._interceptUrl.includes(
            "https://fxg.jinritemai.com/byteshop/login/getmobilemail"
          )
        ) {
          const resJson = JSON.parse(xhr.responseText);
          Object.defineProperty(xhr, "responseText", {
            get: function () {
              const shopInfo = storage.get("shopInfo");
              if (shopInfo) {
                resJson.data.mobile = shopInfo.mobile;
                resJson.data.user_name = shopInfo.user_name;
              }
              return JSON.stringify(resJson);
            },
          });
        }
        // 资质照接口
        if (
          xhr._interceptUrl.includes(
            "https://fxg.jinritemai.com/center/qualification/subject/info"
          )
        ) {
          const resJson = JSON.parse(xhr.responseText);
          Object.defineProperty(xhr, "responseText", {
            get: function () {
              const companyInfo = storage.get("companyInfo");
              const legalPersonInfo = storage.get("legalPersonInfo");
              try {
                // 营业照
                resJson.data.subject_qual_info.company_info.license_img[0].url =
                  businessLiscenseImg;
                // 如果修改过公司信息
                if (companyInfo) {
                  // 本地存储的字段是完全一样的
                  resJson.data.subject_qual_info.company_info = {
                    ...resJson.data.subject_qual_info.company_info,
                    ...companyInfo,
                  };
                }
                // 身份证正面
                resJson.data.subject_qual_info.legal_person_info.identity_img[0].url =
                  idCardFrontImg;
                // 身份证背面
                resJson.data.subject_qual_info.legal_person_info.identity_img[1].url =
                  idCardBackImg;
                // 如果修改过法人信息
                if (legalPersonInfo) {
                  resJson.data.subject_qual_info.legal_person_info = {
                    ...resJson.data.subject_qual_info.legal_person_info,
                    ...legalPersonInfo,
                  };
                }
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
  // 查询table并获取数据
  function queryBillTableData(target) {
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
  // 查询公司信息
  function queryCompanyInfo(target) {
    const list = target.querySelectorAll("span");
    return {
      // 公司名称
      company_name: list[0].textContent.trim(),
      // 统一社会信用代码
      license_code: list[1].textContent.trim(),
      // 营业期限
      business_term: list[2].textContent.trim(),
      // 经营地址
      business_address: [
        // 经营省
        { code: "330000", name: list[3].textContent.trim().split("-")[0] },
        // 经营市
        { code: "330800", name: list[3].textContent.trim().split("-")[1] },
      ],
      // 成立时间
      establish_time: list[5].textContent.trim(),
      // 核准时间
      approval_time: list[6].textContent.trim(),
    };
  }
  // 查询法人信息
  function queryLegalPersonInfo(target) {
    const list = target.querySelectorAll("span");
    return {
      // 法定代表人姓名
      full_name: list[2].textContent.trim(),
      // 法定代表人证件号码
      identity_num: list[3].textContent.trim(),
      // 证件开始日期
      identity_begin_term: list[4].textContent.trim(),
      // 证件截止日期
      identity_term: list[5].textContent.trim(),
      // 法定代表人证件地址
      person_address_detail: list[6].textContent.trim(),
    };
  }
  // 查询店铺信息
  function queryShopInfo(target) {
    const shop_name = target
      .querySelector('[class*="index_shopName"]')
      .textContent.trim();
    const toutiao_id = target
      .querySelector('[class*="index_shopIdValue"]')
      .textContent.trim()
      .split(":")[1];
    const user_name = target
      .querySelectorAll('[class*="index_itemContent"]')[0]
      .textContent.trim();
    const mobile = target
      .querySelectorAll('[class*="index_itemContent"]')[1]
      .textContent.trim();
    return {
      shop_name,
      toutiao_id,
      user_name,
      mobile,
    };
  }
  // 处理月汇总表格编辑
  async function handleTableEdit() {
    // 等待月汇总表格加载完成
    await awaitElementLoad(
      '[id*="X-TABLE-fxg-bill"][id*="month"] td',
      10e5,
      1000
    );
    // 获取table元素
    const table = document.querySelector(
      '[id*="X-TABLE-fxg-bill"][id*="month"]'
    );
    table.contentEditable = "true";
    table.addEventListener("input", function () {
      // 获取数据
      const data = queryBillTableData(this);
      // 本地存储数据
      storage.set("monthBill", data);
    });
  }
  // 处理公司信息编辑
  async function handleCompanyInfoEdit() {
    // 等待公司信息加载完成
    await awaitElementLoad('[class*="previewFirst"]', 1000e5, 1000);
    // 获取公司元素
    const info = document.querySelector('[class*="previewFirst"]');

    info.contentEditable = "true";
    info.addEventListener("input", function () {
      // 获取数据
      const data = queryCompanyInfo(this);
      // 本地存储数据
      storage.set("companyInfo", data);
    });
  }
  // 处理法人信息编辑
  async function handleLegalPersonInfoEdit() {
    // 等待法人信息加载完成
    await awaitElementLoad('[class*="previewLast"]', 1000e5, 1000);
    // 获取法人信息
    const info = document.querySelector('[class*="previewLast"]');

    info.contentEditable = "true";
    info.addEventListener("input", function () {
      // 获取数据
      const data = queryLegalPersonInfo(this);
      // 本地存储数据
      storage.set("legalPersonInfo", data);
    });
  }
  // 处理店铺信息编辑
  async function handleShopInfoEdit() {
    // 等待弹窗加载
    await awaitElementLoad(
      ".auxo-popover [class*=index_wrapper]",
      1000e5,
      1000
    );
    // 获取店铺信息
    const popover = document.querySelector(
      ".auxo-popover [class*=index_wrapper]"
    );
    popover.contentEditable = "true";
    popover.addEventListener("mouseenter", function () {
      popover.focus();
    });
    popover.addEventListener("mouseover", function () {
      popover.focus();
    });
    popover.addEventListener("input", function () {
      // 获取数据
      const data = queryShopInfo(this);
      // 本地存储数据
      storage.set("shopInfo", data);
    });
  }
  function main() {
    handleTableEdit();
    handleCompanyInfoEdit();
    handleLegalPersonInfoEdit();
    handleShopInfoEdit();
  }
  main();
})();
