import { IExecuteFunctions, IHttpRequestOptions, JsonObject, NodeApiError } from 'n8n-workflow';
import { Credentials } from '../type/enums';


class RequestUtils {
	/**
	 * 处理飞书 API 响应
	 * - 二进制数据直接返回
	 * - 检查 code 是否为 0，非 0 则抛出错误
	 * - 返回 data 字段或原始响应
	 */
	private static processResponse(res: any) {
		// 对于二进制数据（如文件下载），直接返回
		if (res instanceof Buffer || res instanceof ArrayBuffer || res instanceof Uint8Array) {
			return res;
		}

		if (res.code !== 0) {
			throw new Error(`Request Feishu API Error: ${res.code}, ${res.msg}`);
		}
		return res.data ?? res;
	}

	static async originRequest(
		this: IExecuteFunctions,
		options: IHttpRequestOptions,
		clearAccessToken = false,
	) {
		const authenticationMethod = this.getNodeParameter(
			'authentication',
			0,
			Credentials.FeishuCredentialsApi,
		) as string;

		const credentials = await this.getCredentials(authenticationMethod);
		options.baseURL = credentials.baseURL as string;

		if (authenticationMethod === Credentials.FeishuCredentialsApi) {
			// Replace the accessToken with an empty string if clearAccessToken is true, so the preAuthentication method can be triggered
			// and a new access token can be fetched
			const additionalCredentialOptions = {
				credentialsDecrypted: {
					id: Credentials.Id,
					name: Credentials.FeishuCredentialsApi,
					type: Credentials.Type,
					data: {
						...credentials,
						accessToken: clearAccessToken ? '' : credentials.accessToken,
					},
				},
			};

			return this.helpers.httpRequestWithAuthentication.call(
				this,
				authenticationMethod,
				options,
				additionalCredentialOptions,
			);
		}

		return this.helpers.httpRequestWithAuthentication.call(this, authenticationMethod, options);
	}

	static async request(this: IExecuteFunctions, options: IHttpRequestOptions) {
		if (options.json === undefined) options.json = true;

		return RequestUtils.originRequest
			.call(this, options)
			.then((res) => RequestUtils.processResponse(res))
			.catch((error) => {

			if (error.context && error.context.data) {
				let errorData: any = {};

				if (error.context.data.code) {
					// 已经是解析好的对象
					errorData = error.context.data;
				} else {
					// 尝试从 Buffer 解析 JSON（下载资源操作返回的是 arraybuffer 格式）
					const buffer = Buffer.from(error.context.data);
					if (buffer.length > 0) {
						try {
							errorData = JSON.parse(buffer.toString('utf-8'));
						} catch {
							// JSON 解析失败，直接抛出原始错误
							throw error;
						}
					} else {
						// Buffer 为空（如 404 等 HTTP 错误），直接抛出原始错误
						throw error;
					}
				}

				const { code, msg, error: feishuError } = errorData;

				if (code === 99991663) {
					return RequestUtils.originRequest
						.call(this, options, true)
						.then((res) => RequestUtils.processResponse(res));
				}

				if (code !== 0) {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: `Request Feishu API Error: ${code}, ${msg}`,
						description: feishuError?.troubleshooter || '',
					});
				}
			}

			throw error;
			});
	}
}

export default RequestUtils;
