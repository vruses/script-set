class PromiseLike {
  static resolve(result) {
    // 通过类调用的静态方法
    if (result instanceof PromiseLike) {
      return result;
    }
    return new PromiseLike((res) => {
      res(result);
    });
  }

  static reject(result) {
    // 通过类调用的静态方法
    if (result instanceof PromiseLike) {
      return result;
    }
    return new PromiseLike((_res, rej) => {
      rej(result);
    });
  }

  constructor(executor) {
    this.state = "pending";
    this.value = undefined;
    this.reason = undefined;

    // 构造函数里面添加两个数组存储成功和失败的回调
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      // 只有在 pending 状态时才能改变状态
      if (this.state === "pending") {
        this.state = "fulfilled";
        this.value = value;
        this.onFulfilledCallbacks.forEach((callback) => {
          callback();
        });
      }
    };

    const reject = (reason) => {
      // 只有在 pending 状态时才能改变状态
      if (this.state === "pending") {
        this.state = "rejected";
        this.reason = reason;
        this.onRejectedCallbacks.forEach((callback) => {
          callback();
        });
      }
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
      console.error(`Uncaught (in promise)`, error);
    }
  }

  // 首先需要传入函数,然后看情况执行这个函数
  // 其次返回一个promise<result>,result是函数执行的结果
  // TODO:then实现链式调用
  // 注意resolvePromise传入resolve函数this的指向
  then(onFulfilled, onRejected) {
    // 不同state做出不同行为
    // 避免产生副作用一般会暂存onFul和onRej
    // 回调执行过程中报错则reject

    // 确保onFulfilled和onRejected是函数
    const realOnFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value; // 值穿透

    const realOnRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          }; // 错误穿透

    const resolvePromise = (promise, x, resolve, reject) => {
      // 避免循环引用
      if (x === promise) {
        // 抛出错误方便打印
        throw new TypeError("Chaining cycle detected for promise #<Promise>");
      }
      //  如果 x 为 Promise ，则使 Promise 接受 x 的状态
      if (x instanceof PromiseLike) {
        x.then((y) => {
          resolvePromise(promise, y, resolve, reject);
        }, reject);
      }
      if ((typeof x === "object" && x !== null) || typeof x === "function") {
        let then = null;
        try {
          // 访问getter可能会出错
          then = x.then;
        } catch (error) {
          reject(error);
          console.error(`Uncaught (in promise)`, error);
        }
        if (typeof then === "function") {
          // 如果 resolve 和 reject 均被调用
          // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
          let signal = false;
          try {
            // 前边已经访问过一次then的getter了，为避免副作用call调用缓存后的then
            then.call(
              x,
              (y) => {
                if (!signal) {
                  resolvePromise(promise, y, resolve, reject);
                }
                signal = true;
              },
              (r) => {
                if (!signal) {
                  reject(r);
                }
                signal = true;
              }
            );
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(x);
        }
      } else {
        resolve(x);
      }
    };
    if (this.state === "fulfilled") {
      const promise2 = new PromiseLike((resolve, reject) => {
        queueMicrotask(() => {
          try {
            const x = realOnFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
            console.error(`Uncaught (in promise)`, error);
          }
        });
      });
      return promise2;
    }
    if (this.state === "rejected") {
      const promise2 = new PromiseLike((resolve, reject) => {
        queueMicrotask(() => {
          try {
            const x = realOnRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
            console.error(`Uncaught (in promise)`, error);
          }
        });
      });
      return promise2;
    }
    if (this.state === "pending") {
      const promise2 = new PromiseLike((resolve, reject) => {
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = realOnFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (error) {
              reject(error);
              console.error(`Uncaught (in promise)`, error);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = realOnRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject);
            } catch (error) {
              reject(error);
              console.error(`Uncaught (in promise)`, error);
            }
          });
        });
      });
      return promise2;
    }
  }
}
