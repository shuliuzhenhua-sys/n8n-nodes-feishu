## ADDED Requirements
### Requirement: 获取子部门列表
系统 SHALL 提供获取指定部门下子部门列表的操作节点，并支持递归查询与分页。

#### Scenario: 查询直属子部门
- **WHEN** 用户提供 department_id 并未开启递归
- **THEN** 返回该部门的直属子部门列表

### Requirement: 获取部门直属用户列表
系统 SHALL 提供获取指定部门直属用户列表的操作节点，并支持分页与返回全部结果。

#### Scenario: 查询部门用户
- **WHEN** 用户提供 department_id
- **THEN** 返回该部门直属用户列表
