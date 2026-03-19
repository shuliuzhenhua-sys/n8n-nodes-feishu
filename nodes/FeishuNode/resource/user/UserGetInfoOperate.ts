import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const UserGetInfoOperate: ResourceOperations = {
	name: '获取用户信息',
	value: 'user:get',
	order: 10,
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
			description: '用户 ID 类型。',
			default: 'open_id',
		},
		{
			displayName: '用户ID',
			name: 'user_id',
			type: 'string',
			required: true,
			default: '',
			description: '用户ID。ID 类型与查询参数 user_id_type 保持一致。',
		},
		{
			displayName: '部门ID类型',
			name: 'department_id_type',
			type: 'options',
			options: [
				{ name: 'Department ID', value: 'department_id' },
				{ name: 'Open Department ID', value: 'open_department_id' },
			],
			description: '指定查询结果中的部门 ID 类型。',
			default: 'open_department_id',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_id = this.getNodeParameter('user_id', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const department_id_type = this.getNodeParameter('department_id_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		const qs: IDataObject = {};
		if (user_id_type) {
			qs.user_id_type = user_id_type;
		}
		if (department_id_type) {
			qs.department_id_type = department_id_type;
		}

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `/open-apis/contact/v3/users/${user_id}`,
			qs: qs,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default UserGetInfoOperate;
