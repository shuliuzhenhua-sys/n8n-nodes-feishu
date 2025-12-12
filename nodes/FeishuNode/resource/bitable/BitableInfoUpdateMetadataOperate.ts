import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	sleep,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

interface RequestOptions {
	batching?: { batch?: { batchSize?: number; batchInterval?: number } };
	timeout?: number;
}

const BitableInfoUpdateMetadataOperate: ResourceOperations = {
	name: '更新多维表格元数据',
	value: 'bitable:updateMetadata',
	order: 100,
	options: [
		{
			displayName: '多维表格 Token',
			name: 'app_toke',
			type: 'string',
			required: true,
			default: '',
			description: '目标多维表格的 App token。',
		},
		{
			displayName: '多维表格名称',
			name: 'name',
			type: 'string',
			default: '',
			description: '多维表格 App 名称。',
		},
		{
			displayName: '是否开启高级权限',
			name: 'enable_advanced_permissions',
			type: 'boolean',
			default: false,
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
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const name = this.getNodeParameter('name', index, '') as string;
		const enable_advanced_permissions = this.getNodeParameter('enable_advanced_permissions', index, false) as boolean;
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

		const body: IDataObject = {};
		if (name) body.name = name;
		body.enable_advanced_permissions = enable_advanced_permissions;

		const requestOptions: any = { method: 'PUT', url: `/open-apis/bitable/v1/apps/${app_token}`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default BitableInfoUpdateMetadataOperate;
