import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const ChatRemoveMembersOperate: ResourceOperations = {
	name: '移出群成员',
	value: 'chat:remove_members',
	options: [
		{
			displayName: '群 ID',
			name: 'chat_id',
			type: 'string',
			required: true,
			default: '',
			description: '群 ID。获取方式：创建群，从返回结果中获取该群的 chat_id；调用获取用户或机器人所在的群列表接口，可以查询用户或机器人所在群的 chat_id；调用搜索对用户或机器人可见的群列表，可搜索用户或机器人所在的群、对用户或机器人公开的群的 chat_id。注意：仅支持群模式为群组（group）、话题（topic）的群组 ID。',
		},
		{
			displayName: '成员 ID 类型',
			name: 'member_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
				{ name: 'App ID', value: 'app_id' },
			],
			description: '用户 ID 类型',
			default: 'open_id',
		},
		{
			displayName: '成员 ID 列表',
			name: 'id_list',
			type: 'string',
			required: true,
			default: '',
			description: '成员 ID 列表，支持逗号分隔的字符串或通过表达式传入数组。ID 类型与查询参数 member_id_type 的取值一致。移除群内的用户时推荐使用 OpenID；移除群内的机器人时需填写应用的 App ID。注意：成员列表不可为空，每次请求最多移除 50 个用户或者 5 个机器人。',
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
		const chat_id = this.getNodeParameter('chat_id', index) as string;
		const member_id_type = this.getNodeParameter('member_id_type', index, 'open_id') as string;
		const id_list_raw = this.getNodeParameter('id_list', index) as string | string[];
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};

		// 解析成员 ID 列表（支持字符串或数组）
		let id_list: string[];
		if (Array.isArray(id_list_raw)) {
			id_list = id_list_raw.map((id) => String(id).trim()).filter((id) => id.length > 0);
		} else {
			id_list = id_list_raw
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id.length > 0);
		}

		const qs: IDataObject = {
			member_id_type,
		};

		const body: IDataObject = {
			id_list,
		};
		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'DELETE' as IHttpRequestMethods,
			url: `/open-apis/im/v1/chats/${chat_id}/members`,
			qs,
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default ChatRemoveMembersOperate;

