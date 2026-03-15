import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, Smartphone, ChevronDown } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { AsyncStorage } from '../utils/storage';
import { Cliente, ImportedContact } from '../types';
import { useAppContext } from '../AppContext';

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // Form states
  const [nome, setNome] = useState('');
  const [ddi, setDdi] = useState('+55');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState(true);
  const [observacoes, setObservacoes] = useState('');

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const { handleImportContacts, ddiList, showNotification, confirmAction } = useAppContext();

  useEffect(() => {
    loadClientes();
    window.addEventListener('storage-sync', loadClientes);
    return () => window.removeEventListener('storage-sync', loadClientes);
  }, []);

  const loadClientes = async () => {
    const data = await StorageService.getItems<Cliente>(StorageKeys.CLIENTES);
    setClientes(data);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      showNotification('Nome é obrigatório', 'error');
      return;
    }

    const clienteData: Cliente = {
      id: editingCliente ? editingCliente.id : Date.now().toString(),
      nome,
      ddi,
      telefone,
      status,
      observacoes,
    };

    if (editingCliente) {
      await StorageService.updateItem(StorageKeys.CLIENTES, clienteData);
    } else {
      await StorageService.saveItem(StorageKeys.CLIENTES, clienteData);
    }

    closeModal();
    loadClientes();
  };

  const handleDelete = async (id: string) => {
    confirmAction('Deseja realmente excluir este cliente?', async () => {
      const storage = await AsyncStorage.getItem(StorageKeys.CLIENTES);
      const dados = JSON.parse(storage || '[]') || [];
      const filtrados = dados.filter((item: Cliente) => String(item.id) !== String(id));
      await AsyncStorage.setItem(StorageKeys.CLIENTES, JSON.stringify(filtrados));
      setClientes(filtrados); // Atualização forçada da interface
      setActiveActionId(null);
      closeModal();
    }, { isDanger: true });
  };

  const openModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setNome(cliente.nome);
      setDdi(cliente.ddi || '+55');
      setTelefone(cliente.telefone);
      setStatus(cliente.status);
      setObservacoes(cliente.observacoes);
    } else {
      setEditingCliente(null);
      setNome('');
      setDdi('+55');
      setTelefone('');
      setStatus(true);
      setObservacoes('');
    }
    setIsModalOpen(true);
    setActiveActionId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
  };

  const onImport = async () => {
    try {
      const imported = await handleImportContacts();
      if (imported && imported.length > 0) {
        if (imported.length === 1) {
          // Preencher automaticamente os campos de entrada no formulário
          setNome(imported[0].nome);
          handlePhoneChange(imported[0].telefone);
        } else {
          // Criar vários clientes de uma vez
          for (const contact of imported) {
            const newCliente: Cliente = {
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              nome: contact.nome,
              ddi: '+55', // Default for batch import
              telefone: contact.telefone,
              status: true,
              observacoes: 'Importado da agenda',
            };
            await StorageService.saveItem(StorageKeys.CLIENTES, newCliente);
          }
          await loadClientes();
          closeModal();
          showNotification(`${imported.length} contatos importados com sucesso!`, 'success');
        }
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      showNotification("Não foi possível acessar seus contatos. Esta funcionalidade pode não estar disponível neste navegador. Tente importar via CSV.", 'error');
    }
  };

  const handlePhoneChange = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    let masked = digits;
    if (ddi === '+55') {
      if (digits.length <= 11) {
        // (XX) XXXXX-XXXX
        masked = digits.replace(/^(\d{2})(\d)/g, '($1) $2');
        masked = masked.replace(/(\d{5})(\d)/, '$1-$2');
      }
    }
    
    setTelefone(masked.substring(0, 15));
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.telefone.includes(searchQuery)
  );

  // Long press logic
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (id: string) => {
    timerRef.current = setTimeout(() => {
      setActiveActionId(id);
    }, 500); // 500ms long press
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Search Bar */}
      <div className="p-4 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sec-light)]" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filteredClientes.length === 0 ? (
          <div className="text-center text-[var(--color-text-sec-light)] mt-10">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClientes.map(cliente => (
              <div 
                key={cliente.id}
                onPointerDown={() => handlePointerDown(cliente.id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm relative overflow-hidden select-none"
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg">
                    {cliente.nome}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${cliente.status ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'}`}>
                    {cliente.status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {cliente.telefone && (
                  <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mb-1">
                    {cliente.ddi || '+55'} {cliente.telefone}
                  </p>
                )}
                {cliente.observacoes && (
                  <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-xs mt-2 line-clamp-2">
                    {cliente.observacoes}
                  </p>
                )}

                {/* Actions Overlay (shown on long press) */}
                {activeActionId === cliente.id && (
                  <div className="absolute inset-0 z-50 bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-sm flex items-center justify-center gap-4">
                    <button 
                      onClick={() => openModal(cliente)}
                      className="p-3 bg-[var(--color-primary)] text-white rounded-full shadow-md"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cliente.id)}
                      className="p-3 bg-[var(--color-error)] text-white rounded-full shadow-md"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button 
                      onClick={() => setActiveActionId(null)}
                      className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full shadow-md"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => openModal()}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-20"
      >
        <Plus size={28} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={closeModal} className="text-[var(--color-text-sec-light)] p-1">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {!editingCliente && (
                <button 
                  onClick={onImport}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl font-bold border border-dashed border-[var(--color-primary)]/30 active:opacity-50 transition-opacity"
                >
                  <Smartphone size={20} />
                  <span>Importar Contatos</span>
                </button>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                  Nome *
                </label>
                <input 
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                  Telefone
                </label>
                <div className="flex gap-2">
                  <div className="relative w-28 shrink-0">
                    <select 
                      value={ddi}
                      onChange={(e) => setDdi(e.target.value)}
                      className="w-full pl-3 pr-8 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none cursor-pointer"
                    >
                      {ddiList.map(item => (
                        <option key={item.code + item.name} value={item.code}>
                          {item.flag} {item.code}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-sec-light)]">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <input 
                    type="tel"
                    value={telefone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                  Observações
                </label>
                <textarea 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px] resize-none"
                  placeholder="Detalhes adicionais..."
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  Status do Cliente
                </span>
                <button 
                  onClick={() => setStatus(!status)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${status ? 'bg-[var(--color-success)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${status ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {editingCliente && (
                <button 
                  onClick={() => handleDelete(editingCliente.id)}
                  className="w-full py-3.5 mt-4 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl font-bold active:opacity-50 transition-opacity"
                  style={{ zIndex: 9999, position: 'relative' }}
                >
                  Excluir Cliente
                </button>
              )}

              <button 
                onClick={handleSave}
                className="w-full py-3.5 mt-4 bg-[var(--color-primary)] text-white font-medium rounded-xl shadow-md hover:opacity-90 transition-opacity active:opacity-50"
              >
                {editingCliente ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
