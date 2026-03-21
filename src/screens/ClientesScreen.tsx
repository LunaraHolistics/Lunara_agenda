import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, Smartphone, ChevronDown, MessageCircle, Sparkles, FileText } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Cliente, ImportedContact, DadosProfissionais, Transacao } from '../types';
import { useAppContext } from '../AppContext';
import PrintInformeModal from '../components/PrintInformeModal';

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // Form states
  const [nome, setNome] = useState('');
  const [ddi, setDdi] = useState('+55');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [status, setStatus] = useState(true);
  const [observacoes, setObservacoes] = useState('');
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { showNotification, handleImportContacts, addCliente, updateCliente, deleteCliente, clientes: contextClientes, agendamentos, terapias, confirmAction, transacoes } = useAppContext();
  const isDecember = new Date().getMonth() === 11;
  const isMarchOrApril = new Date().getMonth() === 2 || new Date().getMonth() === 3;

  const handleSave = async () => {
    if (!nome.trim()) {
      showNotification('Nome é obrigatório', 'error');
      return;
    }

    // Salva o DDI + Telefone (removendo caracteres da máscara para o banco)
    const cleanPhone = telefone.replace(/\D/g, '');
    const fullPhone = cleanPhone ? `${ddi}${cleanPhone}` : '';

    const clienteData: Omit<Cliente, 'id'> = {
      nome,
      telefone: fullPhone,
      cpf,
      observacoes,
    };

    setSalvando(true);
    if (editingCliente) {
      updateCliente({ ...editingCliente, ...clienteData });
    } else {
      addCliente(clienteData);
    }

    setSalvando(false);
    setAlterado(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
    closeModal();
  };

  const handleDelete = async (id: string) => {
    deleteCliente(id);
    setConfirmDeleteId(null);
  };

  const openModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setNome(cliente.nome || '');
      setCpf(cliente.cpf || '');
      
      if (cliente.telefone && cliente.telefone.startsWith('+')) {
        // Extrai o DDI (assume-se 2 ou 3 dígitos após o +)
        const ddiMatch = cliente.telefone.match(/^\+\d{2,3}/);
        const ddiPart = ddiMatch ? ddiMatch[0] : '+55';
        const phonePart = cliente.telefone.replace(ddiPart, '');
        
        setDdi(ddiPart);
        applyPhoneMask(phonePart, ddiPart);
      } else {
        setDdi('+55');
        applyPhoneMask(cliente.telefone || '', '+55');
      }
      
      setObservacoes(cliente.observacoes || '');
    } else {
      setEditingCliente(null);
      setNome('');
      setDdi('+55');
      setTelefone('');
      setCpf('');
      setStatus(true);
      setObservacoes('');
    }
    setIsModalOpen(true);
    setAlterado(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
    setConfirmDeleteId(null);
  };

  const onImport = async () => {
    try {
      const imported = await handleImportContacts();
      if (imported && imported.length > 0) {
        if (imported.length === 1) {
          setNome(imported[0].nome);
          applyPhoneMask(imported[0].telefone, ddi);
        } else {
          for (const contact of imported) {
            addCliente({
              nome: contact.nome,
              telefone: contact.telefone,
              observacoes: 'Importado da agenda',
            });
          }
          closeModal();
          showNotification(`${imported.length} contatos importados!`, 'success');
        }
      }
    } catch (error) {
      showNotification("Erro na importação.", 'error');
    }
  };

  // Lógica de Máscara Condicional
  const applyPhoneMask = (value: string, currentDdi: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (currentDdi === '+55') {
      // Máscara Brasileira: (00) 00000-0000
      let masked = digits;
      if (digits.length <= 11) {
        masked = digits.replace(/^(\d{2})(\d)/g, '($1) $2');
        masked = masked.replace(/(\d{5})(\d)/, '$1-$2');
      }
      setTelefone(masked.substring(0, 15));
    } else {
      // Outros países: Apenas números com espaços a cada 4 dígitos para legibilidade (estilo internacional)
      const internationalMask = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
      setTelefone(internationalMask.substring(0, 20));
    }
  };

  const filteredClientes = (contextClientes || []).filter(c => 
    (c.nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (c.telefone || '').includes(searchQuery)
  );

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pb-10">
      <div className="p-4 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] sticky top-0 z-10">
        <div className="header-clientes mb-4">
          <h2 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Clientes</h2>
          <button onClick={() => openModal()} className="btn-add-topo">
            +
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sec-light)]" size={20} />
          <input 
            type="text"
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          />
        </div>
      </div>

      <div className="px-4 pb-24">
        {filteredClientes.length === 0 ? (
          <div className="text-center text-[var(--color-text-sec-light)] mt-10">Nenhum cliente.</div>
        ) : (
          <div className="space-y-3">
            {filteredClientes.map(cliente => (
              <div key={cliente.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg truncate">
                    {cliente.nome || "Sem Nome"}
                  </h3>
                  {cliente.telefone && <p className="text-[var(--color-text-sec-light)] text-sm">{cliente.telefone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://wa.me/${cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${cliente.nome}! Passando para confirmar nossa sessão. Gratidão, Celso.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-green-600 hover:bg-green-100 rounded-full"
                  >
                    <MessageCircle size={20} />
                  </a>
                  {isDecember && (
                    <button 
                      onClick={() => {
                        const currentYear = new Date().getFullYear();
                        const agendamentosCliente = (agendamentos || []).filter(a => 
                          a.clienteId === cliente.id && 
                          a.status === 'Concluído' && 
                          new Date(a.data).getFullYear() === currentYear
                        );
                        
                        const total = agendamentosCliente.length;
                        const terapiasIds = [...new Set(agendamentosCliente.map(a => a.terapiaId))];
                        const nomesTerapias = terapiasIds.map(tid => terapias.find(t => t.id === tid)?.nome).filter(Boolean).join(', ');
                        
                        const mensagem = `Olá, ${cliente.nome}! 🌿 Ao encerrarmos este ciclo, gostaria de agradecer pela confiança. Neste ano, caminhamos juntos em ${total} sessões de ${nomesTerapias}. Que a energia cultivada floresça em sua vida. Gratidão, Celso Luiz.`;
                        
                        confirmAction(
                          `Gerar retrospectiva para ${cliente.nome}?`,
                          () => {
                            window.open(`https://wa.me/${cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
                          }
                        );
                      }}
                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-full"
                    >
                      <Sparkles size={20} />
                    </button>
                  )}
                  <button onClick={() => openModal(cliente)} className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full"><Edit2 size={20} /></button>
                  <button 
                    onClick={() => {
                      if (confirmDeleteId === cliente.id) handleDelete(cliente.id);
                      else { setConfirmDeleteId(cliente.id); setTimeout(() => setConfirmDeleteId(null), 3000); }
                    }}
                    className={`p-2 rounded-full transition-colors ${confirmDeleteId === cliente.id ? 'bg-[var(--color-error)] text-white' : 'text-[var(--color-error)]'}`}
                  >
                    {confirmDeleteId === cliente.id ? '?' : <Trash2 size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={closeModal} className="text-gray-400"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              {!editingCliente && (
                <button onClick={onImport} className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl font-bold border border-dashed border-[var(--color-primary)]/30">
                  <Smartphone size={20} /> <span>Importar da Agenda</span>
                </button>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome *</label>
                <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); setAlterado(true); }} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone Internacional</label>
                <div className="flex gap-2">
                  <select 
                    value={ddi} 
                    onChange={(e) => {
                      const newDdi = e.target.value;
                      setDdi(newDdi);
                      applyPhoneMask(telefone, newDdi); // Re-aplica a máscara ao trocar DDI
                      setAlterado(true);
                    }}
                    className="w-24 px-2 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold"
                  >
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+351">🇵🇹 +351</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input 
                    type="tel" 
                    value={telefone} 
                    onChange={(e) => { applyPhoneMask(e.target.value, ddi); setAlterado(true); }} 
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
                    placeholder={ddi === '+55' ? '(00) 00000-0000' : 'Número completo'} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Observações</label>
                <textarea value={observacoes} onChange={(e) => { setObservacoes(e.target.value); setAlterado(true); }} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none min-h-[80px] resize-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF</label>
                <input type="text" value={cpf} onChange={(e) => { setCpf(e.target.value); setAlterado(true); }} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>

              {editingCliente && (
                <button 
                  onClick={() => setIsPrintModalOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold ${isMarchOrApril ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                >
                  <FileText size={20} /> Gerar Informe de Pagamentos (IR)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isPrintModalOpen && editingCliente && (
        <PrintInformeModal 
          cliente={editingCliente} 
          dadosProfissionais={StorageService.getData(StorageKeys.DADOS_PROFISSIONAIS) || {}} 
          transacoes={transacoes} 
          agendamentos={agendamentos}
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}

      {isModalOpen && (
        <button 
          onClick={handleSave} 
          disabled={salvando}
          className={`botao-salvar-mobile ${alterado ? '' : 'botao-hidden'} ${salvando ? 'opacity-80' : ''}`}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      )}

      {toast && (
        <div className="toast-sucesso">
          Salvo com sucesso!
        </div>
      )}
    </div>
  );
}