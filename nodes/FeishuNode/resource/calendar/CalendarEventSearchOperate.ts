import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import RequestUtils from '../../../help/utils/RequestUtils';
import { timeoutOption, paginationOptions } from '../../../help/utils/sharedOptions';

export default {
	name: '搜索日程',
	value: 'calendar:searchEvents',
	order: 80,
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
			description:
				'参考 https://open.feishu.cn/document/server-docs/calendar-v4/calendar-event/search#requestBody',
		},
		paginationOptions.returnAll,
		paginationOptions.limit(100, 10),
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
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const calendarId = this.getNodeParameter('calendar_id', index) as string;
		const query = this.getNodeParameter('query', index) as string;
		const filter = NodeUtils.getNodeJsonData(this, 'filter', index) as IDataObject;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 20) as number;
		const userIdType = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				page_size: pageSize,
			};

			if (userIdType) {
				qs.user_id_type = userIdType;
			}

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const body: IDataObject = { query };
			if (Object.keys(filter).length > 0) {
				body.filter = filter;
			}

			const requestOptions: IHttpRequestOptions = {
				method: 'POST' as IHttpRequestMethods,
				url: `/open-apis/calendar/v4/calendars/${calendarId}/events/search`,
				qs,
				body,
			};

			if (options.timeout) {
				requestOptions.timeout = options.timeout;
			}

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
			const pageSize = 100; // 使用最大分页大小以减少请求次数

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
