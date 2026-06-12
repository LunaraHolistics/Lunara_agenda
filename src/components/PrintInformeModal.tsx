import React, { useMemo, useCallback } from 'react';
import { X, Printer, AlertCircle, Calendar, FileText } from 'lucide-react';
import { Cliente, DadosProfissionais, Transacao, Agendamento } from '../types';

// ======================
// TYPES E CONSTANTES
// ======================

interface PrintInformeModalProps {
  cliente: Cliente;
  dadosProfissionais: DadosProfissionais;
  transacoes: Transacao[];
  agendamentos: Agendamento[];
  onClose: () => void;
  year?: number;        // Ano de referência (default: ano atual)
  months?: number[];    // Meses a incluir (0=Jan, 11=Dec) - default: [0, 1]
}

interface ReportTransaction {
  id: string;
  data: string;
  descricao: string;
  valorCentavos: number;
  agendamentoId?: string;
  terapiaNome?: string;
}

const CONFIG = {
  defaultMonths: [0, 1], // Janeiro e Fevereiro por padrão
  currencyLocale: 'pt-BR',
  currency: 'BRL',
  print: {
    marginTop: '20mm',
    marginLeft: '15mm',
    marginRight: '15mm'
  }
} as const;

// ======================
// UTILITÁRIOS PURE
// ======================

/**
 * Converte centavos para valor formatado em BRL
 * Ex: 15000 → "R$ 150,00"
 */
const formatCurrencyBRL = (valorCentavos: number): string => {
  const reais = valorCentavos / 100;
  return new Intl.NumberFormat(CONFIG.currencyLocale, {
    style: 'currency',
    currency: CONFIG.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(reais);
};

/**
 * Formata data para padrão brasileiro
 * Ex: "2024-01-15" → "15/01/2024"
 */
const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00'); // Evita problemas de fuso
  return date.toLocaleDateString(CONFIG.currencyLocale);
};

/**
 * Verifica se uma data está dentro do período especificado
 */
const isDateInPeriod = (dateStr: string, year: number, months: number[]): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T12:00:00');
  return date.getFullYear() === year && months.includes(date.getMonth());
};

/**
 * Extrai nome da terapia a partir do agendamento
 */
const getTerapiaNome = (agendamentoId: string | undefined, agendamentos: Agendamento[], terapias: Array<{ id: string; nome: string }>): string => {
  if (!agendamentoId) return '';
  const agendamento = agendamentos.find(a => a.id === agendamentoId);
  if (!agendamento?.terapiaId) return '';
  const terapia = terapias.find(t => t.id === agendamento.terapiaId);
  return terapia?.nome || '';
};

// ======================
// SUB-COMPONENTES
// ======================

interface ReportHeaderProps {
  dadosProfissionais: DadosProfissionais;
  cliente: Cliente;
  year: number;
  months: number[];
}

const ReportHeader: React.FC<ReportHeaderProps> = React.memo(({ dadosProfissionais, cliente, year, months }) => {
  const periodLabel = months.length === 12 
    ? `Ano ${year}` 
    : months.map(m => new Date(2000, m, 1).toLocaleDateString(CONFIG.currencyLocale, { month: 'short' })).join(' e ');

  return (
    <header className="text-center mb-8 print:mb-12">
      <h1 className="text-2xl font-bold text-gray-900 print:text-black">
        {dadosProfissionais.nomeRazaoSocial || 'Profissional Autônomo'}
      </h1>
      
      {dadosProfissionais.registroProfissional && (
        <p className="text-sm text-gray-600 print:text-gray-700 mt-1">
          {dadosProfissionais.registroProfissional}
          {dadosProfissionais.registroOrgao && ` - ${dadosProfissionais.registroOrgao}`}
        </p>
      )}
      
      <address className="text-sm text-gray-600 print:text-gray-700 mt-2 not-italic">
        {dadosProfissionais.endereco && <p>{dadosProfissionais.endereco}</p>}
        {dadosProfissionais.telefone && <p>Tel: {dadosProfissionais.telefone}</p>}
        {dadosProfissionais.cpfCnpj && <p>CPF/CNPJ: {dadosProfissionais.cpfCnpj}</p>}
      </address>

      <div className="mt-6 pt-4 border-t-2 border-gray-200 print:border-gray-400">
        <h2 className="text-lg font-bold text-gray-900 print:text-black">
          Informe de Rendimentos - {periodLabel}
        </h2>
        <p className="text-sm text-gray-500 print:text-gray-600 mt-1">
          Documento gerado em {new Date().toLocaleDateString(CONFIG.currencyLocale)}
        </p>
      </div>

      <div className="mt-4 p-4 bg-gray-50 print:bg-gray-100 rounded-xl text-left">
        <h3 className="text-sm font-bold text-gray-700 print:text-gray-800 mb-2">Dados do Cliente</h3>
        <p className="text-sm"><strong>Nome:</strong> {cliente.nome || 'Não informado'}</p>
        <p className="text-sm"><strong>CPF:</strong> {cliente.cpf || 'Não informado'}</p>
        {cliente.telefone && <p className="text-sm"><strong>Telefone:</strong> {cliente.telefone}</p>}
      </div>
    </header>
  );
});
ReportHeader.displayName = 'ReportHeader';

interface TransactionsTableProps {
  transactions: ReportTransaction[];
  totalCentavos: number;
}

const TransactionsTable: React.FC<TransactionsTableProps> = React.memo(({ transactions, totalCentavos }) => {
  if (transactions.length === 0) {
    return (
      <div 
        className="text-center py-12 bg-gray-50 print:bg-gray-100 rounded-xl"
        role="status"
        aria-live="polite"
      >
        <AlertCircle size={48} className="mx-auto text-gray-300 print:text-gray-400 mb-4" aria-hidden="true" />
        <p className="text-gray-500 print:text-gray-600 font-medium">
          Nenhuma transação encontrada para este período.
        </p>
        <p className="text-sm text-gray-400 print:text-gray-500 mt-2">
          Verifique se há pagamentos registrados entre janeiro e fevereiro.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto print:overflow-visible">
        <table 
          className="w-full border-collapse print:w-auto"
          role="table"
          aria-label="Tabela de transações pagas"
        >
          <thead className="print:table-header-group">
            <tr className="border-b-2 border-gray-300 print:border-gray-500">
              <th 
                scope="col" 
                className="text-left py-3 px-2 font-bold text-gray-700 print:text-gray-800 text-sm"
              >
                Data
              </th>
              <th 
                scope="col" 
                className="text-left py-3 px-2 font-bold text-gray-700 print:text-gray-800 text-sm"
              >
                Descrição / Terapia
              </th>
              <th 
                scope="col" 
                className="text-right py-3 px-2 font-bold text-gray-700 print:text-gray-800 text-sm"
              >
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="print:table-row-group">
            {transactions.map((t, index) => (
              <tr 
                key={t.id} 
                className={`border-b border-gray-100 print:border-gray-300 ${
                  index % 2 === 0 ? 'bg-white print:bg-transparent' : 'bg-gray-50/50 print:bg-transparent'
                }`}
              >
                <td className="py-3 px-2 text-sm text-gray-700 print:text-gray-800 whitespace-nowrap">
                  {formatDateBR(t.data)}
                </td>
                <td className="py-3 px-2 text-sm text-gray-700 print:text-gray-800">
                  {t.descricao}
                  {t.terapiaNome && (
                    <span className="block text-xs text-gray-500 print:text-gray-600 mt-0.5">
                      {t.terapiaNome}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-sm text-right font-medium text-gray-900 print:text-black whitespace-nowrap">
                  {formatCurrencyBRL(t.valorCentavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="mt-6 pt-4 border-t-2 border-gray-300 print:border-gray-500">
        <div className="flex justify-end items-center">
          <span className="text-sm font-medium text-gray-600 print:text-gray-700 mr-4">
            Total Acumulado:
          </span>
          <span className="text-xl font-bold text-gray-900 print:text-black">
            {formatCurrencyBRL(totalCentavos)}
          </span>
        </div>
      </div>
    </>
  );
});
TransactionsTable.displayName = 'TransactionsTable';

interface ReportFooterProps {
  includeSignature: boolean;
}

const ReportFooter: React.FC<ReportFooterProps> = React.memo(({ includeSignature = true }) => {
  if (!includeSignature) return null;

  return (
    <footer className="mt-12 pt-8 border-t border-gray-200 print:border-gray-400">
      <div className="flex justify-between items-end print:justify-center print:gap-16">
        <div className="text-center print:w-48">
          <p className="text-sm text-gray-500 print:text-gray-600 mb-8">
            __________________________
          </p>
          <p className="text-xs font-medium text-gray-400 print:text-gray-500">
            Data de Emissão
          </p>
        </div>
        
        <div className="text-center print:w-48">
          <p className="text-sm text-gray-500 print:text-gray-600 mb-8">
            __________________________
          </p>
          <p className="text-xs font-medium text-gray-400 print:text-gray-500">
            Assinatura do Profissional
          </p>
        </div>
      </div>
      
      <div className="mt-8 text-center print:mt-12">
        <p className="text-[10px] text-gray-400 print:text-gray-500">
          Este documento foi gerado eletronicamente pelo Lunara Agenda.
        </p>
        <p className="text-[10px] text-gray-400 print:text-gray-500">
          Válido para fins de declaração de Imposto de Renda.
        </p>
      </div>
    </footer>
  );
});
ReportFooter.displayName = 'ReportFooter';

// ======================
// HOOK: useReportData
// ======================

interface UseReportDataProps {
  cliente: Cliente;
  transacoes: Transacao[];
  agendamentos: Agendamento[];
  terapias?: Array<{ id: string; nome: string }>;
  year?: number;
  months?: number[];
}

const useReportData = ({
  cliente,
  transacoes,
  agendamentos,
  terapias = [],
  year = new Date().getFullYear(),
  months = CONFIG.defaultMonths
}: UseReportDataProps) => {
  return useMemo(() => {
    // 1. Filtrar agendamentos do cliente
    const agendamentosCliente = new Set(
      agendamentos
        .filter(a => a.clienteId === cliente.id)
        .map(a => a.id)
    );

    // 2. Filtrar e mapear transações
    const reportTransactions: ReportTransaction[] = transacoes
      .filter(t => {
        // Apenas transações pagas
        if (t.status !== 'Pago') return false;
        
        // Deve estar vinculada a um agendamento do cliente
        if (!t.agendamentoId || !agendamentosCliente.has(t.agendamentoId)) return false;
        
        // Deve estar no período especificado
        if (!isDateInPeriod(t.data, year, months)) return false;
        
        // Valor deve ser válido
        const valor = t.valorCentavos ?? (t as any).valor;
        return typeof valor === 'number' && valor > 0;
      })
      .map(t => {
        // Converter valor para centavos se necessário
        const valorCentavos = t.valorCentavos ?? Math.round((t as any).valor * 100);
        
        return {
          id: t.id,
          data: t.data,
          descricao: t.descricao || 'Serviço',
          valorCentavos,
          agendamentoId: t.agendamentoId,
          terapiaNome: getTerapiaNome(t.agendamentoId, agendamentos, terapias)
        };
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    // 3. Calcular total
    const totalCentavos = reportTransactions.reduce((sum, t) => sum + t.valorCentavos, 0);

    return {
      transactions: reportTransactions,
      totalCentavos,
      count: reportTransactions.length,
      period: { year, months }
    };
  }, [cliente.id, transacoes, agendamentos, terapias, year, months]);
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function PrintInformeModal({
  cliente,
  dadosProfissionais,
  transacoes,
  agendamentos,
  onClose,
  year = new Date().getFullYear(),
  months = CONFIG.defaultMonths
}: PrintInformeModalProps) {
  // 🎯 Hook para processar dados do relatório
  const { transactions, totalCentavos, count, period } = useReportData({
    cliente,
    transacoes,
    agendamentos,
    year,
    months
  });

  // 🎯 Handler de impressão com feedback
  const handlePrint = useCallback(() => {
    // Feedback visual antes de imprimir
    const printButton = document.activeElement as HTMLElement;
    if (printButton) {
      printButton.blur();
    }
    
    // Pequeno delay para garantir que o foco seja removido
    setTimeout(() => {
      window.print();
    }, 100);
  }, []);

  // 🎯 Acessibilidade: fechar com ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 🎯 Formatar período para exibição
  const periodLabel = useMemo(() => {
    if (months.length === 12) return `Ano ${year}`;
    if (months.length === 1) {
      return new Date(year, months[0], 1).toLocaleDateString(CONFIG.currencyLocale, { 
        month: 'long', 
        year: 'numeric' 
      });
    }
    return months
      .map(m => new Date(year, m, 1).toLocaleDateString(CONFIG.currencyLocale, { month: 'short' }))
      .join(' e ');
  }, [year, months]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl p-6 print:p-0 shadow-2xl print:shadow-none max-h-[90vh] print:max-h-none overflow-y-auto print:overflow-visible"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal (visível apenas na tela) */}
        <div className="flex justify-between items-center mb-6 print:hidden sticky top-0 bg-white print:bg-transparent z-10 pb-4">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
              Informe de Pagamentos
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Período: {periodLabel} • {count} transação{count !== 1 ? 'ões' : ''}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Conteúdo do Relatório (otimizado para impressão) */}
        <article 
          className="print:block print:w-full print:p-8"
          aria-label={`Informe de rendimentos para ${cliente.nome}`}
        >
          <ReportHeader 
            dadosProfissionais={dadosProfissionais}
            cliente={cliente}
            year={year}
            months={months}
          />

          <TransactionsTable 
            transactions={transactions}
            totalCentavos={totalCentavos}
          />

          <ReportFooter includeSignature={true} />
        </article>

        {/* Footer do Modal (visível apenas na tela) */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 print:hidden">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Fechar
          </button>
          <button 
            onClick={handlePrint}
            disabled={count === 0}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            aria-label={count === 0 ? 'Nenhuma transação para imprimir' : 'Imprimir ou salvar como PDF'}
          >
            <Printer size={18} aria-hidden="true" />
            {count === 0 ? 'Sem dados' : 'Imprimir / Salvar PDF'}
          </button>
        </div>
      </div>

      {/* 🎯 Estilos de impressão injetados dinamicamente */}
      <style>{`
        @media print {
          /* Reset de margens e cores */
          @page {
            margin: ${CONFIG.print.marginTop} ${CONFIG.print.marginRight} 20mm ${CONFIG.print.marginLeft};
            size: A4;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          
          /* Esconder elementos não essenciais */
          .print\\:hidden,
          nav,
          footer:not(article footer),
          button:not([aria-label*="Imprimir"]) {
            display: none !important;
          }
          
          /* Otimizar tabela para impressão */
          table {
            width: 100% !important;
            font-size: 11pt !important;
          }
          
          th, td {
            padding: 6px 4px !important;
          }
          
          /* Garantir quebras de página adequadas */
          tr {
            page-break-inside: avoid;
          }
          
          /* Evitar quebra no total */
          [class*="border-t-2"] {
            page-break-before: avoid;
          }
        }
      `}</style>
    </div>
  );
}