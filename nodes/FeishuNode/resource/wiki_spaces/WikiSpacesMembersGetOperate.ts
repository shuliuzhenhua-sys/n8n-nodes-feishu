import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesGetMembersOperate: ResourceOperations = {
	name: '获取知识空间成员列表',
	value: 'wiki:spaces:members:get',
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
				minValue: 1,
				maxValue: 50,
			},
			displayOptions: {
				show: {
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 50) as number;
		const spaceId = this.getNodeParameter('space_id', index) as string;

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				page_size: pageSize,
			};

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions: IDataObject = {
				method: 'GET' as IHttpRequestMethods,
				url: `/open-apis/wiki/v2/spaces/${spaceId}/members`,
				qs,
			};

			const response = await RequestUtils.request.call(this, requestOptions);

			const responseData = response as {
				members?: IDataObject[];
				page_token?: string;
				has_more?: boolean;
			};

			return {
				items: responseData.members || [],
				pageToken: responseData.page_token,
				hasMore: responseData.has_more || false,
			};
		};

		// 处理分页逻辑
		if (returnAll) {
			let allResults: IDataObject[] = [];
			let pageToken: string | undefined = undefined;
			const pageSize = 50; // 使用最大分页大小以减少请求次数

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

export default WikiSpacesGetMembersOperate;
