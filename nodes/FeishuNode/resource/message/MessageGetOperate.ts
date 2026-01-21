import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageGetOperate: ResourceOperations = {
	name: '获取指定消息的内容',
	value: 'message:get',
	order: 31,
	options: [
		{
			displayName: '消息ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
			description: '消息ID。可通过发送消息接口响应结果的 message_id 参数获取，或通过监听接收消息事件、获取会话历史消息接口获取',
		},
		{
			displayName: '用户ID类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{
					name: 'Open ID',
					value: 'open_id',
					description: '标识一个用户在某个应用中的身份。同一个用户在不同应用中的 Open ID 不同',
				},
				{
					name: 'Union ID',
					value: 'union_id',
					description: '标识一个用户在某个应用开发商下的身份。同一用户在同一开发商下的应用中的 Union ID 是相同的',
				},
				{
					name: 'User ID',
					value: 'user_id',
					description: '标识一个用户在某个租户内的身份。同一个用户在租户 A 和租户 B 内的 User ID 是不同的',
				},
			],
			default: 'open_id',
			description: '用户ID类型',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
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
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 0,
					description:
						'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 构建查询参数
		const qs: IDataObject = {
			user_id_type,
		};

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `/open-apis/im/v1/messages/${message_id}`,
			qs,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageGetOperate;
