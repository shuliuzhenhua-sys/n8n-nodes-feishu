import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import NodeUtils from '../../../help/utils/NodeUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const ChatCreateOperate: ResourceOperations = {
	name: '创建群',
	value: 'chat:create',
	order: 5,
	options: [
		// ===== 查询参数 =====
		{
			displayName: '用户 ID 类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			description:
				'用户 ID 类型。open_id: 标识一个用户在某个应用中的身份，同一个用户在不同应用中的 Open ID 不同。union_id: 标识一个用户在某个应用开发商下的身份，同一用户在同一开发商下的应用中的 Union ID 是相同的。user_id: 标识一个用户在某个租户内的身份。',
			default: 'open_id',
		},
		{
			displayName: '设置机器人为管理员',
			name: 'set_bot_manager',
			type: 'boolean',
			description:
				'Whether to set the bot that created this group as an administrator. 如果在请求体的 owner_id 字段指定了某个用户为群主，可以选择是否同时设置创建此群的机器人为管理员。.',
			default: false,
		},
		{
			displayName: 'UUID (去重)',
			name: 'uuid',
			type: 'string',
			default: '',
			description:
				'由开发者生成的唯一字符串序列，用于创建群组请求去重。持有相同 uuid + owner_id（若有）的请求 10 小时内只可成功创建 1 个群聊。不传值表示不进行请求去重，每一次请求成功后都会创建一个群聊。最大长度: 50 字符。',
		},
		// ===== 请求体参数 =====
		{
			displayName: '群名称',
			name: 'name',
			type: 'string',
			default: '',
			description: '群名称。最大长度: 100 字符。',
		},
		{
			displayName: '群描述',
			name: 'description',
			type: 'string',
			default: '',
			description: '群描述。最大长度: 500 字符。',
		},
		{
			displayName: '群头像 Image Key',
			name: 'avatar',
			type: 'string',
			default: '',
			description: '群头像对应的 Image Key，可通过上传图片接口获取。',
		},
		{
			displayName: '群主 ID',
			name: 'owner_id',
			type: 'string',
			default: '',
			description:
				'群主 ID。ID 类型与 user_id_type 的取值保持一致。如果不指定群主，则群组创建者为群主。',
		},
		{
			displayName: '群成员用户 ID 列表',
			name: 'user_id_list',
			type: 'string',
			default: '',
			description:
				'创建群时邀请加入群的成员用户 ID 列表，多个用户 ID 用英文逗号分隔。例如: ou_7d8a6e6df7621556ce0d21922b676706,ou_8d8a6e6df7621556ce0d21922b676707',
		},
		{
			displayName: '群机器人 ID 列表',
			name: 'bot_id_list',
			type: 'string',
			default: '',
			description:
				'创建群时邀请加入群的机器人 ID 列表，多个机器人 ID 用英文逗号分隔。例如: cli_a3f1c0d2e4g5,cli_b4f2c1d3e5g6',
		},
		{
			displayName: '群消息形式',
			name: 'group_message_type',
			type: 'options',
			options: [
				{ name: '会话消息', value: 'chat' },
				{ name: '话题消息', value: 'thread' },
			],
			default: 'chat',
			description: '群消息形式。chat: 会话消息。thread: 话题消息。',
		},
		{
			displayName: '群模式',
			name: 'chat_mode',
			type: 'options',
			options: [{ name: '群组', value: 'group' }],
			default: 'group',
			description: '群模式。目前仅支持 group（群组）模式。',
		},
		{
			displayName: '群类型',
			name: 'chat_type',
			type: 'options',
			options: [
				{ name: '私有群', value: 'private' },
				{ name: '公开群', value: 'public' },
			],
			default: 'private',
			description: '群类型。private: 私有群。public: 公开群。',
		},
		{
			displayName: '是否为外部群',
			name: 'external',
			type: 'boolean',
			default: false,
			description: 'Whether this is an external group. 是否是外部群.',
		},
		{
			displayName: '入群消息可见性',
			name: 'join_message_visibility',
			type: 'options',
			options: [
				{ name: '仅群主和管理员可见', value: 'only_owner' },
				{ name: '所有成员可见', value: 'all_members' },
				{ name: '任何人均不可见', value: 'not_anyone' },
			],
			default: 'all_members',
			description: '入群消息可见性。',
		},
		{
			displayName: '退群消息可见性',
			name: 'leave_message_visibility',
			type: 'options',
			options: [
				{ name: '仅群主和管理员可见', value: 'only_owner' },
				{ name: '所有成员可见', value: 'all_members' },
				{ name: '任何人均不可见', value: 'not_anyone' },
			],
			default: 'all_members',
			description: '退群消息可见性。',
		},
		{
			displayName: '加群审批',
			name: 'membership_approval',
			type: 'options',
			options: [
				{ name: '无需审批', value: 'no_approval_required' },
				{ name: '需要群主或管理员审批', value: 'approval_required' },
			],
			default: 'no_approval_required',
			description: '加群审批配置。',
		},
		{
			displayName: '其他请求体参数',
			name: 'body',
			type: 'json',
			default: '{}',
			description:
				'其他请求体参数（如 i18n_names、labels、restricted_mode_setting、urgent_setting、video_conference_setting 等）。参考: https://open.feishu.cn/document/server-docs/group/chat/create',
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
		// 获取查询参数
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const set_bot_manager = this.getNodeParameter('set_bot_manager', index, false) as boolean;
		const uuid = this.getNodeParameter('uuid', index, '') as string;

		// 获取请求体参数
		const name = this.getNodeParameter('name', index, '') as string;
		const description = this.getNodeParameter('description', index, '') as string;
		const avatar = this.getNodeParameter('avatar', index, '') as string;
		const owner_id = this.getNodeParameter('owner_id', index, '') as string;
		const user_id_list_str = this.getNodeParameter('user_id_list', index, '') as string;
		const bot_id_list_str = this.getNodeParameter('bot_id_list', index, '') as string;
		const group_message_type = this.getNodeParameter('group_message_type', index, 'chat') as string;
		const chat_mode = this.getNodeParameter('chat_mode', index, 'group') as string;
		const chat_type = this.getNodeParameter('chat_type', index, 'private') as string;
		const external = this.getNodeParameter('external', index, false) as boolean;
		const join_message_visibility = this.getNodeParameter(
			'join_message_visibility',
			index,
			'all_members',
		) as string;
		const leave_message_visibility = this.getNodeParameter(
			'leave_message_visibility',
			index,
			'all_members',
		) as string;
		const membership_approval = this.getNodeParameter(
			'membership_approval',
			index,
			'no_approval_required',
		) as string;
		const extObject = NodeUtils.getNodeJsonData(this, 'body', index) as IDataObject;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 构建查询参数
		const qs: IDataObject = {
			user_id_type,
		};
		if (set_bot_manager) {
			qs.set_bot_manager = set_bot_manager;
		}
		if (uuid) {
			qs.uuid = uuid;
		}

		// 构建请求体
		const body: IDataObject = {
			...extObject,
		};

		// 添加非空的请求体参数
		if (name) body.name = name;
		if (description) body.description = description;
		if (avatar) body.avatar = avatar;
		if (owner_id) body.owner_id = owner_id;
		if (user_id_list_str) {
			body.user_id_list = user_id_list_str.split(',').map((id) => id.trim());
		}
		if (bot_id_list_str) {
			body.bot_id_list = bot_id_list_str.split(',').map((id) => id.trim());
		}
		body.group_message_type = group_message_type;
		body.chat_mode = chat_mode;
		body.chat_type = chat_type;
		body.external = external;
		body.join_message_visibility = join_message_visibility;
		body.leave_message_visibility = leave_message_visibility;
		body.membership_approval = membership_approval;

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'POST' as IHttpRequestMethods,
			url: '/open-apis/im/v1/chats',
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

export default ChatCreateOperate;
