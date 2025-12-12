import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	sleep,
} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from "../../../help/utils/RequestUtils";

interface RequestOptions {
	batching?: { batch?: { batchSize?: number; batchInterval?: number } };
	timeout?: number;
}

const BitableParseUrlOperate: ResourceOperations = {
	name: '解析多维表格地址',
	value: 'bitable:parseUrl',
	order: 100,
	options: [
		{
			displayName: '多维表格地址',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
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
								{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: -1 }, default: 50, description: '输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。' },
								{ displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' },
							],
						},
					],
				},
				{ displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' },
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const url = this.getNodeParameter('url', index, '') as string;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;

		const handleBatchDelay = async (): Promise<void> => {
			const batchSize = options.batching?.batch?.batchSize ?? -1;
			const batchInterval = options.batching?.batch?.batchInterval ?? 0;
			if (index > 0 && batchSize >= 0 && batchInterval > 0) {
				const effectiveBatchSize = batchSize > 0 ? batchSize : 1;
				if (index % effectiveBatchSize === 0) await sleep(batchInterval);
			}
		};
		await handleBatchDelay();

		let data: IDataObject = {
			app_token: null,
			table_id: null,
			view_id: null
		};
		let matches = url.match(/\/base\/(.*?)(\?|$)/);
		if (matches) {
			data.app_token = matches[1];
		}else {
			matches = url.match(/\/wiki\/(.*?)(\?|$)/);
			if (matches) {
				let wikiToken = matches[1];
				// wiki 开头需要处理
				const res = await RequestUtils.request.call(this, {
					method: 'GET',
					url: '/open-apis/wiki/v2/spaces/get_node',
					qs: {
						token: wikiToken,
						obj_type: 'wiki'
					},
				})
				data.app_token = res?.data?.node?.obj_token
			}
		}
		matches = url.match(/table=(.*?)(&|$)/);
		if (matches) {
			data.table_id = matches[1];
		}
		matches = url.match(/view=(.*?)(&|$)/);
		if (matches) {
			data.view_id = matches[1];
		}

		return data;
	},
};

export default BitableParseUrlOperate;
