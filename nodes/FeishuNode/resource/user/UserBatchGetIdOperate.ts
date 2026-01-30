import { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const UserBatchGetIdOperate: ResourceOperations = {
	name: '通过手机号或邮箱获取用户 ID',
	value: 'user:batchGetId',
	order: 30,
	options: [
		{
			displayName: '返回的用户ID类型',
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
			displayName: '用户邮箱列表',
			name: 'emails',
			type: 'json',
			default: '[]',
			description: '要查询的用户邮箱，最多可传入 50 条。',
		},
		{
			displayName: '用户手机号列表',
			name: 'mobiles',
			type: 'json',
			default: '[]',
			description: '要查询的用户手机号，最多可传入 50 条。',
		},
		{
			displayName: '是否包含离职员工',
			name: 'include_resigned',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [batchingOption, timeoutOption],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const emails = this.getNodeParameter('emails', index, [], {
			ensureType: 'json',
		}) as [];
		const mobiles = this.getNodeParameter('mobiles', index, [], {
			ensureType: 'json',
		}) as [];
		const include_resigned = this.getNodeParameter('include_resigned', index) as boolean;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		const body: IDataObject = {};
		if (emails) {
			body.emails = emails;
		}
		if (mobiles) {
			body.mobiles = mobiles;
		}
		body.include_resigned = include_resigned;

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/contact/v3/users/batch_get_id',
			qs: {
				user_id_type,
			},
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default UserBatchGetIdOperate;
