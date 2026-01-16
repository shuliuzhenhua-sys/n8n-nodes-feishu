import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations, IExtendedHttpRequestOptions } from '../../../help/type/IResource';
import FormData from 'form-data';

export default {
	name: '上传素材通过Url',
	value: 'space:uploadByUrl',
	order: 50,
	options: [
		{
			displayName: '上传点的类型',
			name: 'parent_type',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: '旧版文档图片',
					value: 'doc_image',
				},
				{
					name: '新版文档图片',
					value: 'docx_image',
				},
				{
					name: '电子表格图片',
					value: 'sheet_image',
				},
				{
					name: '旧版文档文件',
					value: 'doc_file',
				},
				{
					name: '新版文档文件',
					value: 'docx_file',
				},
				{
					name: '电子表格文件',
					value: 'sheet_file',
				},
				{
					name: 'Vc 虚拟背景（灰度中，暂未开放）',
					value: 'vc_virtual_background',
				},
				{
					name: '多维表格图片',
					value: 'bitable_image',
				},
				{
					name: '多维表格文件',
					value: 'bitable_file',
				},
				{
					name: '同事圈（灰度中，暂未开放）',
					value: 'moments',
				},
				{
					name: '云文档导入文件',
					value: 'ccm_import_open',
				},
			],
			required: true,
			default: 'docx_image',
		},

		{
			displayName: '上传点的 Token',
			name: 'parent_node',
			type: 'string',
			default: '',
			required: true,
		},

		{
			displayName: '文件链接',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: '文件名称',
			name: 'file_name',
			type: 'string',
			default: '',
			required: true,
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_name = this.getNodeParameter('file_name', index) as string;
		const parent_type = this.getNodeParameter('parent_type', index) as string;
		const parent_node = this.getNodeParameter('parent_node', index) as string;
		const url = this.getNodeParameter('url', index) as string;

		const res = await this.helpers.request(url, {
			useStream: true,
		});

		// 流转换为 buffer
		const chunks: Buffer[] = [];
		for await (const chunk of res) {
			chunks.push(chunk);
		}
		const file = Buffer.concat(chunks);

		const formData = new FormData();
		formData.append('file_name', file_name);
		formData.append('parent_type', parent_type);
		formData.append('parent_node', parent_node);
		formData.append('size', file.byteLength);
		formData.append('file', file, { contentType: 'image/png', filename: file_name });

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/drive/v1/medias/upload_all`,
			formData: formData,
		} as IExtendedHttpRequestOptions);
	},
} as ResourceOperations;
