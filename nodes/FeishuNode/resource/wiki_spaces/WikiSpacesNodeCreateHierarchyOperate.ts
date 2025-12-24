import {IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestMethods} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesNodeCreateHierarchyOperate: ResourceOperations = {
	name: '创建动态层级的知识库空间节点 (自定义封装)',
	value: 'wiki:spaces:node:create:hierarchy',
	order: 89,
	options: [
		{
			displayName: '知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '文档类型',
			name: 'obj_type',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{ name: '新版文档', value: 'docx' },
				{ name: '表格', value: 'sheet' },
				{ name: '思维导图', value: 'mindnote' },
				{ name: '多维表格', value: 'bitable' },
				{ name: '文件', value: 'file' },
				{ name: '幻灯片', value: 'slides' },
			],
			default: 'docx',
			description: '最终创建的文档类型（中间层级为文档类型）',
		},
		{
			displayName: '父节点Token',
			name: 'parent_node_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			default: '',
			description: '父节点token，一级节点为空',
		},
		{
			displayName: '层级路径 (Breadcrumb Items)',
			name: 'breadcrumbItems',
			type: 'json',
			required: true,
			default: '["层级一", "层级二"]',
			description: '层级路径数组，按顺序创建层级文档，例如：["部门", "项目", "文档名称"]',
		},
		{
			displayName: '中间层级文档类型',
			name: 'intermediate_obj_type',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{ name: '新版文档', value: 'docx' },
				{ name: '表格', value: 'sheet' },
				{ name: '思维导图', value: 'mindnote' },
				{ name: '多维表格', value: 'bitable' },
				{ name: '文件', value: 'file' },
				{ name: '幻灯片', value: 'slides' },
			],
			default: 'docx',
			description: '中间层级节点的文档类型',
		},
		{
			displayName: '跳过已存在的层级',
			name: 'skipExisting',
			type: 'boolean',
			default: true,
			description: 'Whether to skip creating nodes that already exist (by title match)',
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const objType = this.getNodeParameter('obj_type', index) as string;
		const parentNodeToken = this.getNodeParameter('parent_node_token', index) as string;
		const breadcrumbItemsRaw = this.getNodeParameter('breadcrumbItems', index) as string | string[];
		const intermediateObjType = this.getNodeParameter('intermediate_obj_type', index) as string;
		const skipExisting = this.getNodeParameter('skipExisting', index, true) as boolean;

		// 解析 breadcrumbItems
		let breadcrumbItems: string[];
		if (typeof breadcrumbItemsRaw === 'string') {
			try {
				breadcrumbItems = JSON.parse(breadcrumbItemsRaw);
			} catch {
				throw new Error('breadcrumbItems 格式错误，应为 JSON 数组格式，例如：["层级一", "层级二"]');
			}
		} else {
			breadcrumbItems = breadcrumbItemsRaw;
		}

		if (!Array.isArray(breadcrumbItems) || breadcrumbItems.length === 0) {
			throw new Error('breadcrumbItems 必须是非空数组');
		}

		// 获取子节点列表的函数
		const fetchChildren = async (targetParentNodeToken: string | undefined): Promise<IDataObject[]> => {
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
					url: `/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
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

		// 创建节点的函数
		const createNode = async (
			title: string,
			nodeParentToken: string | undefined,
			nodeObjType: string,
		): Promise<IDataObject> => {
			const body: IDataObject = {
				obj_type: nodeObjType,
				node_type: 'origin',
				title,
			};

			if (nodeParentToken) {
				body.parent_node_token = nodeParentToken;
			}

			const requestOptions: IDataObject = {
				method: 'POST' as IHttpRequestMethods,
				url: `/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
				body,
			};

			return RequestUtils.request.call(this, requestOptions);
		};

		// 查找已存在的节点
		const findExistingNode = async (
			title: string,
			nodeParentToken: string | undefined,
		): Promise<IDataObject | undefined> => {
			const children = await fetchChildren(nodeParentToken);
			return children.find(child => child.title === title);
		};

		// 递归创建层级
		const createdNodes: IDataObject[] = [];
		let currentParentToken: string | undefined = parentNodeToken || undefined;

		for (let i = 0; i < breadcrumbItems.length; i++) {
			const title = breadcrumbItems[i];
			const isLastLevel = i === breadcrumbItems.length - 1;
			const currentObjType = isLastLevel ? objType : intermediateObjType;

			// 检查是否跳过已存在的层级
			if (skipExisting) {
				const existingNode = await findExistingNode(title, currentParentToken);
				if (existingNode) {
					currentParentToken = existingNode.node_token as string;
					createdNodes.push({
						level: i + 1,
						title,
						node_token: existingNode.node_token,
						obj_token: existingNode.obj_token,
						skipped: true,
					});
					continue;
				}
			}

			// 创建新节点
			const response = await createNode(title, currentParentToken, currentObjType);
			const responseData = response as {
				node?: IDataObject;
			};

			if (!responseData.node) {
				throw new Error(`创建节点失败: ${title}`);
			}

			currentParentToken = responseData.node.node_token as string;
			createdNodes.push({
				level: i + 1,
				title,
				node_token: responseData.node.node_token,
				obj_token: responseData.node.obj_token,
				skipped: false,
			});
		}

		// 返回结果
		const lastNode = createdNodes[createdNodes.length - 1];
		return {
			space_id: spaceId,
			breadcrumbItems,
			createdNodes,
			finalNode: lastNode,
			node_token: lastNode.node_token,
			obj_token: lastNode.obj_token,
		};
	},
};

export default WikiSpacesNodeCreateHierarchyOperate;

