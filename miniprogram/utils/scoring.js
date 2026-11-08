const TITLES = [
  { max: 20, title: "低价段" },
  { max: 40, title: "偏低价" },
  { max: 60, title: "中间价" },
  { max: 80, title: "偏高价" },
  { max: 100, title: "大冤种" }
];
function scorePrice(current, samples) {
  if (!Number.isFinite(current) || current <= 0) throw new Error("价格必须大于零");
  const valid = samples.filter(p => Number.isFinite(p) && p > 0);
  if (valid.length < 5) return { status: "insufficient", count: valid.length };
  const low = valid.filter(p => p < current).length;
  const equal = valid.filter(p => p === current).length;
  const score = Math.round(100 * (low + equal * 0.5) / valid.length);
  const sorted = [...valid].sort((a,b) => a-b);
  const m = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[m] : (sorted[m-1] + sorted[m]) / 2;
  return { status: "ready", count: valid.length, score, median,
    title: TITLES.find(t => score <= t.max).title, limited: valid.length < 10 };
}
module.exports = { scorePrice, TITLES };