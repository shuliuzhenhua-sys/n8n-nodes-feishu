# Change: 重写云空间下载文件节点

## Why
当前“下载文件”节点需要删除并重写，以更清晰地聚焦飞书云空间素材下载接口（`drive/v1/medias/{file_token}/download`）并简化交互。

## What Changes
- 移除现有“下载文件”节点实现与配置
- 新增一个重写后的“下载文件（云空间）”节点，基于 `drive/v1/medias/{file_token}/download`
- 规范输出二进制文件（`binaryPropertyName`）与基础元信息（文件名、MIME 类型、大小）

## Impact
- Affected specs: `space-media-download`
- Affected code: `nodes/FeishuNode/resource/space/SpaceFileDownloadOperate.ts` 及相关资源加载/配置位置
