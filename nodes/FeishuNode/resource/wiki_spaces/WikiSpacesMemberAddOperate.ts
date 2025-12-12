import { IDataObject, IExecuteFunctions, INodeProperties, sleep } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

interface RequestOptions { batching?: { batch?: { batchSize?: number; batchInterval?: number } }; timeout?: number; }

const WikiSpacesAddMemberOperate: ResourceOperations = {
	name: '添加知识空间成员',
	value: 'wiki:spaces:members:add',
	order: 95,
	options: [
		{
			displayName: '知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '成员类型',
			name: 'member_type',
			type: 'options',
			required: true,
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{ name: '群组ID', value: 'openchat' },
				{ name: '用户ID', value: 'userid' },
				{ name: '邮箱', value: 'email' },
				{ name: '部门ID', value: 'opendepartmentid' },
				{ name: 'Open ID', value: 'openid' },
				{ name: 'Union ID', value: 'unionid' },
			],
			default: 'openid',
			description: '要添加的成员或管理员的身份类型',
		},
		{
			displayName: '成员ID',
			name: 'member_id',
			type: 'string',
			required: true,
			default: '',
			description: '成员或管理员的ID，值的类型由成员类型参数决定',
		},
		{
			displayName: '角色',
			name: 'member_role',
			type: 'options',
			required: true,
			options: [
				{ name: '管理员', value: 'admin' },
				{ name: '成员', value: 'member' },
			],
			default: 'member',
			description: '成员的角色类型',
		},
		{
			displayName: '是否通知',
			name: 'need_notification',
			type: 'boolean',
			default: false,
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: -1 }, default: 50, description: '输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const memberType = this.getNodeParameter('member_type', index) as string;
		const memberId = this.getNodeParameter('member_id', index) as string;
		const memberRole = this.getNodeParameter('member_role', index) as string;
		const needNotification = this.getNodeParameter('need_notification', index) as boolean;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;
		const handleBatchDelay = async (): Promise<void> => { const batchSize = options.batching?.batch?.batchSize ?? -1; const batchInterval = options.batching?.batch?.batchInterval ?? 0; if (index > 0 && batchSize >= 0 && batchInterval > 0) { const effectiveBatchSize = batchSize > 0 ? batchSize : 1; if (index % effectiveBatchSize === 0) await sleep(batchInterval); } };
		await handleBatchDelay();

		const body: IDataObject = { member_type: memberType, member_id: memberId, member_role: memberRole };
		const qs: IDataObject = {};
		if (needNotification !== undefined) qs.need_notification = needNotification;

		const requestOptions: any = { method: 'POST', url: `/open-apis/wiki/v2/spaces/${spaceId}/members`, body, qs };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default WikiSpacesAddMemberOperate;
