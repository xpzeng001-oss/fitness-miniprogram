# COS 会员动作库配置

## 1. 存储桶

建议创建腾讯云 COS 私有桶：

```text
访问权限：私有读写
示例 Bucket：fitness-exercises-1318589271
示例 Region：ap-guangzhou
```

资源路径建议：

```text
exercises/chest-001/thumb.jpg
exercises/chest-001/demo.mp4
```

## 2. 环境变量

复制 `.env.example` 到 `.env`，补充：

```env
TENCENT_SECRET_ID=
TENCENT_SECRET_KEY=
TENCENT_COS_BUCKET=fitness-exercises-1318589271
TENCENT_COS_REGION=ap-guangzhou
COS_SIGN_EXPIRES=600
ADMIN_SECRET=change_me_too
API_PUBLIC_BASE_URL=https://xckjsoft.cn/fitness-api
```

不要把真实 `.env` 提交到仓库。

## 3. 动作数据

编辑 `server/exercises.json`：

```json
{
  "id": "chest-001",
  "name": "标准俯卧撑",
  "isPro": true,
  "thumbKey": "exercises/chest-001/thumb.jpg",
  "videoKey": "exercises/chest-001/demo.mp4"
}
```

`isPro: true` 的动作需要会员才能获取资源 URL。

## 4. 手动开通会员

支付接入前，可以用后台接口手动开通：

```bash
curl -X POST https://xckjsoft.cn/fitness-api/api/admin/membership \
  -H 'content-type: application/json' \
  -H 'x-admin-secret: YOUR_ADMIN_SECRET' \
  -d '{"openid":"USER_OPENID","level":"pro","expiresAt":"2027-01-01T00:00:00.000Z"}'
```

`expiresAt` 传 `null` 表示长期有效。

## 5. 小程序侧

动作库会请求：

```text
GET /api/exercises
GET /api/exercises/:id/assets
```

非会员能看到 Pro 动作锁定状态，但拿不到 COS 临时 URL。

## 6. 不用 COS 的本地视频兜底

如果暂时不配置 COS，可以把压缩后的 `assets` 目录放到后端项目同级：

```text
fitness-miniprogram/
  assets/
    chest-001/thumb.jpg
    chest-001/demo.mp4
  server/
    server.js
```

后端会通过静态地址返回视频：

```text
https://xckjsoft.cn/fitness-api/exercise-assets/chest-001/demo.mp4
```

宝塔/Nginx 使用 `/fitness-api` 反代时，务必在 `.env` 设置：

```env
API_PUBLIC_BASE_URL=https://xckjsoft.cn/fitness-api
```
