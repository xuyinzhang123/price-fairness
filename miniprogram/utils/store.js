const KEY = "price-fairness-local-v1";
function read() { return wx.getStorageSync(KEY) || []; }
function save(quote) {
  const record = { ...quote, id: String(Date.now()) + Math.random().toString(16).slice(2),
    createdAt: new Date().toISOString(), source: "user", priceType: quote.priceType || "seen" };
  wx.setStorageSync(KEY, [record, ...read()]);
  return record;
}
module.exports = { read, save };