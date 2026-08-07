import React from 'react';
import { X, Printer } from 'lucide-react';
import { Cliente, DadosProfissionais, Transacao, Agendamento } from '../types';

interface PrintInformeModalProps {
  cliente: Cliente;
  dadosProfissionais: DadosProfissionais;
  transacoes: Transacao[];
  agendamentos: Agendamento[];
  onClose: () => void;
}

export default function PrintInformeModal({ cliente, dadosProfissionais, transacoes, agendamentos, onClose }: PrintInformeModalProps) {
  const currentYear = new Date().getFullYear();
  const agendamentosCliente = agendamentos.filter(a => a.clienteId === cliente.id);
  const filteredTransacoes = transacoes.filter(t => 
    t.status === 'Pago' && 
    agendamentosCliente.some(a => a.id === t.agendamentoId) &&
    new Date(t.data).getFullYear() === currentYear &&
    new Date(t.data).getMonth() <= 1 // Jan (0) and Feb (1)
  );

  const total = filteredTransacoes.reduce((sum, t) => sum + t.valor, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-h-none print:overflow-visible">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-xl font-bold">Informe de Pagamentos (IR)</h2>
          <button onClick={onClose} className="text-gray-400"><X size={24} /></button>
        </div>

        <div className="print:block print:w-full print:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{dadosProfissionais.nomeRazaoSocial}</h1>
            <p>{dadosProfissionais.registroProfissional}</p>
            <p>{dadosProfissionais.endereco}</p>
            <p>{dadosProfissionais.telefone}</p>
            <p>CPF/CNPJ: {dadosProfissionais.cpfCnpj}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold mb-2">Dados do Cliente</h2>
            <p>Nome: {cliente.nome}</p>
            <p>CPF: {cliente.cpf || 'Não informado'}</p>
          </div>

          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2">Data</th>
                <th className="text-left py-2">Tipo de Terapia</th>
                <th className="text-right py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransacoes.map(t => (
                <tr key={t.id} className="border-b border-gray-200">
                  <td className="py-2">{new Date(t.data).toLocaleDateString()}</td>
                  <td className="py-2">{t.descricao}</td>
                  <td className="text-right py-2">R$ {t.valor.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right font-bold text-xl mb-12">
            Total Acumulado: R$ {total.toFixed(2)}
          </div>

          <div className="flex justify-between items-end">
            <div className="text-center">
              <p>__________________________</p>
              <p>Data</p>
            </div>
            <div className="text-center">
              <p>__________________________</p>
              <p>Assinatura</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 print:hidden">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-gray-100 font-bold">Fechar</button>
          <button onClick={handlePrint} className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold flex items-center gap-2">
            <Printer size={20} /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
