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

const ChatUpdateOperate: ResourceOperations = {
	name: '更新群信息',
	value: 'chat:update',
	order: 6,
	options: [
		// ===== 路径参数 =====
		{
			displayName: '群 ID',
			name: 'chat_id',
			type: 'string',
			required: true,
			default: '',
			description: '群 ID。获取方式参见群ID说明。',
		},
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
				'用户 ID 类型。open_id: 标识一个用户在某个应用中的身份。union_id: 标识一个用户在某个应用开发商下的身份。user_id: 标识一个用户在某个租户内的身份。',
			default: 'open_id',
		},
		// ===== 请求体参数 =====
		{
			displayName: '群头像 Image Key',
			name: 'avatar',
			type: 'string',
			default: '',
			description: '群头像对应的 Image Key，可通过上传图片接口获取。',
		},
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
			displayName: '群消息形式',
			name: 'group_message_type',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '会话消息', value: 'chat' },
				{ name: '话题消息', value: 'thread' },
			],
			default: '',
			description: '群消息形式。chat: 会话消息。thread: 话题消息。',
		},
		{
			displayName: '群类型',
			name: 'chat_type',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '私有群', value: 'private' },
				{ name: '公开群', value: 'public' },
			],
			default: '',
			description: '群类型。private: 私有群。public: 公开群。',
		},
		{
			displayName: '群主 ID',
			name: 'owner_id',
			type: 'string',
			default: '',
			description:
				'群主 ID。ID 类型与 user_id_type 的取值保持一致。转让群主时需要填写此字段。',
		},
		{
			displayName: '发言权限',
			name: 'add_member_permission',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '所有成员', value: 'all_members' },
				{ name: '仅群主和管理员', value: 'only_owner' },
			],
			default: '',
			description: '谁可以邀请成员入群。',
		},
		{
			displayName: '群分享权限',
			name: 'share_card_permission',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '允许分享', value: 'allowed' },
				{ name: '不允许分享', value: 'not_allowed' },
			],
			default: '',
			description: '群成员是否可以分享群名片。',
		},
		{
			displayName: '@所有人 权限',
			name: 'at_all_permission',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '所有成员', value: 'all_members' },
				{ name: '仅群主和管理员', value: 'only_owner' },
			],
			default: '',
			description: '谁可以 @所有人。',
		},
		{
			displayName: '群编辑权限',
			name: 'edit_permission',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '所有成员', value: 'all_members' },
				{ name: '仅群主和管理员', value: 'only_owner' },
			],
			default: '',
			description: '谁可以编辑群信息。',
		},
		{
			displayName: '入群消息可见性',
			name: 'join_message_visibility',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '仅群主和管理员可见', value: 'only_owner' },
				{ name: '所有成员可见', value: 'all_members' },
				{ name: '任何人均不可见', value: 'not_anyone' },
			],
			default: '',
			description: '入群消息可见性。',
		},
		{
			displayName: '退群消息可见性',
			name: 'leave_message_visibility',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '仅群主和管理员可见', value: 'only_owner' },
				{ name: '所有成员可见', value: 'all_members' },
				{ name: '任何人均不可见', value: 'not_anyone' },
			],
			default: '',
			description: '退群消息可见性。',
		},
		{
			displayName: '加群审批',
			name: 'membership_approval',
			type: 'options',
			options: [
				{ name: '不修改', value: '' },
				{ name: '无需审批', value: 'no_approval_required' },
				{ name: '需要群主或管理员审批', value: 'approval_required' },
			],
			default: '',
			description: '加群审批配置。',
		},
		{
			displayName: '其他请求体参数',
			name: 'body',
			type: 'json',
			default: '{}',
			description:
				'其他请求体参数（如 i18n_names、labels、restricted_mode_setting、urgent_setting、video_conference_setting、hide_member_count_setting、chat_tags 等）。参考: https://open.feishu.cn/document/server-docs/group/chat/update-2',
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
		// 获取路径参数
		const chat_id = this.getNodeParameter('chat_id', index) as string;

		// 获取查询参数
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;

		// 获取请求体参数
		const avatar = this.getNodeParameter('avatar', index, '') as string;
		const name = this.getNodeParameter('name', index, '') as string;
		const description = this.getNodeParameter('description', index, '') as string;
		const group_message_type = this.getNodeParameter('group_message_type', index, '') as string;
		const chat_type = this.getNodeParameter('chat_type', index, '') as string;
		const owner_id = this.getNodeParameter('owner_id', index, '') as string;
		const add_member_permission = this.getNodeParameter(
			'add_member_permission',
			index,
			'',
		) as string;
		const share_card_permission = this.getNodeParameter(
			'share_card_permission',
			index,
			'',
		) as string;
		const at_all_permission = this.getNodeParameter('at_all_permission', index, '') as string;
		const edit_permission = this.getNodeParameter('edit_permission', index, '') as string;
		const join_message_visibility = this.getNodeParameter(
			'join_message_visibility',
			index,
			'',
		) as string;
		const leave_message_visibility = this.getNodeParameter(
			'leave_message_visibility',
			index,
			'',
		) as string;
		const membership_approval = this.getNodeParameter('membership_approval', index, '') as string;
		const extObject = NodeUtils.getNodeJsonData(this, 'body', index) as IDataObject;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 构建查询参数
		const qs: IDataObject = {
			user_id_type,
		};

		// 构建请求体（只添加非空的参数）
		const body: IDataObject = {
			...extObject,
		};

		if (avatar) body.avatar = avatar;
		if (name) body.name = name;
		if (description) body.description = description;
		if (group_message_type) body.group_message_type = group_message_type;
		if (chat_type) body.chat_type = chat_type;
		if (owner_id) body.owner_id = owner_id;
		if (add_member_permission) body.add_member_permission = add_member_permission;
		if (share_card_permission) body.share_card_permission = share_card_permission;
		if (at_all_permission) body.at_all_permission = at_all_permission;
		if (edit_permission) body.edit_permission = edit_permission;
		if (join_message_visibility) body.join_message_visibility = join_message_visibility;
		if (leave_message_visibility) body.leave_message_visibility = leave_message_visibility;
		if (membership_approval) body.membership_approval = membership_approval;

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'PUT' as IHttpRequestMethods,
			url: `/open-apis/im/v1/chats/${chat_id}`,
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

export default ChatUpdateOperate;
