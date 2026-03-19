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

const ChatAddMembersOperate: ResourceOperations = {
	name: '将用户或机器人拉入群聊',
	value: 'chat:addMembers',
	order: 50,
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
			displayName: '成员 ID 列表',
			name: 'id_list',
			type: 'string',
			required: true,
			default: '',
			description:
				'成员 ID 列表，支持逗号分隔的字符串或通过表达式传入数组。邀请用户进群时推荐使用 OpenID；邀请机器人进群时需填写应用的 App ID。每次请求最多拉 50 个用户且不超过群人数上限。最多同时邀请 5 个机器人，且邀请后群组中机器人数量不能超过 15 个。',
		},
		memberIdTypeOptions.withAppId,
		{
			displayName: '不可用 ID 处理方式',
			name: 'succeed_type',
			type: 'options',
			options: [
				{
					name: '0 - 不可用 ID 拉群失败，返回错误响应（已离职 ID 会拉入其他可用 ID）',
					value: 0,
				},
				{
					name: '1 - 可用 ID 全部拉入群聊，返回成功响应并展示不可用 ID 及原因',
					value: 1,
				},
				{
					name: '2 - 存在任一不可用 ID 就拉群失败，返回错误响应并展示不可用 ID',
					value: 2,
				},
			],
			description: '出现不可用 ID 后的处理方式',
			default: 0,
		},
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
		const id_list_raw = this.getNodeParameter('id_list', index) as string | string[];
		const member_id_type = this.getNodeParameter('member_id_type', index, 'open_id') as string;
		const succeed_type = this.getNodeParameter('succeed_type', index, 0) as number;
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
			succeed_type,
		};

		const body: IDataObject = {
			id_list,
		};
		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'POST' as IHttpRequestMethods,
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

export default ChatAddMembersOperate;
