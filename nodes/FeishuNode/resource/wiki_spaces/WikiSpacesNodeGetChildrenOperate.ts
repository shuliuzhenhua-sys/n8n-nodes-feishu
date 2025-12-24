import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesNodeGetChildrenOperate: ResourceOperations = {
	name: '获取知识空间子节点列表',
	value: 'wiki:spaces:node:children',
	order: 90,
	options: [
		{
			displayName: '知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '父节点Token',
			name: 'parent_node_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			default: '',
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: {
				minValue: 1,
				maxValue: 50,
			},
			displayOptions: {
				show: {
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
		{
			displayName: '递归获取所有子节点',
			name: 'recursive',
			type: 'boolean',
			default: false,
			description: 'Whether to recursively fetch all child nodes',
		},
		{
			displayName: '递归层级',
			name: 'recursiveDepth',
			type: 'number',
			default: 2,
			typeOptions: {
				minValue: 0,
			},
			displayOptions: {
				show: {
					recursive: [true],
				},
			},
			description: '递归获取的层级深度，0表示递归获取所有层级',
		},
		{
			displayName: '数据结构',
			name: 'dataStructure',
			type: 'options',
			options: [
				{ name: '扁平化数据结构', value: 'flat' },
				{ name: '树形数据结构', value: 'tree' },
			],
			default: 'flat',
			displayOptions: {
				show: {
					recursive: [true],
				},
			},
			description: '返回数据的结构类型',
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 50) as number;
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const parentNodeToken = this.getNodeParameter('parent_node_token', index) as string;

		// 获取节点列表的请求函数
		const fetchChildren = async (targetSpaceId: string, targetParentNodeToken: string | undefined) => {
			let allItems: IDataObject[] = [];
			let pageToken: string | undefined = undefined;

			while (true) {
				const qs: IDataObject = {
					page_size: 50,
				};

				if (targetParentNodeToken) {
					qs.parent_node_token = targetParentNodeToken;
				}

				if (pageToken) {
					qs.page_token = pageToken;
				}

				const requestOptions: IDataObject = {
					method: 'GET' as IHttpRequestMethods,
					url: `/open-apis/wiki/v2/spaces/${targetSpaceId}/nodes`,
					qs,
				};

				const response = await RequestUtils.request.call(this, requestOptions);

				const responseData = response as {
					items?: IDataObject[];
					page_token?: string;
					has_more?: boolean;
				};

				allItems = allItems.concat(responseData.items || []);

				if (!responseData.has_more || !responseData.page_token) {
					break;
				}

				pageToken = responseData.page_token;
			}

			return allItems;
		};

		// 单次请求函数（用于非 returnAll 模式）
		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				page_size: pageSize,
			};

			if (parentNodeToken) {
				qs.parent_node_token = parentNodeToken;
			}

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions: IDataObject = {
				method: 'GET' as IHttpRequestMethods,
				url: `/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
				qs,
			};

			const response = await RequestUtils.request.call(this, requestOptions);

			const responseData = response as {
				items?: IDataObject[];
				page_token?: string;
				has_more?: boolean;
			};

			return {
				items: responseData.items || [],
				pageToken: responseData.page_token,
				hasMore: responseData.has_more || false,
			};
		};

		const recursive = this.getNodeParameter('recursive', index, false) as boolean;

		// 递归获取子节点的函数
		const fetchRecursive = async (
			items: IDataObject[],
			currentPath: string[],
			currentDepth: number,
			recursiveDepth: number,
			dataStructure: string,
		): Promise<IDataObject[]> => {
			const results: IDataObject[] = [];

			for (const item of items) {
				const itemPath = [...currentPath, item.title as string];
				const itemWithPath: IDataObject = {
					...item,
					breadcrumbItems: itemPath,
				};

				if (dataStructure === 'tree') {
					// 树形结构
					if (item.has_child && (recursiveDepth === 0 || currentDepth < recursiveDepth)) {
						const children = await fetchChildren(
							item.space_id as string,
							item.node_token as string,
						);
						const childResults = await fetchRecursive(children, itemPath, currentDepth + 1, recursiveDepth, dataStructure);
						itemWithPath.children = childResults;
					} else {
						itemWithPath.children = [];
					}
					results.push(itemWithPath);
				} else {
					// 扁平化结构
					results.push(itemWithPath);

					if (item.has_child && (recursiveDepth === 0 || currentDepth < recursiveDepth)) {
						const children = await fetchChildren(
							item.space_id as string,
							item.node_token as string,
						);
						const childResults = await fetchRecursive(children, itemPath, currentDepth + 1, recursiveDepth, dataStructure);
						results.push(...childResults);
					}
				}
			}

			return results;
		};

		// 处理分页逻辑
		if (returnAll) {
			// 获取初始节点列表
			const initialItems = await fetchChildren(spaceId, parentNodeToken || undefined);

			if (!recursive) {
				// 非递归模式，直接返回并添加 breadcrumbItems
				return initialItems.map(item => ({
					...item,
					breadcrumbItems: [item.title as string],
				}));
			}

			// 递归模式
			const recursiveDepth = this.getNodeParameter('recursiveDepth', index, 2) as number;
			const dataStructure = this.getNodeParameter('dataStructure', index, 'flat') as string;

			return await fetchRecursive(initialItems, [], 1, recursiveDepth, dataStructure);
		} else {
			// 单次请求，返回限制数量的数据
			const { items } = await fetchPage(undefined, limit);

			if (!recursive) {
				return items.map(item => ({
					...item,
					breadcrumbItems: [item.title as string],
				}));
			}

			// 递归模式
			const recursiveDepth = this.getNodeParameter('recursiveDepth', index, 2) as number;
			const dataStructure = this.getNodeParameter('dataStructure', index, 'flat') as string;

			return await fetchRecursive(items, [], 1, recursiveDepth, dataStructure);
		}
	},
};

export default WikiSpacesNodeGetChildrenOperate;
