import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	NodeApiError,
	sleep,
} from 'n8n-workflow';
import {
	IAdditionalCredentialOptions,
	ICredentialDataDecryptedObject,
	IOAuth2Options,
} from 'n8n-workflow/dist/esm/interfaces';
import { Credentials, FeishuErrorCodes, RETRYABLE_ERROR_CODES } from '../type/enums';

/**
 * 飞书 API 响应接口
 */
interface IFeishuApiResponse {
	code: number;
	msg: string;
	data?: IDataObject;
	error?: unknown;
}

/**
 * 请求配置接口
 */
interface IRequestConfig {
	/** 最大重试次数，默认 1 */
	maxRetries?: number;
	/** 重试延迟（毫秒），默认 1000 */
	retryDelay?: number;
	/** 可重试的错误码列表 */
	retryOnCodes?: readonly number[];
}

/**
 * 解密凭证数据结构
 * 注意：这是一个简化的类型，仅包含 requestWithAuthentication 实际需要的 data 属性
 * n8n 的 ICredentialsDecrypted 类型要求 id, name, type 等属性，但实际调用时只使用 data
 */
interface ICredentialsDecryptedData {
	data: ICredentialDataDecryptedObject;
}

/**
 * 默认请求配置
 */
const DEFAULT_REQUEST_CONFIG: Required<IRequestConfig> = {
	maxRetries: 1,
	retryDelay: 1000,
	retryOnCodes: RETRYABLE_ERROR_CODES,
};

/**
 * 扩展的 HTTP 请求选项（支持额外的请求配置）
 */
interface IExtendedHttpRequestOptions extends IHttpRequestOptions {
	/** 是否返回完整响应（包含 headers） */
	resolveWithFullResponse?: boolean;
}

/**
 * 飞书 API 请求工具类
 */
class RequestUtils {
	/**
	 * 发起原始请求（不处理响应）
	 * @param options HTTP 请求选项
	 * @param clearAccessToken 是否清除 Access Token（用于刷新 Token）
	 */
	static async originRequest(
		this: IExecuteFunctions,
		options: IExtendedHttpRequestOptions,
		clearAccessToken = false,
	): Promise<unknown> {
		const authentication = this.getNodeParameter('authentication', 0) as string;

		// 获取凭证并设置 baseURL（两种认证方式共用）
		const credentials = await this.getCredentials(authentication);
		options.baseURL = credentials.baseURL as string;

		if (authentication === Credentials.FeishuCredentialsApi) {
			// 构造解密凭证数据
			// 使用类型断言：n8n 的类型定义要求完整的 ICredentialsDecrypted 结构，
			// 但 requestWithAuthentication 实际只使用 data 属性来获取凭证信息
			const credentialsDecrypted: ICredentialsDecryptedData = {
				data: {
					...credentials,
					accessToken: clearAccessToken ? '' : credentials.accessToken,
				},
			};

			const additionalCredentialOptions: IAdditionalCredentialOptions = {
				credentialsDecrypted: credentialsDecrypted as IAdditionalCredentialOptions['credentialsDecrypted'],
			};

			return this.helpers.requestWithAuthentication.call(
				this,
				authentication,
				options,
				additionalCredentialOptions,
			);
		}

		if (authentication === Credentials.FeishuOauth2Api) {
			const oauth2Options: IOAuth2Options = {
				keepBearer: true,
			};

			return this.helpers.requestOAuth2.call(this, authentication, options, oauth2Options);
		}

		// 默认情况（理论上不应该到达这里）
		return this.helpers.requestWithAuthentication.call(this, authentication, options);
	}

	/**
	 * 处理飞书 API 响应
	 * @param response API 响应数据
	 * @param context 执行上下文
	 */
	private static handleResponse(
		response: IFeishuApiResponse,
		context: IExecuteFunctions,
	): IDataObject {
		if (response.code && response.code !== 0) {
			const errorDetails = response.error ? JSON.stringify(response.error) : '';
			throw new NodeApiError(context.getNode(), {
				message: `飞书 API 错误: ${response.msg}`,
				description: `错误码: ${response.code}${errorDetails ? `\n详情: ${errorDetails}` : ''}`,
				httpCode: String(response.code),
			});
		}

		return (response.data ?? response) as IDataObject;
	}

	/**
	 * 检查是否为可重试的错误
	 * @param code 错误码
	 * @param retryOnCodes 可重试的错误码列表
	 */
	private static isRetryableError(code: number, retryOnCodes: readonly number[]): boolean {
		return retryOnCodes.includes(code);
	}

	/**
	 * 发起飞书 API 请求（带自动重试和错误处理）
	 * @param options HTTP 请求选项（支持 IHttpRequestOptions 或 IDataObject 以保持向后兼容）
	 * @param config 请求配置
	 */
	static async request(
		this: IExecuteFunctions,
		options: IHttpRequestOptions | IDataObject,
		config?: IRequestConfig,
	): Promise<IDataObject> {
		// 合并默认配置
		const { maxRetries, retryDelay, retryOnCodes } = {
			...DEFAULT_REQUEST_CONFIG,
			...config,
		};

		// 类型转换：确保 options 被视为 IExtendedHttpRequestOptions
		const requestOptions = options as IExtendedHttpRequestOptions;

		// 确保返回 JSON
		if (requestOptions.json === undefined) {
			requestOptions.json = true;
		}

		let lastError: Error | undefined;
		let retryCount = 0;

		while (retryCount <= maxRetries) {
			try {
				const response = (await RequestUtils.originRequest.call(
					this,
					requestOptions,
					retryCount > 0, // 重试时清除 Access Token
				)) as IFeishuApiResponse;

				// 检查是否需要重试
				if (
					response.code &&
					response.code !== 0 &&
					RequestUtils.isRetryableError(response.code, retryOnCodes) &&
					retryCount < maxRetries
				) {
					// Access Token 过期，清除后重试
					if (response.code === FeishuErrorCodes.ACCESS_TOKEN_EXPIRED) {
						this.logger?.debug(`Access Token 已过期，正在刷新并重试 (${retryCount + 1}/${maxRetries})`);
						retryCount++;
						continue;
					}

					// 频率限制，等待后重试
					if (response.code === FeishuErrorCodes.RATE_LIMITED) {
						this.logger?.debug(`请求频率超限，等待 ${retryDelay}ms 后重试 (${retryCount + 1}/${maxRetries})`);
						await sleep(retryDelay);
						retryCount++;
						continue;
					}
				}

				// 处理响应
				return RequestUtils.handleResponse(response, this);
			} catch (error) {
				lastError = error as Error;

				// 如果是已处理的 NodeApiError，直接抛出
				if (error instanceof NodeApiError) {
					throw error;
				}

				// 其他错误，包装后抛出
				if (retryCount >= maxRetries) {
					console.log('超出最大重试次数');
					throw new NodeApiError(this.getNode(), {
						message: '飞书 API 请求失败',
						description: lastError?.message || '未知错误',
					});
				}

				retryCount++;
				await sleep(retryDelay);
			}
		}

		// 理论上不应该到达这里
		console.log('理论上不应该到达这里');
		throw new NodeApiError(this.getNode(), {
			message: '飞书 API 请求失败',
			description: '超出最大重试次数',
		});
	}
}

export default RequestUtils;
