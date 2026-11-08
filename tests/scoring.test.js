const {test}=require("node:test");
const assert=require("node:assert/strict");
const {scorePrice}=require("../miniprogram/utils/scoring");
test("same-price samples stay at midpoint",()=>assert.equal(scorePrice(15,[15,15,15,15,15]).score,50));
test("percentile includes half of equal-price observations",()=>assert.equal(scorePrice(25,[10,12,15,15,18,20,25,28,30]).score,72));
test("invalid observations do not inflate sample count",()=>assert.equal(scorePrice(25,[10,12,15,18,0,NaN,-1]).status,"insufficient"));
test("extreme prices and even median",()=>{const low=scorePrice(1,[10,12,14,16,18,20]);assert.equal(low.score,0);assert.equal(low.median,15);assert.equal(scorePrice(100,[10,12,14,16,18]).score,100)});
test("invalid subject price is rejected",()=>assert.throws(()=>scorePrice(0,[1,2,3,4,5])));