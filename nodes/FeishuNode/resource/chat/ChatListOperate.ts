import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const ChatListOperate: ResourceOperations = {
	name: '获取用户或机器人所在的群列表',
	value: 'chat:list',
	options: [
		{
			displayName: '用户ID类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			description: '用户 ID 类型',
			default: 'open_id',
		},
		{
			displayName: '群组排序方式',
			name: 'sort_type',
			type: 'options',
			options: [
				{ name: '按群组创建时间升序排列', value: 'ByCreateTimeAsc' },
				{ name: '按群组活跃时间降序排列', value: 'ByActiveTimeDesc' },
			],
			description: '群组排序方式。注意：使用 ByActiveTimeDesc 排序方式可能会造成群组遗漏。',
			default: 'ByCreateTimeAsc',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: {
				minValue: 1,
				maxValue: 100,
			},
			displayOptions: {
				show: {
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 20) as number;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const sort_type = this.getNodeParameter('sort_type', index, 'ByCreateTimeAsc') as string;

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				user_id_type,
				sort_type,
				page_size: pageSize,
			};

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: '/open-apis/im/v1/chats',
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
};

export default ChatListOperate;

