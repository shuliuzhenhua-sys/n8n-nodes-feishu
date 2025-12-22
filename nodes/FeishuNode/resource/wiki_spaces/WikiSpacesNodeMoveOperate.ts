import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesNodeMoveOperate: ResourceOperations = {
	name: '移动知识空间节点',
	value: 'wiki:spaces:node:move',
	order: 90,
	options: [
		{
			displayName: '源知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '需要迁移的节点Token',
			name: 'node_token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: '目标父节点Token',
			name: 'target_parent_token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: '移动到的父节点token',
		},
		{
			displayName: '目标知识空间ID',
			name: 'target_space_id',
			type: 'string',
			default: '',
			description: '移动到的知识空间ID',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const nodeToken = this.getNodeParameter('node_token', index) as string;
		const targetParentToken = this.getNodeParameter('target_parent_token', index) as string;
		const targetSpaceId = this.getNodeParameter('target_space_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const body: IDataObject = {};
		if (targetParentToken) body.target_parent_token = targetParentToken;
		if (targetSpaceId) body.target_space_id = targetSpaceId;

		const requestOptions: IDataObject = { method: 'POST', url: `/open-apis/wiki/v2/spaces/${spaceId}/nodes/${nodeToken}/move`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default WikiSpacesNodeMoveOperate;
