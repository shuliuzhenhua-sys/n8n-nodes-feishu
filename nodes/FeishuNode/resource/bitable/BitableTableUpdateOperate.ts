import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

export default {
	name: '更新数据表',
	value: 'bitable:table:update',
	order: 90,
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
			displayName: '表格新名称',
			name: 'name',
			type: 'string',
			required: true,
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
					typeOptions: { multipleValues: false },
					default: { batch: {} },
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{
									displayName: 'Items per Batch',
									name: 'batchSize',
									type: 'number',
									typeOptions: { minValue: 1 },
									default: 50,
									description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
								},
								{
									displayName: 'Batch Interval (Ms)',
									name: 'batchInterval',
									type: 'number',
									typeOptions: { minValue: 0 },
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
					typeOptions: { minValue: 0 },
					default: 0,
					description:
						'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const name = this.getNodeParameter('name', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const requestOptions: IHttpRequestOptions = {
			method: 'PATCH',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}`,
			body: { name },
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
