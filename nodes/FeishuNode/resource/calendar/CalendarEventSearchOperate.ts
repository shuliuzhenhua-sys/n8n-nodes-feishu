import { IDataObject, IExecuteFunctions, INodeProperties, sleep } from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import RequestUtils from '../../../help/utils/RequestUtils';

interface RequestOptions { batching?: { batch?: { batchSize?: number; batchInterval?: number } }; timeout?: number; }

export default {
	name: '搜索日程',
	value: 'calendar:searchEvents',
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
			displayName: '搜索关键字',
			name: 'query',
			type: 'string',
			required: true,
			default: '',
			description: '搜索关键字，用于模糊查询日程名称。如果日程名称包含下划线(_)，则必须精准查询。',
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			displayName: '搜索过滤器(filter对象)',
			name: 'filter',
			type: 'json',
			default: '{}',
			description: '参考 https://open.feishu.cn/document/server-docs/calendar-v4/calendar-event/search#requestBody',
		},
		{
			displayName: '分页标记',
			name: 'page_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			default: '',
			description: '分页标记，第一次请求不填，分页查询结果还有更多项时会返回新的 page_token。',
		},
		{
			displayName: '每页数量',
			name: 'page_size',
			type: 'number',
			default: 20,
			description: '一次调用所返回的最大日程数量。最小值为10，最大值为100。',
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
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: -1 }, default: 50, description: '输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const calendarId = this.getNodeParameter('calendar_id', index) as string;
		const query = this.getNodeParameter('query', index) as string;
		const filter = NodeUtils.getNodeJsonData(this, "filter", index) as IDataObject;
		const pageToken = this.getNodeParameter('page_token', index, '') as string;
		const pageSize = this.getNodeParameter('page_size', index, 20) as number;
		const userIdType = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;
		const handleBatchDelay = async (): Promise<void> => { const batchSize = options.batching?.batch?.batchSize ?? -1; const batchInterval = options.batching?.batch?.batchInterval ?? 0; if (index > 0 && batchSize >= 0 && batchInterval > 0) { const effectiveBatchSize = batchSize > 0 ? batchSize : 1; if (index % effectiveBatchSize === 0) await sleep(batchInterval); } };
		await handleBatchDelay();

		const qs: IDataObject = {};
		if (pageToken) qs.page_token = pageToken;
		if (pageSize) qs.page_size = pageSize;
		if (userIdType) qs.user_id_type = userIdType;

		const body: IDataObject = { query };
		if (Object.keys(filter).length > 0) body.filter = filter;

		const requestOptions: any = { method: 'POST', url: `/open-apis/calendar/v4/calendars/${calendarId}/events/search`, qs, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
