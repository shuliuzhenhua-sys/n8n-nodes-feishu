# space-media-download Specification

## Purpose
TBD - created by archiving change refactor-space-media-download. Update Purpose after archive.
## Requirements
### Requirement: 云空间素材下载
系统 SHALL 使用 `GET /open-apis/drive/v1/medias/{file_token}/download` 下载指定素材，并返回二进制数据。

#### Scenario: 使用素材 Token 下载
- **WHEN** 用户提供有效的 `file_token`
- **THEN** 系统返回二进制文件数据，并包含基础元信息（文件名、MIME 类型、文件大小）

### Requirement: 可选输出命名与类型覆盖
系统 SHALL 支持可选参数覆盖输出文件名与 MIME 类型。

#### Scenario: 自定义文件名与 MIME 类型
- **WHEN** 用户提供 `fileName` 或 `mimeType`
- **THEN** 输出使用用户提供的值覆盖默认值

