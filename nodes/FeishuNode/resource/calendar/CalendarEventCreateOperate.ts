import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '创建日程',
	value: 'calendar:createEvent',
	order: 90,
	options: [
		{
			displayName: '日历 ID',
			name: 'calendar_id',
			type: 'string',
			required: true,
			default: '',
			description: '日历 ID。可以通过查询主日历信息、查询日历列表、搜索日历等接口获取。',
		},
		{
			displayName: '请求体',
			name: 'body',
			type: 'json',
			required: true,
			default: '{}',
			description: '参考：https://open.feishu.cn/document/server-docs/calendar-v4/calendar-event/create#requestBody',
		},
		{
			displayName: '幂等 Key',
			name: 'idempotency_key',
			type: 'string',
			default: '',
			description: '创建日程的幂等 key，该 key 在应用和日历维度下唯一，用于避免重复创建资源。',
		},
		{
			displayName: '用户 ID 类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			description: '用户 ID 类型。',
			default: 'open_id',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const calendarId = this.getNodeParameter('calendar_id', index) as string;
		const body = NodeUtils.getNodeJsonData(this, "body", index) as IDataObject;
		const idempotencyKey = this.getNodeParameter('idempotency_key', index, '') as string;
		const userIdType = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const qs: IDataObject = {};
		if (idempotencyKey) qs.idempotency_key = idempotencyKey;
		if (userIdType) qs.user_id_type = userIdType;

		const requestOptions: IDataObject = { method: 'POST', url: `/open-apis/calendar/v4/calendars/${calendarId}/events`, qs, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
