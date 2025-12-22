import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpreadsheetValuesImageOperate: ResourceOperations = {
	name: '写入图片',
	value: 'spreadsheet:valuesImage',
	order: 70,
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
			displayName: '范围',
			name: 'range',
			type: 'string',
			required: true,
			default: '',
			description:
				'指定写入图片的单元格。格式为 &lt;sheetId&gt;!&lt;开始单元格&gt;:&lt;结束单元格&gt;。',
		},
		{
			displayName: '图片二进制字段',
			name: 'imageParameterName',
			type: 'string',
			required: true,
			default: '',
			description: '需要写入的图片的二进制流。',
		},
		{
			displayName: '图片名称',
			name: 'name',
			type: 'string',
			required: true,
			default: '',
			description: '写入的图片名称，需加后缀名。',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spreadsheetToken = this.getNodeParameter('spreadsheetToke', index) as string;
		const range = this.getNodeParameter('range', index) as string;
		const imageParameterName = this.getNodeParameter('imageParameterName', index) as string;
		const name = this.getNodeParameter('name', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const binaryData = await this.helpers.getBinaryDataBuffer(index, imageParameterName);
		const body: IDataObject = { range, image: Array.from(binaryData), name };
		const requestOptions: IDataObject = { method: 'POST', url: `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values_image`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default SpreadsheetValuesImageOperate;
