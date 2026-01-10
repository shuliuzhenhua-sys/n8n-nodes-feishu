## 1. 变更准备
- [x] 确认新“下载文件”节点的名称、显示文案与归属资源分类
- [x] 确认输入参数最小集（file_token、binaryPropertyName、可选 fileName/mimeType）

## 2. 实现与接入
- [x] 删除旧的下载文件实现文件与注册入口
- [x] 新增重写后的下载文件实现（调用 `drive/v1/medias/{file_token}/download`）
- [x] 接入资源集合/路由，保证节点可见且可执行

## 3. 兼容与文档
- [ ] 如有必要，补充 README/功能列表中的节点变更说明

## 4. 验证
- [ ] 运行 `npm run lint`
- [ ] 运行 `npm run build`
