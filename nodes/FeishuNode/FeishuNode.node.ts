import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';
import ResourceFactory from '../help/builder/ResourceFactory';
import { Credentials, OutputType } from '../help/type/enums';
import { OperationResult } from '../help/type/IResource';

const resourceBuilder = ResourceFactory.build(__dirname);

/**
 * 批次配置接口
 */
interface BatchConfig {
	enabled: boolean;  // 是否启用并发模式（用户是否显式添加了 Batching 选项）
	batchSize: number;
	batchInterval: number;
}

/**
 * 从 options 参数中获取批次配置
 */
function getBatchConfig(context: IExecuteFunctions): BatchConfig {
	try {
		const options = context.getNodeParameter('options', 0, {}) as {
			batching?: { batch?: { batchSize?: number; batchInterval?: number } };
		};

		// 检查用户是否显式添加了 Batching 选项
		const batchingEnabled = options?.batching?.batch !== undefined;
		const batchSize = options?.batching?.batch?.batchSize ?? 50;
		const batchInterval = options?.batching?.batch?.batchInterval ?? 0;

		return {
			enabled: batchingEnabled,
			// batchSize 为 0 时视为 1
			batchSize: batchSize === 0 ? 1 : batchSize,
			batchInterval,
		};
	} catch {
		// 如果获取参数失败（例如操作不支持 options），返回默认配置（串行模式）
		return { enabled: false, batchSize: 50, batchInterval: 0 };
	}
}

/**
 * 串行执行模式（原有逻辑，向后兼容）
 */
async function executeSerial(
	context: IExecuteFunctions,
	items: INodeExecutionData[],
	callFunc: (this: IExecuteFunctions, index: number) => Promise<OperationResult>,
	returnData: INodeExecutionData[][],
	resource: unknown,
	operation: unknown,
): Promise<INodeExecutionData[][]> {
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			context.logger.debug('call function (serial)', {
				resource,
				operation,
				itemIndex,
			});

			const responseData = await callFunc.call(context, itemIndex);

			// 检查是否有自定义输出类型
			if (responseData && typeof responseData === 'object' && 'outputType' in responseData) {
				const typedResponse = responseData as {
					outputType: OutputType;
					outputData?: INodeExecutionData[][];
				};
				const { outputType } = typedResponse;

				if (outputType === OutputType.Multiple && typedResponse.outputData) {
					// 多输出模式：直接使用返回的输出数据
					returnData = typedResponse.outputData;
				} else if (outputType === OutputType.None) {
					// 无输出模式
					return [];
				}
				// OutputType.Single 会走下面的默认处理
			} else {
				// 默认单输出模式
				const executionData = context.helpers.constructExecutionMetaData(
					context.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: itemIndex } },
				);
				returnData[0].push(...executionData);
			}
		} catch (error) {
			context.logger.error('call function error (serial)', {
				resource,
				operation,
				itemIndex,
				errorMessage: error.message,
				stack: error.stack,
			});

			if (context.continueOnFail()) {
				const executionErrorData = context.helpers.constructExecutionMetaData(
					context.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: itemIndex } },
				);
				returnData[0].push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}

/**
 * 并发执行模式（类似 HttpRequest 节点）
 * 每批请求同时发送，批间有间隔
 */
async function executeParallel(
	context: IExecuteFunctions,
	items: INodeExecutionData[],
	callFunc: (this: IExecuteFunctions, index: number) => Promise<OperationResult>,
	returnData: INodeExecutionData[][],
	batchConfig: BatchConfig,
	resource: unknown,
	operation: unknown,
): Promise<INodeExecutionData[][]> {
	const { batchSize, batchInterval } = batchConfig;
	const requestPromises: Promise<{ itemIndex: number; result?: OperationResult; error?: Error }>[] = [];

	// 阶段1：创建所有请求 Promise（带批次延迟）
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// 批次延迟：在每批开始前等待（第一批除外）
		if (itemIndex > 0 && batchSize > 0 && batchInterval > 0) {
			if (itemIndex % batchSize === 0) {
				await sleep(batchInterval);
			}
		}

		context.logger.debug('call function (parallel)', {
			resource,
			operation,
			itemIndex,
			batch: batchSize > 0 ? Math.floor(itemIndex / batchSize) : 0,
		});

		// 创建请求 Promise（立即开始执行，不等待）
		const requestPromise = callFunc.call(context, itemIndex)
			.then((result) => ({ itemIndex, result }))
			.catch((error) => ({ itemIndex, error: error as Error }));

		requestPromises.push(requestPromise);
	}

	// 阶段2：等待所有请求完成
	const promisesResponses = await Promise.allSettled(requestPromises);

	// 阶段3：按原始顺序处理结果
	for (let i = 0; i < promisesResponses.length; i++) {
		const response = promisesResponses[i];

		if (response.status === 'rejected') {
			// Promise 本身被 reject（不应该发生，因为我们在上面已经 catch 了）
			const error = response.reason;
			context.logger.error('call function error (parallel - rejected)', {
				resource,
				operation,
				itemIndex: i,
				errorMessage: error?.message,
			});

			if (context.continueOnFail()) {
				const executionErrorData = context.helpers.constructExecutionMetaData(
					context.helpers.returnJsonArray({ error: error?.message || 'Unknown error' }),
					{ itemData: { item: i } },
				);
				returnData[0].push(...executionErrorData);
				continue;
			}
			throw error;
		}

		const { itemIndex, result, error } = response.value;

		if (error) {
			// 请求执行出错
			context.logger.error('call function error (parallel)', {
				resource,
				operation,
				itemIndex,
				errorMessage: error.message,
				stack: error.stack,
			});

			if (context.continueOnFail()) {
				const executionErrorData = context.helpers.constructExecutionMetaData(
					context.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: itemIndex } },
				);
				returnData[0].push(...executionErrorData);
				continue;
			}
			throw error;
		}

		// 处理成功的响应
		const responseData = result;

		// 检查是否有自定义输出类型
		if (responseData && typeof responseData === 'object' && 'outputType' in responseData) {
			const typedResponse = responseData as {
				outputType: OutputType;
				outputData?: INodeExecutionData[][];
			};
			const { outputType } = typedResponse;

			if (outputType === OutputType.Multiple && typedResponse.outputData) {
				// 多输出模式：直接使用返回的输出数据
				// 注意：在并发模式下，多输出可能会有问题，这里保持原有逻辑
				returnData = typedResponse.outputData;
			} else if (outputType === OutputType.None) {
				// 无输出模式：跳过
				continue;
			}
			// OutputType.Single 会走下面的默认处理
		} else {
			// 默认单输出模式
			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: itemIndex } },
			);
			returnData[0].push(...executionData);
		}
	}

	return returnData;
}

export class FeishuNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: '飞书',
		name: 'feishuNode',
		subtitle: '={{ $parameter.resource }}:{{ $parameter.operation }}',
		icon: 'file:icon.svg',
		group: ['transform'],
		version: [1],
		defaultVersion: 1,
		description: '飞书 API 集成，支持多种飞书功能',
		defaults: {
			name: '飞书',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: Credentials.FeishuCredentialsApi,
				displayName: '应用级别凭证',
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.FeishuCredentialsApi],
					},
				},
			},
			{
				name: Credentials.FeishuOauth2Api,
				displayName: '用户级别凭证',
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.FeishuOauth2Api],
					},
				},
			},
		],
		properties: [
			{
				displayName: '凭证类型',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: '用户级别凭证',
						value: Credentials.FeishuOauth2Api,
					},
					{
						name: '应用级别凭证',
						value: Credentials.FeishuCredentialsApi,
					},
				],
				default: Credentials.FeishuCredentialsApi,
			},
			...resourceBuilder.build(),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// 使用数组初始化，支持多输出
		const returnData: INodeExecutionData[][] = Array.from({ length: 1 }, () => []);

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const callFunc = resourceBuilder.getCall(resource, operation);

		if (!callFunc) {
			throw new NodeOperationError(
				this.getNode(),
				'未实现方法: ' + resource + '.' + operation,
			);
		}

		// 获取批次配置
		const batchConfig = getBatchConfig(this);

		// 类型断言：将 callFunc 转换为正确的类型
		type CallFuncType = (this: IExecuteFunctions, index: number) => Promise<OperationResult>;
		const typedCallFunc = callFunc as CallFuncType;

		// 根据是否显式设置了 Batching 选项来选择执行策略：
		// - enabled === false（默认，未添加 Batching）：串行模式，逐个执行
		// - enabled === true（添加了 Batching）：并发模式，每批请求同时发送
		if (batchConfig.enabled) {
			// 并发模式：类似 HttpRequest 节点
			return executeParallel(this, items, typedCallFunc, returnData, batchConfig, resource, operation);
		} else {
			// 串行模式：原有逻辑（向后兼容）
			return executeSerial(this, items, typedCallFunc, returnData, resource, operation);
		}
	}
}
