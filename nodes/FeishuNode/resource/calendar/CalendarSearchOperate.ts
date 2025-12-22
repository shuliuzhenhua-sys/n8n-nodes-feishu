import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '搜索日历',
	value: 'calendar:search',
	options: [
		{
			displayName: '搜索关键字',
			name: 'query',
			type: 'string',
			required: true,
			default: '',
			description: '搜索关键字。接口将会搜索标题或描述中包含该关键字的公共日历或用户主日历。',
		},
		{
			displayName: '每页数量',
			name: 'page_size',
			type: 'number',
			default: 20,
			description: '一次请求返回的最大日历数量。最大值：50',
		},
		{
			displayName: '分页标记',
			name: 'page_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			default: '',
			description: '分页标记，第一次请求不填，表示从头开始遍历；分页查询结果还有更多项时会同时返回新的 page_token，下次遍历可采用该 page_token 获取查询结果',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const query = this.getNodeParameter('query', index) as string;
		const pageSize = this.getNodeParameter('page_size', index, 20) as number;
		const pageToken = this.getNodeParameter('page_token', index, '') as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const body: IDataObject = { query };
		const qs: IDataObject = {};
		if (pageSize) qs.page_size = pageSize;
		if (pageToken) qs.page_token = pageToken;

		const requestOptions: IDataObject = { method: 'POST', url: '/open-apis/calendar/v4/calendars/search', qs, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
