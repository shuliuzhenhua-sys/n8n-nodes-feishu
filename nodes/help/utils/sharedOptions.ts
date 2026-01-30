import { INodeProperties } from 'n8n-workflow';

/**
 * 批处理选项
 * 用于控制并发请求的批次大小和间隔
 */
export const batchingOption: INodeProperties = {
	displayName: 'Batching',
	name: 'batching',
	placeholder: 'Add Batching',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: false,
	},
	default: {
		batch: {},
	},
	options: [
		{
			displayName: 'Batching',
			name: 'batch',
			values: [
				{
					displayName: 'Items per Batch',
					name: 'batchSize',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 50,
					description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
				},
				{
					displayName: 'Batch Interval (Ms)',
					name: 'batchInterval',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 1000,
					description: '每批请求之间的时间（毫秒）。0 表示禁用。',
				},
			],
		},
	],
};

/**
 * 超时选项
 * 用于控制请求超时时间
 */
export const timeoutOption: INodeProperties = {
	displayName: 'Timeout',
	name: 'timeout',
	type: 'number',
	typeOptions: {
		minValue: 0,
	},
	default: 0,
	description:
		'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
};

/**
 * 通用选项集合
 * 包含 Batching 和 Timeout 选项
 */
export const commonOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [batchingOption, timeoutOption],
};

/**
 * 获取选项的类型定义
 * 用于在操作函数中解析选项参数
 */
export interface ICommonOptionsValue {
	batching?: {
		batch?: {
			batchSize?: number;
			batchInterval?: number;
		};
	};
	timeout?: number;
}

/**
 * 分页参数选项
 */
export const paginationOptions = {
	/**
	 * 返回所有结果选项
	 */
	returnAll: {
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	} as INodeProperties,

	/**
	 * 限制返回数量选项
	 * @param maxValue 最大值，默认 100
	 * @param minValue 最小值，默认 1
	 * @param defaultValue 默认值，默认 50
	 */
	limit: (maxValue = 100, minValue = 1, defaultValue = 50): INodeProperties => ({
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
		default: defaultValue,
		typeOptions: {
			minValue,
			maxValue,
		},
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	}),
};

/**
 * 用户 ID 类型选项
 */
export const userIdTypeOption: INodeProperties = {
	displayName: '用户 ID 类型',
	name: 'user_id_type',
	type: 'options',
	options: [
		{ name: 'Open ID', value: 'open_id' },
		{ name: 'Union ID', value: 'union_id' },
		{ name: 'User ID', value: 'user_id' },
	],
	default: 'open_id',
};

/**
 * 群成员 ID 类型选项
 */
export const memberIdTypeOptions = {
	/**
	 * 基础版本（不含 app_id）
	 */
	basic: {
		displayName: '成员 ID 类型',
		name: 'member_id_type',
		type: 'options',
		options: [
			{ name: 'Open ID', value: 'open_id' },
			{ name: 'Union ID', value: 'union_id' },
			{ name: 'User ID', value: 'user_id' },
		],
		description: '用户 ID 类型',
		default: 'open_id',
	} as INodeProperties,

	/**
	 * 带 app_id 版本（支持机器人）
	 */
	withAppId: {
		displayName: '成员 ID 类型',
		name: 'member_id_type',
		type: 'options',
		options: [
			{ name: 'Open ID', value: 'open_id' },
			{ name: 'Union ID', value: 'union_id' },
			{ name: 'User ID', value: 'user_id' },
			{ name: 'App ID', value: 'app_id' },
		],
		description: '用户 ID 类型。邀请用户时推荐使用 open_id；邀请机器人时需填写 app_id。',
		default: 'open_id',
	} as INodeProperties,
};

/**
 * 消息接收者 ID 类型选项
 */
export const receiveIdTypeOption: INodeProperties = {
	displayName: '用户ID类型',
	name: 'receive_id_type',
	type: 'options',
	// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
	options: [
		{
			name: 'Open ID',
			value: 'open_id',
			description: '标识一个用户在某个应用中的身份。同一个用户在不同应用中的 Open ID 不同',
		},
		{
			name: 'Union ID',
			value: 'union_id',
			description:
				'标识一个用户在某个应用开发商下的身份。同一用户在同一开发商下的应用中的 Union ID 是相同的',
		},
		{
			name: 'User ID',
			value: 'user_id',
			description:
				'标识一个用户在某个租户内的身份。同一个用户在租户 A 和租户 B 内的 User ID 是不同的',
		},
		{
			name: 'Email',
			value: 'email',
			description: '以用户的真实邮箱来标识用户',
		},
		{
			name: 'Chat ID',
			value: 'chat_id',
			description: '以群 ID 来标识群聊',
		},
	],
	required: true,
	default: 'open_id',
};

/**
 * 自定义文件名选项
 */
export const fileNameOption: INodeProperties = {
	displayName: '自定义文件名',
	name: 'file_name',
	type: 'string',
	default: '',
	description:
		'自定义文件名，例如：demo.pdf。留空则从二进制数据中自动获取。最大长度250字符',
};

/**
 * MIME Type 选项
 */
export const mimeTypeOption: INodeProperties = {
	displayName: 'MIME Type',
	name: 'mimeType',
	type: 'string',
	default: '',
	description:
		'自定义文件的 MIME 类型。如不填写，将自动识别。常见类型：application/pdf、video/mp4、audio/opus',
};

/**
 * 输出二进制字段选项（下载用）
 */
export const binaryPropertyNameOption: INodeProperties = {
	displayName: 'Put Output File in Field',
	name: 'binaryPropertyName',
	type: 'string',
	default: 'data',
	required: true,
	description: 'The name of the output binary field to put the file in',
};

/**
 * 输入二进制字段选项（上传用）
 */
export const fileFieldNameOption: INodeProperties = {
	displayName: 'Input Data Field Name',
	name: 'fileFieldName',
	type: 'string',
	default: 'data',
	required: true,
	description: 'The name of the incoming field containing the binary file data to be processed',
};

/**
 * 仅超时的选项集合（用于 Return All 节点）
 */
export const timeoutOnlyOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [timeoutOption],
};
