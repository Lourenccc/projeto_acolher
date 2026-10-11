/*
 * Camada de "transporte" simulada. Quando houver backend, substitua `mockRequest`
 * por chamadas `fetch(`${process.env.NEXT_PUBLIC_API_URL}/...`)` mantendo as
 * mesmas assinaturas nos serviços — os componentes não precisarão mudar.
 */

export type ApiErrorCode = 'NETWORK' | 'CONFLICT' | 'NOT_FOUND' | 'VALIDATION';

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(message: string, code: ApiErrorCode = 'NETWORK') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

let simulateFailure = false;

/** Usado pela tela de Configurações para demonstrar os estados de erro. */
export function setSimulatedFailure(value: boolean) {
  simulateFailure = value;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Executa `handler` com latência simulada e devolve uma cópia (como uma resposta HTTP). */
export async function mockRequest<T>(handler: () => T, latencyMs = 350): Promise<T> {
  await wait(latencyMs + Math.random() * 300);
  if (simulateFailure) {
    throw new ApiError('Não foi possível conectar ao servidor de demonstração. Verifique sua conexão e tente novamente.');
  }
  return structuredClone(handler());
}
