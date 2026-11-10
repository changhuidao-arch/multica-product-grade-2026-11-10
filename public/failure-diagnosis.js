export function diagnoseFailure(error) {
  if (typeof error !== 'string' || !error.trim()) return null;
  if (/ECONNRESET/i.test(error)) return { title: '连接中途被重置', summary: '运行时的网络连接意外断开，导致本次运行失败。仅凭该错误无法确定是模型服务、网关、代理还是网络中的哪一端关闭了连接。', steps: '核对失败时间附近的运行时和模型网关日志，检查服务是否重启、超时或主动断开；确认服务恢复后，再由你决定是否重试。' };
  if (/not allowed for this API key|unauthorized|invalid.api.key/i.test(error)) return { title: '模型访问被拒绝', summary: '服务拒绝了本次模型访问；可能是密钥权限或模型标识不匹配。', steps: '核对网关允许的模型 ID 和密钥权限，再决定是否重试。' };
  if (/no.route|model unavailable/i.test(error)) return { title: '模型路由不可用', summary: '服务未找到可用的模型路由。', steps: '检查模型 ID、网关路由及上游服务状态，再决定是否重试。' };
  return { title: '暂未识别具体原因', summary: '服务端报告运行失败，现有错误不足以确定原因。', steps: '查看该运行的完整日志，结合运行时和服务端日志定位。' };
}
