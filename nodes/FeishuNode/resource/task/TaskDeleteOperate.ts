import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from '../../../help/utils/RequestUtils';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

export default {
	name: '删除任务',
	value: 'task:delete',
	order: 40,
	options: [
		{
			displayName: '任务ID',
			name: 'task_guid',
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
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const task_guid = this.getNodeParameter('task_guid', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const requestOptions: IHttpRequestOptions = {
			method: 'DELETE',
			url: `/open-apis/task/v2/tasks/${task_guid}`,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
