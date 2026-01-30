import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const DocCreateOperate: ResourceOperations = {
	name: '创建文档',
	value: 'doc:create',
	order: 10,
	options: [
		{
			displayName: '文档标题',
			name: 'title',
			type: 'string',
			default: '',
			description: '文档标题，只支持纯文本, 长度范围：1 字符 ～ 800 字符',
		},
		{
			displayName: '文件夹 Token',
			name: 'folder_toke',
			type: 'string',
			default: '',
			description: '指定文档所在文件夹的 Token。不传或传空表示根目录。',
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
		const title = this.getNodeParameter('title', index) as string;
		const folder_token = this.getNodeParameter('folder_toke', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const body: IDataObject = {};
		if (title) body.title = title;
		if (folder_token) body.folder_token = folder_token;

		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/docx/v1/documents',
			body,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default DocCreateOperate;
