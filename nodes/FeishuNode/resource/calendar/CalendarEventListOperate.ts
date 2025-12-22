/* eslint-disable n8n-nodes-base/node-param-type-options-password-missing */
import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '获取日程列表',
	value: 'calendar:listEvents',
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
			displayName: '每页数量',
			name: 'page_size',
			type: 'number',
			default: 500,
			description: '一次请求要求返回的最大日程数量。取值范围：50 ~ 1000',
		},
		{
			displayName: '分页标记',
			name: 'page_token',
			type: 'string',
			default: '',
			description: '分页标记，第一次请求不填，分页查询结果还有更多项时会返回新的 page_token。',
		},
		{
			displayName: '时间锚点',
			name: 'anchor_time',
			type: 'string',
			default: '',
			description: '时间锚点，Unix 时间戳（秒）。用于设置一个时间点，以便直接拉取该时间点之后的日程数据。',
		},
		{
			displayName: '增量同步标记',
			name: 'sync_token',
			type: 'string',
			default: '',
			description: '增量同步标记，第一次请求不填。当分页查询结束时返回，下次调用可用于增量获取变更数据。',
		},
		{
			displayName: '开始时间',
			name: 'start_time',
			type: 'string',
			default: '',
			description: '时间区间的开始时间，Unix 时间戳（秒），与结束时间搭配使用。',
		},
		{
			displayName: '结束时间',
			name: 'end_time',
			type: 'string',
			default: '',
			description: '时间区间的结束时间，Unix 时间戳（秒），与开始时间搭配使用。',
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
		const pageSize = this.getNodeParameter('page_size', index, 500) as number;
		const anchorTime = this.getNodeParameter('anchor_time', index, '') as string;
		const pageToken = this.getNodeParameter('page_token', index, '') as string;
		const syncToken = this.getNodeParameter('sync_token', index, '') as string;
		const startTime = this.getNodeParameter('start_time', index, '') as string;
		const endTime = this.getNodeParameter('end_time', index, '') as string;
		const userIdType = this.getNodeParameter('user_id_type', index, 'open_id') as string;

		const qs: IDataObject = {
			page_size: pageSize,
			user_id_type: userIdType,
		};

		if (anchorTime) {
			qs.anchor_time = anchorTime;
		}

		if (pageToken) {
			qs.page_token = pageToken;
		}

		if (syncToken) {
			qs.sync_token = syncToken;
		}

		if (startTime) {
			qs.start_time = startTime;
		}

		if (endTime) {
			qs.end_time = endTime;
		}

		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const requestOptions: IDataObject = { method: 'GET', url: `/open-apis/calendar/v4/calendars/${calendarId}/events`, qs };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
