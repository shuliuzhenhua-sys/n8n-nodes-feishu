import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
	sleep,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

interface RequestOptions {
	batching?: { batch?: { batchSize?: number; batchInterval?: number } };
	timeout?: number;
}

const ChatDeleteManagersOperate: ResourceOperations = {
	name: '删除群管理员',
	value: 'chat:deleteManagers',
	options: [
		{
			displayName: '群 ID',
			name: 'chat_id',
			type: 'string',
			required: true,
			default: '',
			description: '群 ID。获取方式：创建群，从返回结果中获取该群的 chat_id；调用获取用户或机器人所在的群列表接口，可以查询用户或机器人所在群的 chat_id；调用搜索对用户或机器人可见的群列表，可搜索用户或机器人所在的群、对用户或机器人公开的群的 chat_id。注意：仅支持群模式为 群组（group）、话题（topic）的群组 ID。',
		},
		{
			displayName: '管理员 ID 列表',
			name: 'manager_ids',
			type: 'string',
			required: true,
			default: '',
			description: '要删除的管理员 ID，多个 ID 用英文逗号分隔。如果是用户（member_id_type 取值为 user_id/open_id/union_id），推荐使用用户的 open_id。如果是机器人（member_id_type 取值为 app_id），请填写应用的 App ID。注意：每次请求最多指定 50 个用户或者 5 个机器人。',
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
			description: '用户 ID 类型。当值为 user_id 时，字段权限要求：获取用户 user ID（仅自建应用）',
			default: 'open_id',
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
										minValue: -1,
									},
									default: 50,
									description:
										'输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。',
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
		const manager_ids_str = this.getNodeParameter('manager_ids', index) as string;
		const member_id_type = this.getNodeParameter('member_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;

		// 解析管理员 ID 列表（支持逗号分隔）
		const manager_ids = manager_ids_str
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);

		const qs: IDataObject = {
			member_id_type,
		};

		const body: IDataObject = {
			manager_ids,
		};

		// 处理批次延迟
		const handleBatchDelay = async (): Promise<void> => {
			const batchSize = options.batching?.batch?.batchSize ?? -1;
			const batchInterval = options.batching?.batch?.batchInterval ?? 0;

			if (index > 0 && batchSize >= 0 && batchInterval > 0) {
				const effectiveBatchSize = batchSize > 0 ? batchSize : 1;
				if (index % effectiveBatchSize === 0) {
					await sleep(batchInterval);
				}
			}
		};

		await handleBatchDelay();

		// 构建请求选项
		const requestOptions: any = {
			method: 'POST' as IHttpRequestMethods,
			url: `/open-apis/im/v1/chats/${chat_id}/managers/delete_managers`,
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

export default ChatDeleteManagersOperate;

