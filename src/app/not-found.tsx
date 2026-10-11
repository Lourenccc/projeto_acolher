import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-700">Erro 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">O endereço acessado não existe nesta demonstração.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </main>
  );
}
