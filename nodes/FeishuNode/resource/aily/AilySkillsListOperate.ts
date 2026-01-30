import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestMethods, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { timeoutOption, paginationOptions } from '../../../help/utils/sharedOptions';

const AilySkillsListOperate: ResourceOperations = {
	name: '查询技能列表',
	value: 'aily:skillsList',
	order: 40,
	options: [
		{
			displayName: '应用 ID',
			name: 'app_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily 应用 ID（spring_xxx__c），可以在 Aily 应用开发页面的浏览器地址里获取',
		},
		paginationOptions.returnAll,
		paginationOptions.limit(100),
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
		const app_id = this.getNodeParameter('app_id', index) as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 20) as number;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				page_size: pageSize,
			};

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions: IHttpRequestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: `/open-apis/aily/v1/apps/${app_id}/skills`,
				qs,
			};

			if (options.timeout) {
				requestOptions.timeout = options.timeout;
			}

			const response = await RequestUtils.request.call(this, requestOptions);

			const responseData = response as {
				skills?: IDataObject[];
				page_token?: string;
				has_more?: boolean;
			};

			return {
				skills: responseData.skills || [],
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
				const { skills, pageToken: nextPageToken, hasMore } = await fetchPage(pageToken, pageSize);
				allResults = allResults.concat(skills);

				// 检查是否还有更多数据
				if (!hasMore || !nextPageToken) {
					break;
				}

				pageToken = nextPageToken;
			}

			return allResults;
		} else {
			// 单次请求，返回限制数量的数据
			const { skills } = await fetchPage(undefined, limit);
			return skills;
		}
	},
};

export default AilySkillsListOperate;
