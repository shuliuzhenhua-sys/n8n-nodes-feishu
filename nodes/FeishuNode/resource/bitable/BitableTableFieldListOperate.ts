import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

export default {
	name: '列出字段',
	value: 'bitable:table:field:list',
	order: 60,
	options: [
		{
			displayName: '多维表格 Token',
			name: 'app_toke',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格 App 的唯一标识。',
		},
		{
			displayName: '多维表格 ID',
			name: 'table_id',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格数据表的唯一标识。',
		},

		{
			displayName: '视图 ID',
			name: 'view_id',
			type: 'string',
			default: '',
			description: '多维表格中视图的唯一标识。',
		},
		{
			displayName: '是否数组形式返回',
			name: 'text_field_as_array',
			type: 'boolean',
			default: false,
		},
		{
			displayName: '分页标记',
			name: 'page_toke',
			type: 'string',
			default: '',
			description:
				'分页标记，第一次请求不填，表示从头开始遍历；分页查询结果还有更多项时会同时返回新的 page_token，下次遍历可采用该 page_token 获取查询结果',
		},
		{
			displayName: '分页大小',
			name: 'page_size',
			type: 'number',
			default: 20,
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] },
				{ displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' },
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;

		const view_id = this.getNodeParameter('view_id', index) as string;
		const text_field_as_array = this.getNodeParameter('text_field_as_array', index) as boolean;
		const page_token = this.getNodeParameter('page_toke', index) as string;
		const page_size = this.getNodeParameter('page_size', index) as number;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const qs : any = {}
		if (view_id) qs.view_id = view_id;
		qs.text_field_as_array = text_field_as_array;
		if (page_token) qs.page_token = page_token;
		if (page_size) qs.page_size = page_size;

		const requestOptions: IDataObject = { method: 'GET', url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/fields`, qs };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
