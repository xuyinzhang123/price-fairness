# 微信云开发部署

## 1. 配置自己的账号

- project.config.json：填写自己的小程序 AppID。
- miniprogram/config.js：cloudEnv 填自己的环境 ID，cloudFunction 保持 priceApi，apiBaseUrl 留空。
- cloudfunctions/priceApi/deployment.json：appId 和 cloudEnv 分别填相同的 AppID 和环境 ID。不要保留示例值。
- 不需要 AppSecret 或 AI API 密钥。

默认提交的 deployment.json 是虚构示例，只用于说明结构和本地测试；云函数拒绝与所配 AppID 不符的调用。

## 2. 创建集合

创建 price_posts、price_replies、price_votes。数据库客户端读写均关闭，仅云函数读写。投票入口已移除，price_votes 仅供现有兼容接口使用。

索引：
- price_posts：city 升序 + cityVisible 升序 + createdAt 降序。
- price_posts：owner 升序。
- price_replies：postId 升序 + createdAt 降序。
- price_votes：postId 升序 + choice 升序。

## 3. 云存储

照片从用户手机通过 wx.cloud.uploadFile 上传；存储规则需允许用户上传自己的文件，禁止用户修改他人文件。读取可限制为创建者，图片展示通过云函数生成临时链接。不要把存储设置为所有用户可写，也不能把客户端上传完全关闭。
云函数校验文件编号所属环境及用户路径，但尚未完成内容审核、上传票据验证和孤儿文件回收，见相关 Issue。

## 4. 部署

微信开发者工具中右键 cloudfunctions/priceApi，选“上传并部署：云端安装依赖”。部署后检查控制台中的实际超时时间；config.json 的 timeout 不保证被部署工具应用，曾出现仍保持 3 秒的情况。如遇超时，在控制台按实际需要调整，例如 20 秒。

重新编译小程序。先以两部手机测试发布照片、同城检索、留言和补报价，再考虑更广范围试用。

## 5. 内部体验

上传开发版本后，在微信公众平台将其选为体验版；体验成员通过后台生成的体验二维码进入。二维码期限、分享认证、隐私配置及上线要求均以微信后台为准。此仓库不代办认证、备案或审核。

## 当前限制

云端根据真实用户样本计算，至少5位其他用户才评分，酒店等缺条件不评分；列表最多 100 条、详情最多 100 条互动，无分页；我的页面只有自己的记录数量。旧设备本机记录不会自动上传云端。
