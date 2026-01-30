import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const DocGetRawContentOperate: ResourceOperations = {
	name: '获取文档纯文本内容',
	value: 'doc:getRawContent',
	order: 30,
	options: [
		{
			displayName: '文档 ID',
			name: 'document_id',
			type: 'string',
			required: true,
			default: '',
			description: '文档的唯一标识。',
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
		const document_id = this.getNodeParameter('document_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `/open-apis/docx/v1/documents/${document_id}/raw_content`,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default DocGetRawContentOperate;
