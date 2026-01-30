import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const DocGetAllBlocksOperate: ResourceOperations = {
	name: '获取文档所有块',
	value: 'doc:getAllBlocks',
	order: 50,
	options: [
		{
			displayName: '文档 ID',
			name: 'document_id',
			type: 'string',
			required: true,
			default: '',
			description: '文档的唯一标识。',
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
				maxValue: 500,
			},
			displayOptions: {
				show: {
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
		{
			displayName: '文档版本',
			name: 'document_revision_id',
			type: 'number',
			default: -1,
			description: '查询的文档版本，-1 表示文档最新版本。',
		},
		{
			displayName: '用户 ID 类型',
			name: 'user_id_type',
			type: 'options',
			default: 'open_id',
			options: [
				{
					name: 'Open_id',
					value: 'open_id',
				},
				{
					name: 'Union_id',
					value: 'union_id',
				},
				{
					name: 'User_id',
					value: 'user_id',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const document_id = this.getNodeParameter('document_id', index) as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 500) as number;
		const document_revision_id = this.getNodeParameter('document_revision_id', index, -1) as number;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				page_size: pageSize,
				document_revision_id,
				user_id_type,
			};

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions: IHttpRequestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: `/open-apis/docx/v1/documents/${document_id}/blocks`,
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
			const pageSize = 500; // 使用最大分页大小以减少请求次数

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

export default DocGetAllBlocksOperate;
