# Change: 新增通讯录部门相关两个节点

## Why
需要在 n8n 中对接飞书通讯录的部门与部门用户查询能力，用于组织架构自动化。

## What Changes
- 新增「获取子部门列表」操作节点
- 新增「获取部门直属用户列表」操作节点

## Impact
- Affected specs: contact-department
- Affected code: nodes/FeishuNode/resource/、nodes/FeishuNode/resource/department/、nodes/FeishuNode/resource/user/
