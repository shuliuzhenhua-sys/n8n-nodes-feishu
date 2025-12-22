import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const UserBatchGetOperate: ResourceOperations = {
	name: '批量获取用户信息',
	value: 'user:batchGet',
	options: [
		{
			displayName: '用户ID列表',
			name: 'user_ids',
			type: 'string',
			required: true,
			default: '',
			description: '用户ID列表，支持两种格式：1) 逗号分隔的字符串，如 "id1,id2,id3"；2) JSON数组，如 ["id1","id2","id3"]。单次请求最多50个用户ID。',
		},
		{
			displayName: '用户ID类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{
					name: 'Open ID',
					value: 'open_id',
					description: '标识一个用户在某个应用中的身份',
				},
				{
					name: 'Union ID',
					value: 'union_id',
					description: '标识一个用户在某个应用开发商下的身份',
				},
				{
					name: 'User ID',
					value: 'user_id',
					description: '标识一个用户在某个租户内的身份',
				},
			],
			description: '用户 ID 类型',
			default: 'open_id',
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
			description: '指定查询结果中的部门 ID 类型',
			default: 'open_department_id',
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
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_ids_input = this.getNodeParameter('user_ids', index);
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const department_id_type = this.getNodeParameter('department_id_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};

		// 解析用户ID列表，支持 JSON 数组和逗号分隔字符串两种格式
		let user_ids: string[];

		if (Array.isArray(user_ids_input)) {
			// 直接传入数组
			user_ids = user_ids_input.map((id) => String(id).trim()).filter((id) => id);
		} else {
			const user_ids_str = String(user_ids_input).trim();
			if (user_ids_str.startsWith('[')) {
				// JSON 数组格式
				try {
					const parsed = JSON.parse(user_ids_str);
					if (!Array.isArray(parsed)) {
						throw new Error('JSON 格式错误，期望数组');
					}
					user_ids = parsed.map((id: any) => String(id).trim()).filter((id: string) => id);
				} catch (e) {
					throw new Error('用户ID列表 JSON 格式解析失败: ' + (e as Error).message);
				}
			} else {
				// 逗号分隔格式
				user_ids = user_ids_str.split(',').map((id) => id.trim()).filter((id) => id);
			}
		}

		if (user_ids.length === 0) {
			throw new Error('用户ID列表不能为空');
		}

		if (user_ids.length > 50) {
			throw new Error('单次请求最多50个用户ID');
		}

		// 构建查询参数，user_ids 需要多次传递
		const qs: IDataObject = {
			user_id_type,
			department_id_type,
		};

		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'GET',
			url: '/open-apis/contact/v3/users/batch',
			qs,
			qsStringifyOptions: {
				arrayFormat: 'repeat',
			},
		};

		// 添加 user_ids 数组参数
		(requestOptions.qs as IDataObject).user_ids = user_ids;

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default UserBatchGetOperate;
