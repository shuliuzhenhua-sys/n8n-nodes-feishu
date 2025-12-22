import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesUpdateSettingOperate: ResourceOperations = {
	name: '更新知识空间设置',
	value: 'wiki:spaces:settings:update',
	order: 98,
	options: [
		{
			displayName: '知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '一级页面创建权限',
			name: 'create_setting',
			type: 'options',
			options: [
				{ name: '管理员和成员', value: 'admin_and_member' },
				{ name: '仅管理员', value: 'admin' },
			],
			default: 'admin_and_member',
			description: '谁可以创建空间的一级页面',
		},
		{
			displayName: '文档操作权限',
			name: 'security_setting',
			type: 'options',
			options: [
				{ name: '允许', value: 'allow' },
				{ name: '不允许', value: 'not_allow' },
			],
			default: 'allow',
			description: '可阅读用户是否可创建副本/打印/导出/复制',
		},
		{
			displayName: '评论权限',
			name: 'comment_setting',
			type: 'options',
			options: [
				{ name: '允许', value: 'allow' },
				{ name: '不允许', value: 'not_allow' },
			],
			default: 'allow',
			description: '可阅读用户是否可评论',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const createSetting = this.getNodeParameter('create_setting', index) as string;
		const securitySetting = this.getNodeParameter('security_setting', index) as string;
		const commentSetting = this.getNodeParameter('comment_setting', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const body: IDataObject = {};
		if (createSetting) body.create_setting = createSetting;
		if (securitySetting) body.security_setting = securitySetting;
		if (commentSetting) body.comment_setting = commentSetting;

		const requestOptions: IDataObject = { method: 'PUT', url: `/open-apis/wiki/v2/spaces/${spaceId}/setting`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default WikiSpacesUpdateSettingOperate;
