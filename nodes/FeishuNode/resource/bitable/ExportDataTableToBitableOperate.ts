import { IDataObject, IExecuteFunctions, INodeProperties, sleep } from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from '../../../help/utils/RequestUtils';

interface RequestOptions { batching?: { batch?: { batchSize?: number; batchInterval?: number } }; timeout?: number; }

// @ts-ignore
const ExportDataTableToBitableOperate: ResourceOperations = {
	name: '导出多维表格',
	description: '导出数据到飞书多维表格',
	value: 'bitable:aggregate:copyDataTableToBitable',
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

		// 是否自动映射
		{
			displayName: '是否自动映射字段',
			name: 'autoMapping',
			type: 'boolean',
			default: true,
		},
		{
			displayName: '导出的字段',
			name: 'fields',
			type: 'fixedCollection',
			default: [],
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					name: 'values',
					displayName: '字段映射',
					values: [
						{
							displayName: 'dataTable字段名称',
							name: 'field',
							type: 'string',
							default: '',
							requiresDataPath: 'single'
						},
						{
							displayName: '飞书字段名称',
							name: 'feishuField',
							type: 'string',
							default: '',
						},
					],
				},
			],
			displayOptions: {
				show: {
					autoMapping: [false],
				}
			}
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: -1 }, default: 50, description: '输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const items = this.getInputData()
		const rows = items.map((item) => item.json);
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;

		// 如果没有数据，则返回空
		if (rows.length === 0) return {};

		let autoMapping = this.getNodeParameter('autoMapping', index) as boolean;
		let fieldMapping = {}
		if (!autoMapping){
			let fieldOptions = this.getNodeParameter('fields', index) as IDataObject;
			let fieldMappingList = fieldOptions.values as IDataObject[];
			for (let fieldMappingItem of fieldMappingList) {
				// @ts-ignore
				fieldMapping[fieldMappingItem.field] = fieldMappingItem.feishuField;
			}
		}else{
			Object.keys(rows[0]).forEach((key) => {
				// @ts-ignore
				fieldMapping[key] = key;
			})
		}


		let records = []
		for (const row of rows) {
			let fields = {}
			for (const field of Object.keys(fieldMapping)) {
				// @ts-ignore
				fields[fieldMapping[field]] = row[field]
			}
			records.push({
				fields: fields
			})
		}

		const qs : any = {}
		const body = {
			"records": records
		}
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;

		const handleBatchDelay = async (): Promise<void> => { const batchSize = options.batching?.batch?.batchSize ?? -1; const batchInterval = options.batching?.batch?.batchInterval ?? 0; if (index > 0 && batchSize >= 0 && batchInterval > 0) { const effectiveBatchSize = batchSize > 0 ? batchSize : 1; if (index % effectiveBatchSize === 0) await sleep(batchInterval); } };
		await handleBatchDelay();

		const requestOptions: any = { method: 'POST', url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_create`, qs, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default ExportDataTableToBitableOperate;
