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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState(true);
  const [notes, setNotes] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { showNotification, handleImportContacts } = useAppContext();

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
    if (!name.trim()) {
      showNotification('Nome é obrigatório', 'error');
      return;
    }

    const clienteData: Cliente = {
      id: editingCliente ? editingCliente.id : Date.now().toString(),
      userId: editingCliente?.userId || '', // Garante userId se existir
      name,
      phone,
      notes,
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
    await StorageService.deleteItem(StorageKeys.CLIENTES, id);
    setConfirmDeleteId(null);
    loadClientes();
  };

  const openModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setName(cliente.name);
      setPhone(cliente.phone);
      setNotes(cliente.notes);
    } else {
      setEditingCliente(null);
      setName('');
      setPhone('');
      setStatus(true);
      setNotes('');
    }
    setIsModalOpen(true);
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
          setName(imported[0].nome); // ImportedContact still has 'nome' in its own interface
          handlePhoneChange(imported[0].telefone);
        } else {
          for (const contact of imported) {
            const newCliente: Cliente = {
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              userId: '', // Adicionar userId se necessário
              name: contact.nome,
              phone: contact.telefone,
              notes: 'Importado da agenda',
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
    const digits = value.replace(/\D/g, '');
    
    let masked = digits;
    if (digits.length <= 11) {
      masked = digits.replace(/^(\d{2})(\d)/g, '($1) $2');
      masked = masked.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setPhone(masked.substring(0, 15));
  };

  const filteredClientes = clientes.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (c.phone || '').includes(searchQuery)
  );

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pb-10 [webkit-overflow-scrolling:touch]">
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
      <div className="px-4 pb-24">
        {filteredClientes.length === 0 ? (
          <div className="text-center text-[var(--color-text-sec-light)] mt-10">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClientes.map(cliente => (
              <div 
                key={cliente.id}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg truncate">
                      {cliente.name || cliente.nome || "Sem Nome"}
                    </h3>
                  </div>
                  {cliente.phone && (
                    <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mb-1">
                      {cliente.phone}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button 
                    onClick={() => openModal(cliente)}
                    className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirmDeleteId === cliente.id) {
                        handleDelete(cliente.id);
                      } else {
                        setConfirmDeleteId(cliente.id);
                        setTimeout(() => setConfirmDeleteId(null), 3000); // Cancela após 3 segundos
                      }
                    }}
                    className={`p-2 rounded-full transition-colors ${confirmDeleteId === cliente.id ? 'bg-[var(--color-error)] text-white' : 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10'}`}
                  >
                    {confirmDeleteId === cliente.id ? 'Confirmar?' : <Trash2 size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => openModal()}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-20"
      >
        <Plus size={28} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                  Telefone
                </label>
                <div className="flex gap-2">
                  <input 
                    type="tel"
                    value={phone}
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
