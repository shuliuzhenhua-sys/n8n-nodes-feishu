import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

// 导出任务状态枚举
const JOB_STATUS = {
	SUCCESS: 0,
	INITIALIZING: 1,
	PROCESSING: 2,
	INTERNAL_ERROR: 3,
	FILE_TOO_LARGE: 107,
	TIMEOUT: 108,
	BLOCK_NO_PERMISSION: 109,
	NO_PERMISSION: 110,
	FILE_DELETED: 111,
	COPY_IN_PROGRESS: 122,
	FILE_NOT_FOUND: 123,
	TOO_MANY_IMAGES: 6000,
} as const;

// 错误消息映射
const JOB_ERROR_MESSAGES: Record<number, string> = {
	[JOB_STATUS.INTERNAL_ERROR]: '内部错误',
	[JOB_STATUS.FILE_TOO_LARGE]: '导出文档过大',
	[JOB_STATUS.TIMEOUT]: '处理超时',
	[JOB_STATUS.BLOCK_NO_PERMISSION]: '导出内容块无权限',
	[JOB_STATUS.NO_PERMISSION]: '无权限',
	[JOB_STATUS.FILE_DELETED]: '导出文档已删除',
	[JOB_STATUS.COPY_IN_PROGRESS]: '创建副本中禁止导出',
	[JOB_STATUS.FILE_NOT_FOUND]: '导出文档不存在',
	[JOB_STATUS.TOO_MANY_IMAGES]: '导出文档图片过多',
};

const SpaceExportOperate: ResourceOperations = {
	name: '导出云文档',
	value: 'space:export',
	options: [
		{
			displayName: '云文档类型',
			name: 'type',
			type: 'options',
			options: [
				{ name: '飞书多维表格', value: 'bitable' },
				{ name: '旧版飞书文档（已不推荐使用）', value: 'doc' },
				{ name: '新版飞书文档', value: 'docx' },
				{ name: '飞书电子表格', value: 'sheet' },
			],
			required: true,
			default: 'docx',
			description: '要导出的云文档的类型。可通过云文档的链接判断。',
		},
		{
			displayName: '文档Token',
			name: 'token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			required: true,
			default: '',
			description: '要导出的云文档的 token。最大长度 27 字符。',
		},
		{
			displayName: '导出文件格式',
			name: 'file_extension',
			type: 'options',
			options: [
				{ name: 'Microsoft Word 格式 (DOCX)', value: 'docx' },
				{ name: 'PDF 格式 (PDF)', value: 'pdf' },
				{ name: 'Microsoft Excel 格式 (XLSX)', value: 'xlsx' },
				{ name: 'CSV 格式 (CSV)', value: 'csv' },
			],
			required: true,
			default: 'docx',
			description:
				'将云文档导出为本地文件后的扩展名。doc/docx 支持导出 docx/pdf；sheet/bitable 支持导出 xlsx/csv。',
		},
		{
			displayName: '子表ID',
			name: 'sub_id',
			type: 'string',
			default: '',
			description:
				'导出飞书电子表格或多维表格为 CSV 文件时，需传入电子表格工作表的 ID 或多维表格数据表的 ID。电子表格可调用获取工作表接口获取返回的 sheet_id；多维表格可调用列出数据表接口获取返回的 table_id。',
			displayOptions: {
				show: {
					type: ['sheet', 'bitable'],
					file_extension: ['csv'],
				},
			},
		},
		{
			displayName: '二进制输出字段',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description: '输出二进制文件数据的字段名称。',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: '自定义文件名',
					name: 'fileName',
					type: 'string',
					default: '',
					description: '自定义保存的文件名（包含扩展名，如 myfile.pdf）。留空则使用原文档名称。',
				},
				{
					displayName: '轮询间隔 (毫秒)',
					name: 'pollInterval',
					type: 'number',
					typeOptions: {
						minValue: 1000,
					},
					default: 2000,
					description: '查询导出任务状态的轮询间隔时间（毫秒）。',
				},
				{
					displayName: '最大轮询次数',
					name: 'maxPolls',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 60,
					description: '查询导出任务状态的最大轮询次数。超过后将抛出超时错误。',
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 0,
					description:
						'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const type = this.getNodeParameter('type', index) as string;
		const token = this.getNodeParameter('token', index) as string;
		const file_extension = this.getNodeParameter('file_extension', index) as string;
		const sub_id = this.getNodeParameter('sub_id', index, '') as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index, 'data') as string;
		const options = this.getNodeParameter('options', index, {}) as {
			fileName?: string;
			pollInterval?: number;
			maxPolls?: number;
			timeout?: number;
		};

		const pollInterval = options.pollInterval || 2000;
		const maxPolls = options.maxPolls || 60;

		// 构建请求选项的基础配置
		const baseRequestOptions: IDataObject = {};
		if (options.timeout) {
			baseRequestOptions.timeout = options.timeout;
		}

		// 1. 创建导出任务
		const createBody: IDataObject = {
			type,
			token,
			file_extension,
		};

		if ((type === 'sheet' || type === 'bitable') && file_extension === 'csv' && sub_id) {
			createBody.sub_id = sub_id;
		}

		const createResponse = await RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/export_tasks',
			body: createBody,
			...baseRequestOptions,
		});

		const ticket = (createResponse as IDataObject).ticket as string;
		if (!ticket) {
			throw new NodeOperationError(this.getNode(), '创建导出任务失败：未返回 ticket');
		}

		// 2. 轮询查询导出任务结果
		let pollCount = 0;
		let exportResult: IDataObject | null = null;

		while (pollCount < maxPolls) {
			const queryResponse = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/drive/v1/export_tasks/${ticket}`,
				qs: { token },
				...baseRequestOptions,
			});

			const result = (queryResponse as IDataObject).result as IDataObject;
			if (!result) {
				throw new NodeOperationError(this.getNode(), '查询导出任务失败：未返回 result');
			}

			const jobStatus = result.job_status as number;

			// 检查任务状态
			if (jobStatus === JOB_STATUS.SUCCESS) {
				exportResult = result;
				break;
			} else if (jobStatus === JOB_STATUS.INITIALIZING || jobStatus === JOB_STATUS.PROCESSING) {
				// 任务仍在处理中，等待后继续轮询
				await sleep(pollInterval);
				pollCount++;
			} else {
				// 任务失败
				const errorMsg = JOB_ERROR_MESSAGES[jobStatus] || result.job_error_msg || '未知错误';
				throw new NodeOperationError(
					this.getNode(),
					`导出任务失败 (状态码: ${jobStatus}): ${errorMsg}`,
				);
			}
		}

		if (!exportResult) {
			throw new NodeOperationError(
				this.getNode(),
				`导出任务超时：已轮询 ${maxPolls} 次，任务仍未完成`,
			);
		}

		// 3. 下载导出的文件
		const fileToken = exportResult.file_token as string;
		if (!fileToken) {
			throw new NodeOperationError(this.getNode(), '导出任务完成但未返回 file_token');
		}

		const response = await RequestUtils.originRequest.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/export_tasks/file/${fileToken}/download`,
			json: false,
			encoding: null,
			resolveWithFullResponse: true,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		});

		// 获取 MIME 类型映射
		const mimeTypes: Record<string, string> = {
			docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			pdf: 'application/pdf',
			xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			csv: 'text/csv',
		};

		// 优先使用响应头的 content-type，否则根据扩展名确定
		const fileExtension = exportResult.file_extension as string || file_extension;
		const contentType =
			response.headers?.['content-type'] ||
			mimeTypes[fileExtension] ||
			'application/octet-stream';

		// 构建文件名：优先使用导出结果中的文件名
		const baseName = exportResult.file_name as string || 'exported_file';
		let fullFileName = `${baseName}.${fileExtension}`;

		// 尝试从 Content-Disposition 获取文件名
		const contentDisposition = response.headers?.['content-disposition'];
		if (contentDisposition) {
			// 优先匹配 RFC 5987 格式: filename*=UTF-8''encoded_filename
			const rfc5987Match = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)'[^']*'([^;\s]+)/i);
			if (rfc5987Match && rfc5987Match[1]) {
				try {
					fullFileName = decodeURIComponent(rfc5987Match[1]);
				} catch {
					// 解码失败时尝试其他方式
				}
			} else {
				// 回退到普通 filename 格式
				const match = contentDisposition.match(/filename\s*=\s*((['"]).*?\2|[^;\s]+)/);
				if (match && match[1]) {
					let headerFileName = match[1].replace(/['"]/g, '');
					try {
						// 尝试 URL 解码
						headerFileName = decodeURIComponent(headerFileName);
					} catch {
						// 尝试将 Latin-1 编码的字节转换为 UTF-8
						try {
							const bytes = new Uint8Array(headerFileName.split('').map((c: string) => c.charCodeAt(0)));
							headerFileName = new TextDecoder('utf-8').decode(bytes);
						} catch {
							// 解码失败时保持原样
						}
					}
					if (headerFileName) {
						fullFileName = headerFileName;
					}
				}
			}
		}

		// 如果用户提供了自定义文件名，则使用自定义文件名
		if (options.fileName?.trim()) {
			fullFileName = options.fileName.trim();
		}

		// 使用 n8n 的 prepareBinaryData 处理二进制数据
		const binaryData = await this.helpers.prepareBinaryData(
			Buffer.from(response.body),
			fullFileName,
			contentType,
		);

		return {
			json: {
				ticket,
				file_token: fileToken,
				file_name: exportResult.file_name,
				file_extension: exportResult.file_extension,
				file_size: exportResult.file_size,
				type: exportResult.type,
				fileName: fullFileName,
				mimeType: contentType,
			},
			binary: {
				[binaryPropertyName]: binaryData,
			},
		};
	},
};

export default SpaceExportOperate;

