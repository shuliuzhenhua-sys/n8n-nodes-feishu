import { IDataObject, IExecuteFunctions, INodeProperties, sleep } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

interface RequestOptions { batching?: { batch?: { batchSize?: number; batchInterval?: number } }; timeout?: number; }

const SpreadsheetDimensionInsertOperate: ResourceOperations = {
	name: '插入行列',
	value: 'spreadsheet:insertDimension',
	order: 90,
	options: [
		{
			displayName: '电子表格 Token',
			name: 'spreadsheetToke',
			type: 'string',
			required: true,
			default: '',
			description: '电子表格的 token。',
		},
		{
			displayName: '工作表 ID',
			name: 'sheetId',
			type: 'string',
			required: true,
			default: '',
			description: '电子表格工作表的 ID。',
		},
		{
			displayName: '更新的维度',
			name: 'majorDimension',
			type: 'options',
			options: [
				{ name: '行', value: 'ROWS' },
				{ name: '列', value: 'COLUMNS' },
			],
			required: true,
			default: 'ROWS',
			description: '要更新的维度。',
		},
		{
			displayName: '起始位置',
			name: 'startIndex',
			type: 'number',
			required: true,
			default: 0,
			description: '插入的行或列的起始位置。从 0 开始计数。',
		},
		{
			displayName: '结束位置',
			name: 'endIndex',
			type: 'number',
			required: true,
			default: 1,
			description: '插入的行或列结束的位置。从 0 开始计数。',
		},
		{
			displayName: '继承样式',
			name: 'inheritStyle',
			type: 'options',
			options: [
				{ name: '不继承', value: '' },
				{ name: '继承起始位置的样式', value: 'BEFORE' },
				{ name: '继承结束位置的样式', value: 'AFTER' },
			],
			default: '',
			description: '插入的空白行或列是否继承表中的单元格样式。',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: -1 }, default: 50, description: '输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spreadsheetToken = this.getNodeParameter('spreadsheetToke', index) as string;
		const sheetId = this.getNodeParameter('sheetId', index) as string;
		const majorDimension = this.getNodeParameter('majorDimension', index) as string;
		const startIndex = this.getNodeParameter('startIndex', index) as number;
		const endIndex = this.getNodeParameter('endIndex', index) as number;
		const inheritStyle = this.getNodeParameter('inheritStyle', index) as string;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;
		const handleBatchDelay = async (): Promise<void> => { const batchSize = options.batching?.batch?.batchSize ?? -1; const batchInterval = options.batching?.batch?.batchInterval ?? 0; if (index > 0 && batchSize >= 0 && batchInterval > 0) { const effectiveBatchSize = batchSize > 0 ? batchSize : 1; if (index % effectiveBatchSize === 0) await sleep(batchInterval); } };
		await handleBatchDelay();

		const body: IDataObject = { dimension: { sheetId, majorDimension, startIndex, endIndex } };
		if (inheritStyle) body.inheritStyle = inheritStyle;

		const requestOptions: any = { method: 'POST', url: `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/insert_dimension_range`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default SpreadsheetDimensionInsertOperate;
