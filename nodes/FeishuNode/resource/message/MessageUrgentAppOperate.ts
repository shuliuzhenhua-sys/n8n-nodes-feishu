import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageUrgentAppOperate: ResourceOperations = {
	name: '发送应用内加急',
	value: 'message:urgentApp',
	options: [
		{
			displayName: '消息ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
			description: '待加急的消息 ID',
		},
		{
			displayName: '用户ID类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{
					name: 'Open ID',
					value: 'open_id',
				},
				{
					name: 'User ID',
					value: 'user_id',
				},
				{
					name: 'Union ID',
					value: 'union_id',
				},
			],
			default: 'open_id',
			description: '用户 ID 类型',
		},
		{
			displayName: '加急用户ID列表',
			name: 'user_id_list',
			type: 'string',
			required: true,
			default: '',
			description: '需要加急的用户 ID 列表，多个用逗号分隔',
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
									description:
										'每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
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
		const user_id_list_str = this.getNodeParameter('user_id_list', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		// 解析用户 ID 列表
		const user_id_list = user_id_list_str
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id);

		const body: IDataObject = {
			user_id_list,
		};

		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'PATCH',
			url: `/open-apis/im/v1/messages/${message_id}/urgent_app`,
			qs: {
				user_id_type,
			},
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageUrgentAppOperate;
