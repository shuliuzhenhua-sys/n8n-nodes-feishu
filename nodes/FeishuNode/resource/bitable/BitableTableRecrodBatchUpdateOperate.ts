import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

export default {
	name: '批量更新记录',
	value: 'bitable:table:record:batchUpdate',
	order: 220,
	options: [
		{
			displayName: '多维表格 App 的唯一标识',
			name: 'app_toke',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格 App 的唯一标识。不同形态的多维表格，其 app_token 的获取方式不同，参考<a href="https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/bitable-overview">多维表格 app_token 获取方式</a>获取。',
		},
		{
			displayName: '多维表格数据表的唯一标识',
			name: 'table_id',
			type: 'string',
			required: true,
			default: '',
			description: '你可通过多维表格 URL 获取 table_id',
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
			description: '用户 ID 类型。',
			default: 'open_id',
		},
		{
			displayName: '操作的唯一标识',
			name: 'client_toke',
			type: 'string',
			default: '',
			description:
				'操作的唯一标识，与接口返回值的 client_token 相对应，用于幂等的进行更新操作。此值为空表示将发起一次新的请求，此值非空表示幂等的进行更新操作',
		},
		{
			displayName: '是否忽略一致性读写检查',
			name: 'ignore_consistency_check',
			type: 'boolean',
			default: true,
		},

		{
			displayName: '请求体JSON',
			name: 'body',
			type: 'json',
			required: true,
			default: '{"records":[]}',
			description:
				'参考：https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/batch_update#requestBody',
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
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const client_token = this.getNodeParameter('client_toke', index) as string;
		const ignore_consistency_check = this.getNodeParameter(
			'ignore_consistency_check',
			index,
			true,
		) as boolean;
		const body = NodeUtils.getNodeJsonData(this, 'body', index) as IDataObject;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		const qs: any = {};
		if (user_id_type) qs.user_id_type = user_id_type;
		if (client_token) qs.client_token = client_token;
		qs.ignore_consistency_check = ignore_consistency_check;

		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_update`,
			qs,
			body: body,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
