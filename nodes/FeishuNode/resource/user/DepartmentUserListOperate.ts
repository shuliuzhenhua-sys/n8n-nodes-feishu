import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const DepartmentUserListOperate: ResourceOperations = {
	name: '获取部门直属用户列表',
	value: 'department:userList',
	options: [
		{
			displayName: '部门 ID',
			name: 'department_id',
			type: 'string',
			required: true,
			default: '0',
			description: '部门 ID，ID 类型与 department_id_type 的取值保持一致。根部门的部门 ID 为 0。',
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
			default: 'open_id',
		},
		{
			displayName: '部门 ID 类型',
			name: 'department_id_type',
			type: 'options',
			options: [
				{ name: 'Department ID', value: 'department_id' },
				{ name: 'Open Department ID', value: 'open_department_id' },
			],
			default: 'open_department_id',
			description: '此次调用中使用的部门 ID 类型',
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
		{
			displayName: '获取部门直属用户列表数据中可能存在重复用户数据，这是预期行为，因为有的用户存在多个部门。如需去重请在后续节点自行使用 Remove Duplicates 节点去重。',
			name: 'duplicateNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Batching',
					name: 'batching',
					placeholder: 'Add Batching',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: false,
					},
					default: {
						batch: {},
					},
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{
									displayName: 'Items per Batch',
									name: 'batchSize',
									type: 'number',
									typeOptions: {
										minValue: 1,
									},
									default: 50,
									description:
										'每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
								},
								{
									displayName: 'Batch Interval (Ms)',
									name: 'batchInterval',
									type: 'number',
									typeOptions: {
										minValue: 0,
									},
									default: 1000,
									description: '每批请求之间的时间（毫秒）。0 表示禁用。',
								},
							],
						},
					],
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 0,
					description:
						'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const department_id = this.getNodeParameter('department_id', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const department_id_type = this.getNodeParameter('department_id_type', index, 'open_department_id') as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 50) as number;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 统一的请求函数
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				user_id_type,
				department_id_type,
				department_id,
				page_size: pageSize,
			};

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions: IDataObject = {
				method: 'GET' as IHttpRequestMethods,
				url: '/open-apis/contact/v3/users/find_by_department',
				qs,
			};

			// 添加超时配置
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

export default DepartmentUserListOperate;
