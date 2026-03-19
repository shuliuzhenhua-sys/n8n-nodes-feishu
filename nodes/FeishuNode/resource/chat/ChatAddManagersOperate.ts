import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption, memberIdTypeOptions } from '../../../help/utils/sharedOptions';

const ChatAddManagersOperate: ResourceOperations = {
	name: '指定群管理员',
	value: 'chat:addManagers',
	order: 80,
	options: [
		{
			displayName: '群 ID',
			name: 'chat_id',
			type: 'string',
			required: true,
			default: '',
			description:
				'群 ID。获取方式：创建群，从返回结果中获取该群的 chat_id；调用获取用户或机器人所在的群列表接口，可以查询用户或机器人所在群的 chat_id；调用搜索对用户或机器人可见的群列表，可搜索用户或机器人所在的群、对用户或机器人公开的群的 chat_id。注意：仅支持群模式为 群组（group）、话题（topic）的群组 ID。',
		},
		{
			displayName: '管理员 ID 列表',
			name: 'manager_ids',
			type: 'string',
			required: true,
			default: '',
			description:
				'要设置为管理员的 ID 列表，支持逗号分隔的字符串或通过表达式传入数组。ID 类型与查询参数 member_id_type 取值一致。如果是用户（member_id_type 为 user_id/open_id/union_id），推荐使用用户的 open_id；如果是机器人（member_id_type 为 app_id），请使用应用的 App ID。普通群最多可指定 10 个管理员；超大群最多可指定 20 个管理员；单次请求指定机器人时，最多可指定 5 个机器人。',
		},
		memberIdTypeOptions.withAppId,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;
		const manager_ids_raw = this.getNodeParameter('manager_ids', index) as string | string[];
		const member_id_type = this.getNodeParameter('member_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 解析管理员 ID 列表（支持字符串或数组）
		let manager_ids: string[];
		if (Array.isArray(manager_ids_raw)) {
			manager_ids = manager_ids_raw.map((id) => String(id).trim()).filter((id) => id.length > 0);
		} else {
			manager_ids = manager_ids_raw
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id.length > 0);
		}

		const qs: IDataObject = {
			member_id_type,
		};

		const body: IDataObject = {
			manager_ids,
		};
		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'POST' as IHttpRequestMethods,
			url: `/open-apis/im/v1/chats/${chat_id}/managers/add_managers`,
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

export default ChatAddManagersOperate;
