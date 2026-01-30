/* eslint-disable n8n-nodes-base/node-param-type-options-password-missing */
import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '获取日程列表',
	value: 'calendar:listEvents',
	order: 60,
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
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: {
				minValue: 50,
				maxValue: 1000,
			},
			displayOptions: {
				show: {
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
		{
			displayName: '时间锚点',
			name: 'anchor_time',
			type: 'string',
			default: '',
			description:
				'时间锚点，Unix 时间戳（秒）。用于设置一个时间点，以便直接拉取该时间点之后的日程数据。',
		},
		{
			displayName: '增量同步标记',
			name: 'sync_token',
			type: 'string',
			default: '',
			description:
				'增量同步标记，第一次请求不填。当分页查询结束时返回，下次调用可用于增量获取变更数据。',
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
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const calendarId = this.getNodeParameter('calendar_id', index) as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 500) as number;
		const anchorTime = this.getNodeParameter('anchor_time', index, '') as string;
		const syncToken = this.getNodeParameter('sync_token', index, '') as string;
		const startTime = this.getNodeParameter('start_time', index, '') as string;
		const endTime = this.getNodeParameter('end_time', index, '') as string;
		const userIdType = this.getNodeParameter('user_id_type', index, 'open_id') as string;

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
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

			const requestOptions: IHttpRequestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: `/open-apis/calendar/v4/calendars/${calendarId}/events`,
				qs,
			};

			const response = await RequestUtils.request.call(this, requestOptions);

			const responseData = response as {
				items?: IDataObject[];
				page_token?: string;
				has_more?: boolean;
			};

			return {
				items: responseData.items || [],
				pageToken: responseData.page_token,
				hasMore: responseData.has_more || false,
			};
		};

		// 处理分页逻辑
		if (returnAll) {
			let allResults: IDataObject[] = [];
			let pageToken: string | undefined = undefined;
			const pageSize = 1000; // 使用最大分页大小以减少请求次数

			while (true) {
				const { items, pageToken: nextPageToken, hasMore } = await fetchPage(pageToken, pageSize);
				allResults = allResults.concat(items);

				// 检查是否还有更多数据
				if (!hasMore || !nextPageToken) {
					break;
				}

				pageToken = nextPageToken;
			}

			return allResults;
		} else {
			// 单次请求，返回限制数量的数据
			const { items } = await fetchPage(undefined, limit);
			return items;
		}
	},
} as ResourceOperations;
