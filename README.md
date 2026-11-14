<div align="center">

  <h1>tyx · 签名动画</h1>
  <p><strong>把名字，写成自己的样子。</strong></p>
  <p>输入英文名字、拼音或字母缩写，设计会逐笔写出的签名，并在浏览器里导出 MP4 或透明 GIF。</p>

  <p>
    <a href="https://tangyx527.github.io/tyx-signature/"><strong>立即在线体验 ↗</strong></a>
    &nbsp; · &nbsp;
    <a href="assets/showcase/signature-demo.mp4?raw=true">查看情侣原画质 MP4</a>
  </p>

  <p>
    <img src="assets/showcase/badges/react.svg" alt="React 19" height="24">
    <img src="assets/showcase/badges/typescript.svg" alt="TypeScript 5.9" height="24">
    <a href="LICENSE"><img src="assets/showcase/badges/mit.svg" alt="项目代码采用 MIT 许可证" height="24"></a>
  </p>

  <picture>
    <source media="(prefers-reduced-motion: reduce)" srcset="assets/showcase/signature-poster.webp">
    <img src="assets/showcase/signature-demo.gif" alt="Taiyang 与 Yuliang 情侣签名的真实导出：开场光点、逐笔书写、猫耳与太阳装饰，以及彩色收尾动画" width="960">
  </picture>

  <p><sub>情侣签名真实导出 · 完整 5 秒 · 1080p / 30 fps 原视频</sub></p>

</div>

## 快速开始

**直接打开[在线网站](https://tangyx527.github.io/tyx-signature/)，无需安装。**

1. **写下名字**：从左侧图标栏进入“签名”，选择单人或双人并输入名字；也可选择“描图签名”，上传参考图后沿图描写。
2. **调整构图**：直接在中央完整画布点选并拖动签名或装饰，选框显示当前对象；方向键移动1px，Shift加方向键移动10px，也可使用设置面板的位置数值与滑条。调整颜色、大小、粗细或装饰时，随时撤销/重做。
3. **设置动画**：“动画”内通过预览图卡选择开场和收尾，点击卡片即可播放对应片段，也可展开查看全部开场。这里还可设置音乐、总时长及30/60 fps；“画面”内设置比例与背景。底部支持完整播放、分段播放、循环和进度定位。
4. **带走动画**：顶部可编辑项目名，设计自动保存到当前浏览器；点击“导出视频”选择MP4或GIF。透明背景使用GIF，MP4可添加音乐。

设置栏右上角的箭头可收起设置面板，只保留图标并扩宽画布；点击图标或展开箭头恢复设置。

首次进入可选择教学引导，按签名、样式、动画、导出四步边操作边体验；随时可跳过，在“更多操作 → 教学引导”中重新打开。描图窗口另有可收起的三步提示。

配置保存在当前浏览器；设置栏底部的“更多操作”菜单提供下载、导入JSON和重置。设计与视频处理在当前设备完成，音频文件不包含在配置中，重新打开页面后需要重新选择。

描图时先调整底图位置、缩放与透明度，再开始描写；支持续描、撤销、三档平滑和动画预览。点击“完成并应用”保存原始轨迹，之后仍可重新调整美化。参考图只用于当前描摹窗口，不进入成品或配置文件；重新打开窗口时可再次上传。

设置栏底部的界面模式支持浅色、深色与跟随系统，选择会在当前浏览器保存，独立于作品的背景与导出设置。

## 核心功能

| 功能 | 可以做什么 |
| --- | --- |
| **TYX Brush 字形** | 项目内置的自有矢量连笔实现，保留输入大小写，包含起笔、连笔与收笔变化。 |
| **描图签名** | 鼠标、手指或触控笔沿参考图描写，自动平滑线路，保留原始轨迹；双人可分别选择签名来源，继续使用现有预览和导出。 |
| **单人 / 情侣签名** | 两人同步书写，分别设置名字、颜色、大小、笔迹粗细、装饰及位置。 |
| **自定义渐变** | 签名和背景均可切换纯色或渐变，设置2–5个颜色、色标位置及方向；双人签名独立配色，预览与导出使用同一效果。 |
| **可爱装饰** | 萌宠、爪爪、表情与星座四类图案，带有各自的小动作，可调整大小和位置。 |
| **画布编辑与预览** | 完整静态画布可直接点选拖动，提供选框、位置输入和键盘微调；底部按完整/开场/签名/收尾播放、循环和定位，页面隐藏时暂停。 |
| **撤销 / 重做** | 顶部提供50步分组历史，拖动一次只记一条；支持键盘快捷操作，输入框保留自身的原生撤销。 |
| **开场与收尾动画** | 16款开场全部保留；收尾只保留原版彩片与旋涡收拢两款，另有“无动画”关闭选项。首尾独立搭配，图卡展示真实预览图；点击选择并播放对应片段，书写阶段保留少量伴随元素。 |
| **背景音乐** | 选择音乐片段，调整起点、音量、淡入和淡出，与视频一同导出。 |
| **浏览器端 MP4** | H.264、30/60 fps可选，默认30 fps；横屏 / 竖屏 / 方形 1080p，时长 3–15 秒，支持取消生成。 |
| **透明 GIF** | 循环动图，长边 960px、20 fps，可选择透明、纯色或渐变背景，无音频；GIF 采用单层透明，柔光边缘会有所简化。 |

## 效果演示

以下为早期版本的真实导出，展示逐笔书写与导出效果；当前装饰及动画选项以编辑器为准。

### 单人签名 · 轻巧的小表情

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="assets/showcase/single-poster.webp">
  <img src="assets/showcase/single-demo.gif" alt="Taiyang 单人签名的真实导出：逐笔书写、白粉色小表情与彩色收尾动画" width="960">
</picture>

一份笔迹，加一点自己的表情。[查看单人原画质 MP4](assets/showcase/single-demo.mp4?raw=true)。

### 情侣签名 · 从书写到收尾

上方主视觉与下面的关键帧来自同一段情侣 MP4，展示 Taiyang / Yuliang、猫耳与太阳装饰，以及完整的书写与收尾。

| 逐笔写出 | 签名与装饰 | 彩色收尾 |
| :---: | :---: | :---: |
| <img src="assets/showcase/writing.webp" alt="真实视频中的逐笔书写画面" width="320"> | <img src="assets/showcase/signature-poster.webp" alt="真实视频中完整的情侣签名、猫耳和太阳" width="320"> | <img src="assets/showcase/outro.webp" alt="真实视频中签名变形后的彩色笔片" width="320"> |

两段 GIF 均保留完整首尾；[情侣原画质 MP4](assets/showcase/signature-demo.mp4?raw=true)与单人原视频均为 1920 × 1080、30 fps、5 秒。系统偏好减少动态效果时，动画展示改用静态签名画面。

## 本地运行与部署

<details>
<summary><strong>开发者快速开始</strong></summary>

推荐 Node.js **24 LTS**，项目支持 `>=22.14 <25`。在源码目录执行：

```sh
npm ci
npm start
```

打开终端显示的网址。Windows 可双击 `开始使用.cmd`；macOS 可运行 `sh ./开始使用.command`。

构建静态网站：

```sh
npm run build
```

构建结果在 `dist/`，可部署到静态托管平台。使用 GitHub Pages 时，将仓库 Settings → Pages → Source 设为 **GitHub Actions**；随附工作流会在推送到 `main` 后自动检查、构建并部署。

常用命令：`npm run check` 检查类型，`npm test` 运行测试，`npm run preview` 预览构建结果。

</details>

## 技术架构

| 层次 | 技术与职责 |
| --- | --- |
| 编辑界面 | **React + TypeScript** 管理输入、双人设置、预览控制与配置保存。 |
| 图形与动画 | **Canvas** 绘制 TYX Brush 字形、装饰和首尾动画；预览与视频导出共用绘制器。 |
| 视频与音频 | 按需加载 **Mediabunny**，通过 **WebCodecs** 编码 H.264 MP4，可选 AAC 音轨。 |
| 动图导出 | 按需加载 **gifenc**，直接编码同一 Canvas 时间轴，支持透明背景和循环播放。 |
| 构建与托管 | **Vite + GitHub Pages** 提供静态站点，不需要视频渲染后端。 |

## 兼容性

**网页能够打开，不代表当前设备一定能够导出 MP4。** 导出前，页面会检查所选画幅和编码能力。GIF 使用 Canvas 编码，不依赖 WebCodecs。

- 需要 **HTTPS** 或本机 **localhost**，以及设备支持所选画幅的 H.264 [WebCodecs 编码](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder)。
- 添加音乐还需要浏览器能够解码所选音频，并支持 AAC 编码；不支持时可尝试移除音乐或更换浏览器。
- 早期版本已在 **Windows 应用内浏览器**完成线上 1080p MP4 生成、下载与完整解码验证；手机宽度仅做过布局模拟。
- **iOS / Android 真机、macOS 本地启动，以及各浏览器与设备组合尚未逐一实测。** 请以页面检测结果为准，不承诺所有移动设备均可导出。

## 许可证

项目代码采用 [MIT](LICENSE)。React、Zod、Mediabunny、Geist 字体与 Phosphor 图标等资源保留各自许可，详见[第三方声明](THIRD_PARTY_NOTICES.md)。

项目的 MIT 声明不代表第三方资源或参考内容均采用 MIT，也不替代它们各自的权利与授权。

