import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const UserFindByDepartmentOperate: ResourceOperations = {
	name: '获取部门直属用户列表',
	value: 'user:findByDepartment',
	options: [
		{
			displayName: '部门ID',
			name: 'department_id',
			type: 'string',
			required: true,
			default: '',
			description: '部门 ID，根部门为 0。',
		},
		{
			displayName: '部门ID类型',
			name: 'department_id_type',
			type: 'options',
			options: [
				{
					name: 'Open Department ID',
					value: 'open_department_id',
					description: '由系统自动生成的部门ID，ID前缀固定为 od-，在租户内全局唯一',
				},
				{
					name: 'Department ID',
					value: 'department_id',
					description: '支持用户自定义配置的部门ID',
				},
			],
			description: '此次调用中的部门 ID 类型',
			default: 'open_department_id',
		},
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
		const department_id = this.getNodeParameter('department_id', index) as string;
		let department_id_type = this.getNodeParameter('department_id_type', index, 'open_department_id') as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 50) as number;

		if (department_id === '0' && department_id_type === 'open_department_id') {
			department_id_type = 'department_id';
		}

		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				department_id,
				department_id_type,
				user_id_type,
				page_size: pageSize,
			};

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: '/open-apis/contact/v3/users/find_by_department',
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

		if (returnAll) {
			let allResults: IDataObject[] = [];
			let pageToken: string | undefined = undefined;
			const pageSize = 50;

			while (true) {
				const { items, pageToken: nextPageToken, hasMore } = await fetchPage(pageToken, pageSize);
				allResults = allResults.concat(items);

				if (!hasMore || !nextPageToken) {
					break;
				}

				pageToken = nextPageToken;
			}

			return allResults;
		}

		const { items } = await fetchPage(undefined, limit);
		return items;
	},
};

export default UserFindByDepartmentOperate;
