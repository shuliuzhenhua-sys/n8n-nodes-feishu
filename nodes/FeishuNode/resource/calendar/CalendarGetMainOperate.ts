import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import RequestUtils from '../../../help/utils/RequestUtils';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

export default {
	name: '查询主日历信息',
	value: 'calendar:getPrimaryCalendar',
	order: 30,
	options: [
		{
			displayName: '用户 ID 类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			description: '用户 ID 类型。',
			default: 'open_id',
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
		const userIdType = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const qs: IDataObject = {};
		if (userIdType) qs.user_id_type = userIdType;

		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/calendar/v4/calendars/primary',
			qs,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
