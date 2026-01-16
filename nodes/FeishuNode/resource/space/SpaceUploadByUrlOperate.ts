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

		// 从外部 URL 下载文件，确保正确处理二进制数据流并获取 Content-Type
		// 使用 encoding: 'arraybuffer' 确保以二进制流方式下载，避免字符编码转换导致乱码
		const response = (await this.helpers.httpRequest({
			method: 'GET',
			url,
			json: false,
			encoding: 'arraybuffer',
			returnFullResponse: true,
		})) as { body: Buffer | ArrayBuffer; headers: Record<string, string | string[] | undefined> };

		// 确保响应体是 Buffer 格式
		// arraybuffer 编码会返回 ArrayBuffer，需要转换为 Buffer
		const file = Buffer.isBuffer(response.body)
			? response.body
			: Buffer.from(response.body as ArrayBuffer);

		// 从响应头获取 Content-Type，如果没有则使用默认值
		let contentType: string = 'application/octet-stream';
		const contentTypeHeader = response.headers['content-type'] || response.headers['Content-Type'];
		if (typeof contentTypeHeader === 'string') {
			contentType = contentTypeHeader;
		} else if (Array.isArray(contentTypeHeader) && contentTypeHeader.length > 0) {
			contentType = contentTypeHeader[0];
		}

		// 清理 Content-Type（移除可能的参数，如 charset）
		const cleanContentType = contentType.split(';')[0].trim();

		const formData = new FormData();
		formData.append('file_name', file_name);
		formData.append('parent_type', parent_type);
		formData.append('parent_node', parent_node);
		formData.append('size', file.byteLength);
		formData.append('file', file, { contentType: cleanContentType, filename: file_name });

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/drive/v1/medias/upload_all`,
			body: formData,
		} as IExtendedHttpRequestOptions);
	},
} as ResourceOperations;
