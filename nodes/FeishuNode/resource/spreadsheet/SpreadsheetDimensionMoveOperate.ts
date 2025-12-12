import { IDataObject, IExecuteFunctions, INodeProperties, sleep } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

interface RequestOptions { batching?: { batch?: { batchSize?: number; batchInterval?: number } }; timeout?: number; }

const SpreadsheetDimensionMoveOperate: ResourceOperations = {
	name: '移动行列',
	value: 'spreadsheet:moveDimension',
	order: 90,
	options: [
		{
			displayName: '电子表格 Token',
			name: 'spreadsheet_toke',
			type: 'string',
			required: true,
			default: '',
			description: '电子表格的 token。',
		},
		{
			displayName: '工作表 ID',
			name: 'sheet_id',
			type: 'string',
			required: true,
			default: '',
			description: '工作表的 ID。',
		},
		{
			displayName: '移动的维度',
			name: 'major_dimension',
			type: 'options',
			options: [
				{ name: '行', value: 'ROWS' },
				{ name: '列', value: 'COLUMNS' },
			],
			required: true,
			default: 'ROWS',
			description: '移动的维度。',
		},
		{
			displayName: '起始位置',
			name: 'start_index',
			type: 'number',
			default: 0,
			description: '要移动的行或列的起始位置。从 0 开始计数。',
		},
		{
			displayName: '结束位置',
			name: 'end_index',
			type: 'number',
			default: 0,
			description: '要移动的行或列结束的位置。从 0 开始计数。',
		},
		{
			displayName: '目标位置',
			name: 'destination_index',
			type: 'number',
			default: null,
			required: true,
			description: '移动的目标位置行或者列。',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: -1 }, default: 50, description: '输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spreadsheet_token = this.getNodeParameter('spreadsheet_toke', index) as string;
		const sheet_id = this.getNodeParameter('sheet_id', index) as string;
		const major_dimension = this.getNodeParameter('major_dimension', index) as string;
		const start_index = this.getNodeParameter('start_index', index) as number;
		const end_index = this.getNodeParameter('end_index', index) as number;
		const destination_index = this.getNodeParameter('destination_index', index) as number;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;
		const handleBatchDelay = async (): Promise<void> => { const batchSize = options.batching?.batch?.batchSize ?? -1; const batchInterval = options.batching?.batch?.batchInterval ?? 0; if (index > 0 && batchSize >= 0 && batchInterval > 0) { const effectiveBatchSize = batchSize > 0 ? batchSize : 1; if (index % effectiveBatchSize === 0) await sleep(batchInterval); } };
		await handleBatchDelay();

		const body: IDataObject = { source: { major_dimension, start_index, end_index }, destination_index };
		const requestOptions: any = { method: 'POST', url: `/open-apis/sheets/v3/spreadsheets/${spreadsheet_token}/sheets/${sheet_id}/move_dimension`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default SpreadsheetDimensionMoveOperate;
