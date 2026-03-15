import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, ShieldAlert, X, GripVertical, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Cliente, Terapia, Agendamento, Bloqueio, Pacote } from '../types';
import { AsyncStorage } from '../utils/storage';
import { useAppContext } from '../AppContext';

export default function AgendaScreen() {
  const { completeAppointment, showNotification, confirmAction, promptAction } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Modals and Views
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBloqueiosOpen, setIsBloqueiosOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [showOrfaos, setShowOrfaos] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form State - Agendamento
  const [formClienteId, setFormClienteId] = useState('');
  const [formTerapiaIds, setFormTerapiaIds] = useState<string[]>([]);
  const [formPacoteId, setFormPacoteId] = useState<string | undefined>(undefined);
  const [formItemPacoteId, setFormItemPacoteId] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('');
  const [formValor, setFormValor] = useState(0);
  const [formStatusPagamento, setFormStatusPagamento] = useState<'Pago' | 'Pendente'>('Pendente');
  const [recorrencia, setRecorrencia] = useState(false);
  const [frequencia, setFrequencia] = useState<'semanal' | 'quinzenal'>('semanal');
  const [dataFim, setDataFim] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State - Bloqueio
  const [blockData, setBlockData] = useState('');
  const [blockHoraInicio, setBlockHoraInicio] = useState('');
  const [blockHoraFim, setBlockHoraFim] = useState('');
  const [blockMotivo, setBlockMotivo] = useState('');

  useEffect(() => {
    loadData();

    // Listen for window focus to refresh data (e.g. when coming back from another tab or window)
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage-sync', loadData);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage-sync', loadData);
    };
  }, [refreshTrigger]);

  const loadData = async () => {
    const [clis, ters, agends, blocks, pacs] = await Promise.all([
      StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
      StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
      StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS),
      StorageService.getItems<Bloqueio>(StorageKeys.BLOQUEIOS),
      StorageService.getItems<Pacote>(StorageKeys.PACOTES),
    ]);
    setClientes(clis.filter(c => c.status));
    setTerapias(ters);
    setAgendamentos(agends);
    setBloqueios(blocks);
    setPacotes(pacs);
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentMonth);

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, clienteId: string) => {
    e.dataTransfer.setData('clienteId', clienteId);
  };

  const handleDrop = async (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const clienteId = e.dataTransfer.getData('clienteId');
    const terapiaId = e.dataTransfer.getData('terapiaId');
    const pacoteId = e.dataTransfer.getData('pacoteId');
    const itemPacoteId = e.dataTransfer.getData('itemPacoteId');
    const agendamentoId = e.dataTransfer.getData('agendamentoId');

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (agendamentoId) {
      // Move existing appointment
      try {
        const agends = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
        const index = agends.findIndex(a => String(a.id) === String(agendamentoId));
        if (index !== -1) {
          const ag = agends[index];
          const timePart = ag.time;
          ag.date = dateStr;
          ag.time = timePart;
          await StorageService.updateItem(StorageKeys.AGENDAMENTOS, ag);
          loadData();
        }
      } catch (err) {
        console.error('Erro ao mover agendamento:', err);
      }
      return;
    }

    if (clienteId && terapiaId) {
      setFormClienteId(clienteId);
      setFormData(dateStr);
      setFormTerapiaIds([terapiaId]);
      setFormPacoteId(pacoteId || undefined);
      setFormItemPacoteId(itemPacoteId || undefined);
      
      const terapia = terapias.find(t => t.id === terapiaId);
      setFormValor(terapia?.valor || 0);
      setFormHora('09:00');
      setRecorrencia(false);
      setErrorMessage(null);
      setIsModalOpen(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Validation
  const checkConflict = (dateStr: string, timeStr: string, duracaoMin: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + duracaoMin;

    // Check Bloqueios
    const blocksOnDate = bloqueios.filter(b => b.data === dateStr);
    for (let b of blocksOnDate) {
      const [bh1, bm1] = b.horaInicio.split(':').map(Number);
      const bStart = bh1 * 60 + bm1;
      const [bh2, bm2] = b.horaFim.split(':').map(Number);
      const bEnd = bh2 * 60 + bm2;

      if (startMins < bEnd && endMins > bStart) {
        return `Horário bloqueado: ${b.motivo || 'Sem motivo'} (${b.horaInicio} - ${b.horaFim})`;
      }
    }

    // Check Agendamentos
    const agendsOnDate = agendamentos.filter(a => a.date?.startsWith(dateStr) && a.statusAtendimento !== 'Cancelado');
    for (let a of agendsOnDate) {
      const aDate = new Date(`${a.date}T${a.time}:00`);
      const aStart = aDate.getHours() * 60 + aDate.getMinutes();
      
      let aDuracao = 60;
      if (a.terapiaIds && a.terapiaIds.length > 0) {
        aDuracao = a.terapiaIds.reduce((acc, tid) => {
          const t = terapias.find(x => x.id === tid);
          return acc + (t ? t.duracao : 0);
        }, 0);
      } else {
        const t = terapias.find(t => t.id === a.terapiaId);
        aDuracao = t ? t.duracao : 60;
      }

      if (startMins < aStart + aDuracao && endMins > aStart) {
        return `Conflito com outro agendamento neste horário.`;
      }
    }

    return null;
  };

  const handleSaveAgendamento = async () => {
    if (!formClienteId || formTerapiaIds.length === 0 || !formData || !formHora) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    const selectedTerapias = formTerapiaIds.map(tid => terapias.find(t => t.id === tid)).filter(Boolean) as Terapia[];
    const totalDuracao = selectedTerapias.reduce((acc, t) => acc + t.duracao, 0);

    const datesToSchedule: string[] = [formData];

    if (recorrencia && dataFim) {
      let curr = new Date(`${formData}T00:00:00`);
      const end = new Date(`${dataFim}T23:59:59`);
      const step = frequencia === 'semanal' ? 7 : 14;
      
      while (true) {
        curr.setDate(curr.getDate() + step);
        if (curr > end) break;
        datesToSchedule.push(curr.toISOString().split('T')[0]);
      }
    }

    // Validate all dates
    for (let d of datesToSchedule) {
      const conflict = checkConflict(d, formHora, totalDuracao);
      if (conflict) {
        setErrorMessage(`Erro em ${d.split('-').reverse().join('/')}: ${conflict}`);
        return;
      }
    }

    // Check if we have enough balance if it's from a package
    if (formPacoteId && formItemPacoteId) {
       const pacote = pacotes.find(p => p.id === formPacoteId);
       const item = pacote?.itens.find(i => i.id === formItemPacoteId);
       if (item && item.quantidadeRestante < datesToSchedule.length) {
         setErrorMessage(`Saldo insuficiente. Você está tentando agendar ${datesToSchedule.length} sessões, mas só restam ${item.quantidadeRestante}.`);
         return;
       }
    }

    // Save all
    for (let d of datesToSchedule) {
      const pacote = formPacoteId ? pacotes.find(p => p.id === formPacoteId) : null;
      const tipoAtendimento = pacote ? pacote.tipoPacote : 'Avulso';

      const newAgendamento: Agendamento = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        clienteId: formClienteId,
        terapiaId: formTerapiaIds[0],
        terapiaIds: formTerapiaIds,
          date: d,
          time: formHora,
        valorCobrado: formValor,
        desconto: 0,
        statusPagamento: formStatusPagamento,
        statusAtendimento: 'Agendado',
        pacoteId: formPacoteId,
        itemPacoteId: formItemPacoteId,
        tipoAtendimento
      };
      await StorageService.saveItem(StorageKeys.AGENDAMENTOS, newAgendamento);
    }

    // Debit balance
    if (formPacoteId && formItemPacoteId) {
      const pacote = pacotes.find(p => p.id === formPacoteId);
      if (pacote) {
        const updatedItens = pacote.itens.map(item => {
          if (item.id === formItemPacoteId) {
            return { ...item, quantidadeRestante: item.quantidadeRestante - datesToSchedule.length };
          }
          return item;
        });
        const updatedPacote = { ...pacote, itens: updatedItens };
        await StorageService.updateItem(StorageKeys.PACOTES, updatedPacote);
      }
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleSaveBloqueio = async () => {
    if (!blockData || !blockHoraInicio || !blockHoraFim) {
      showNotification('Preencha data, hora início e hora fim.', 'error');
      return;
    }

    const novoBloqueio: Bloqueio = {
      id: Date.now().toString(),
      data: blockData,
      horaInicio: blockHoraInicio,
      horaFim: blockHoraFim,
      motivo: blockMotivo
    };

    await StorageService.saveItem(StorageKeys.BLOQUEIOS, novoBloqueio);
    setBlockData('');
    setBlockHoraInicio('');
    setBlockHoraFim('');
    setBlockMotivo('');
    loadData();
  };

  const handleDeleteBloqueio = async (id: string) => {
    await StorageService.deleteItem(StorageKeys.BLOQUEIOS, id);
    loadData();
  };

  const handleDeleteAgendamento = async (agendamentoId: string) => {
    console.log("Botão Excluir Clicado para o ID:", agendamentoId);
    confirmAction('Deseja realmente excluir este agendamento?', async () => {
      try {
        // 1. Buscar todos os agendamentos do Storage para garantir array completo
        const allAgendamentos = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
        const agendamento = allAgendamentos.find(a => String(a.id) === String(agendamentoId));
        
        if (!agendamento) {
          console.warn("Agendamento não encontrado para exclusão:", agendamentoId);
          return;
        }

        // 2. Lógica de Pacote (Devolver sessão se necessário)
        if (agendamento.pacoteId && agendamento.itemPacoteId) {
          const pacotesList = await StorageService.getItems<Pacote>(StorageKeys.PACOTES);
          const pacote = pacotesList.find(p => String(p.id) === String(agendamento.pacoteId));
          if (pacote) {
            const updatedItens = pacote.itens.map(item => {
              if (String(item.id) === String(agendamento.itemPacoteId)) {
                return { ...item, quantidadeRestante: item.quantidadeRestante + 1 };
              }
              return item;
            });
            const updatedPacote = { ...pacote, itens: updatedItens };
            await StorageService.updateItem(StorageKeys.PACOTES, updatedPacote);
          }
        }

        // 3. Filtrar o array completo (Correção Estrutural)
        const novaLista = allAgendamentos.filter(a => String(a.id) !== String(agendamentoId));
        
        // 4. Salvar novo array no AsyncStorage imediatamente
        await AsyncStorage.setItem(StorageKeys.AGENDAMENTOS, JSON.stringify(novaLista));
        
        // 5. Atualizar UI (setState funcional)
        setAgendamentos(prev => prev.filter(a => String(a.id) !== String(agendamentoId)));
        setRefreshTrigger(prev => prev + 1);
        
        console.log('DEBUG: Item removido com sucesso da persistência e do estado.');
        showNotification('Agendamento excluído com sucesso!', 'success');
      } catch (error: any) {
        console.error('Erro ao excluir agendamento:', error);
        showNotification('Erro ao excluir agendamento: ' + error.message, 'error');
      }
    }, { isDanger: true });
  };

  const handleCompleteAppointment = async (id: string) => {
    confirmAction('Confirmar realização deste atendimento?', async () => {
      await completeAppointment(id);
      loadData();
      showNotification('Atendimento realizado com sucesso!', 'success');
    });
  };

  const handleLongPress = (id: string) => {
    handleCompleteAppointment(id);
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => handleLongPress(id), 800);
  };

  const stopLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const openDayAgenda = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsDayAgendaOpen(true);
  };

  // Render Views
  if (isBloqueiosOpen) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
        <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsBloqueiosOpen(false)} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              Bloqueios de Agenda
            </h1>
          </div>
        </div>

        <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-3">Novo Bloqueio</h3>
          <div className="space-y-3">
            <input type="date" value={blockData} onChange={e => setBlockData(e.target.value)} className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none" />
            <div className="flex gap-3">
              <input type="time" value={blockHoraInicio} onChange={e => setBlockHoraInicio(e.target.value)} className="flex-1 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none" />
              <input type="time" value={blockHoraFim} onChange={e => setBlockHoraFim(e.target.value)} className="flex-1 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <input type="text" placeholder="Motivo (Opcional)" value={blockMotivo} onChange={e => setBlockMotivo(e.target.value)} className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none" />
            <button onClick={handleSaveBloqueio} className="w-full py-2 bg-[var(--color-error)] text-white font-medium rounded-lg shadow-sm">Adicionar Bloqueio</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <h3 className="text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-3">Bloqueios Ativos</h3>
          {bloqueios.length === 0 ? (
            <p className="text-sm text-[var(--color-text-sec-light)] text-center mt-4">Nenhum bloqueio cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {bloqueios.map(b => (
                <div key={b.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-3 rounded-xl border-l-4 border-[var(--color-error)] flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">{b.data.split('-').reverse().join('/')}</p>
                    <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-0.5">{b.horaInicio} às {b.horaFim} {b.motivo && `- ${b.motivo}`}</p>
                  </div>
                  <button onClick={() => handleDeleteBloqueio(b.id)} className="text-[var(--color-error)] p-2"><X size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isDayAgendaOpen && selectedDate) {
    const agendsOfDay = agendamentos.filter(a => a.date?.startsWith(selectedDate)).sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
    const blocksOfDay = bloqueios.filter(b => b.data === selectedDate);

    return (
      <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
        <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDayAgendaOpen(false)} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              Agenda do Dia
            </h1>
          </div>
          <span className="text-sm font-medium text-[var(--color-primary)]">{selectedDate.split('-').reverse().join('/')}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {blocksOfDay.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-xs font-semibold text-[var(--color-error)] uppercase tracking-wider">Bloqueios</h3>
              {blocksOfDay.map(b => (
                <div key={b.id} className="bg-[var(--color-error)]/10 p-3 rounded-xl border border-[var(--color-error)]/20 flex items-center gap-3">
                  <ShieldAlert size={18} className="text-[var(--color-error)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-error)]">{b.horaInicio} - {b.horaFim}</p>
                    {b.motivo && <p className="text-xs text-[var(--color-error)]/80">{b.motivo}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-xs font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-2">Atendimentos</h3>
          {agendsOfDay.length === 0 ? (
            <p className="text-sm text-[var(--color-text-sec-light)] text-center mt-4">Nenhum atendimento agendado.</p>
          ) : (
            <div className="space-y-3">
              {agendsOfDay.map(ag => {
                const cliente = clientes.find(c => c.id === ag.clienteId);
                const therapyNames = ag.terapiaIds 
                  ? ag.terapiaIds.map(tid => terapias.find(t => t.id === tid)?.nome).filter(Boolean).join(' + ')
                  : (terapias.find(t => t.id === ag.terapiaId)?.nome || 'Desconhecida');
                
                const time = new Date(`${ag.date}T${ag.time}:00`).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const agDate = new Date(`${ag.date}T${ag.time}:00`);
                agDate.setHours(0, 0, 0, 0);
                const isPast = agDate < today;
                
                // Check if it's the last session of a package
                const pacote = ag.pacoteId ? pacotes.find(p => p.id === ag.pacoteId) : null;
                const itemPacote = pacote?.itens.find(i => i.id === ag.itemPacoteId);
                const isLastSession = itemPacote && itemPacote.quantidadeRestante === 0;

                return (
                  <div key={ag.id} className={`bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-xl shadow-sm border-l-4 ${ag.statusPagamento === 'Pago' ? 'border-[var(--color-success)]' : 'border-[var(--color-warning)]'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-lg font-bold ${ag.statusPagamento === 'Pago' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>{time}</p>
                          {isPast && <Clock size={14} className="text-gray-400" title="Registro retroativo" />}
                          {isLastSession && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle size={10} /> Renovação Pendente
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mt-1">{cliente ? cliente.nome : 'Cliente não encontrado'}</h4>
                        <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">{therapyNames}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {ag.statusAtendimento !== 'Realizado' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteAppointment(ag.id);
                            }}
                            className="text-xs bg-[var(--color-success)] text-white px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 size={14} /> Confirmar
                          </button>
                        )}
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (ag.statusPagamento === 'Pendente') {
                              promptAction(
                                'Forma de Pagamento (PIX, Crédito, Débito, Transferência, Dinheiro):',
                                'PIX',
                                async (forma) => {
                                  if (forma) {
                                    const updatedAg: Agendamento = { 
                                      ...ag, 
                                      statusPagamento: 'Pago',
                                      dataPagamento: new Date().toISOString().split('T')[0],
                                      formaPagamento: forma
                                    };
                                    await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAg);
                                    await loadData();
                                    showNotification('Pagamento registrado!', 'success');
                                  }
                                }
                              );
                            } else {
                              confirmAction('Mudar status para Pendente?', async () => {
                                const updatedAg: Agendamento = { 
                                  ...ag, 
                                  statusPagamento: 'Pendente',
                                  dataPagamento: undefined,
                                  formaPagamento: undefined
                                };
                                await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAg);
                                await loadData();
                                showNotification('Status alterado para Pendente.', 'info');
                              });
                            }
                          }}
                          className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-all shadow-sm ${
                            ag.statusPagamento === 'Pago' 
                              ? 'bg-[var(--color-success)] text-white' 
                              : 'bg-[var(--color-warning)] text-white'
                          }`}
                        >
                          {ag.statusPagamento}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAgendamento(ag.id);
                          }} 
                          className="text-[var(--color-error)] p-1.5 hover:bg-[var(--color-error)]/10 rounded-full transition-colors relative z-20"
                          title="Excluir Agendamento"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 text-[var(--color-text-sec-light)]"><ChevronLeft size={24} /></button>
          <h2 className="text-lg font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] w-32 text-center capitalize">
            {monthName} {year}
          </h2>
          <button onClick={nextMonth} className="p-1 text-[var(--color-text-sec-light)]"><ChevronRight size={24} /></button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowOrfaos(!showOrfaos)}
            className={`p-2 rounded-full transition-colors ${showOrfaos ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}
            title="Sessões Órfãs (Sem data)"
          >
            <AlertCircle size={20} />
          </button>
          <button 
            onClick={() => setIsBloqueiosOpen(true)}
            className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full"
            aria-label="Bloqueios"
          >
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* Orphan Sessions View */}
      {showOrfaos && (
        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 border-b border-orange-100 dark:border-orange-900/30">
          <h3 className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle size={14} /> Sessões de Pacotes sem data definida
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-2">
            {clientes.map(cliente => {
              const clientePacotes = pacotes.filter(p => p.clienteId === cliente.id);
              const orfaos = clientePacotes.flatMap(p => 
                p.itens.filter(item => item.quantidadeRestante > 0).map(item => ({
                  pacoteId: p.id,
                  itemPacoteId: item.id,
                  terapiaId: item.terapiaId,
                  nome: terapias.find(t => t.id === item.terapiaId)?.nome || 'Desconhecida',
                  restante: item.quantidadeRestante
                }))
              );

              if (orfaos.length === 0) return null;

              return (
                <div key={cliente.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 shrink-0 min-w-[140px]">
                  <p className="text-xs font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-2 truncate">{cliente.nome}</p>
                  <div className="space-y-1">
                    {orfaos.map((o, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-2">
                        <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] truncate">{o.nome}</span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 rounded-full">{o.restante}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {clientes.every(c => !pacotes.some(p => p.clienteId === c.id && p.itens.some(i => i.quantidadeRestante > 0))) && (
              <p className="text-xs text-orange-600 italic">Nenhuma sessão órfã encontrada.</p>
            )}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-48 max-h-[70vh]">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] py-2">
              {d}
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {(() => {
            const weeks: (number | null)[][] = [];
            let currentWeek: (number | null)[] = Array(firstDay).fill(null);
            for (let i = 1; i <= daysInMonth; i++) {
              currentWeek.push(i);
              if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
              }
            }
            if (currentWeek.length > 0) {
              while (currentWeek.length < 7) currentWeek.push(null);
              weeks.push(currentWeek);
            }

            return weeks.map((week, weekIdx) => {
              const isExpanded = expandedWeekIndex === weekIdx;
              return (
                <div key={weekIdx} className={`grid grid-cols-7 gap-1 transition-all duration-300 ${isExpanded ? 'min-h-max' : 'h-auto'}`}>
                  {week.map((day, dayIdx) => {
                    if (day === null) return <div key={`empty-${weekIdx}-${dayIdx}`} className="aspect-square rounded-lg bg-transparent" />;
                    
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayAgendamentos = agendamentos
                      .filter(a => a.date?.startsWith(dateStr) && a.statusAtendimento !== 'Cancelado')
                      .sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
                    const hasBloqueio = bloqueios.some(b => b.data === dateStr);
                    const isToday = new Date().toISOString().startsWith(dateStr);

                    return (
                      <div 
                        key={day} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dayAgendamentos.length > 1) {
                            setExpandedWeekIndex(isExpanded ? null : weekIdx);
                          } else {
                            openDayAgenda(day);
                          }
                        }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                        className={`min-h-[60px] rounded-lg flex flex-col p-1 relative cursor-pointer transition-colors ${
                          isToday ? 'bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]' : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800'
                        } ${isExpanded ? 'h-auto overflow-visible' : 'aspect-square overflow-hidden'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] font-bold ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-sec-light)]'}`}>{day}</span>
                          {hasBloqueio && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />}
                        </div>

                        <div className="flex flex-col gap-1">
                          {isExpanded ? (
                            dayAgendamentos.map(ag => {
                              const cliente = clientes.find(c => c.id === ag.clienteId);
                              const isRealizado = ag.statusAtendimento === 'Realizado';
                              return (
                                <div 
                                  key={ag.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData('agendamentoId', ag.id);
                                  }}
                                  onMouseDown={() => startLongPress(ag.id)}
                                  onMouseUp={stopLongPress}
                                  onMouseLeave={stopLongPress}
                                  onTouchStart={() => startLongPress(ag.id)}
                                  onTouchEnd={stopLongPress}
                                  className={`text-[9px] p-1 rounded border leading-tight ${
                                    isRealizado 
                                      ? 'bg-gray-100 text-gray-400 border-gray-200' 
                                      : 'bg-[var(--color-primary)]/5 text-[var(--color-primary)] border-[var(--color-primary)]/20'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold truncate">{new Date(`${ag.date}T${ag.time}:00`).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isRealizado && <CheckCircle2 size={8} />}
                                  </div>
                                  <div className="truncate font-medium">{cliente?.nome}</div>
                                </div>
                              );
                            })
                          ) : (
                            dayAgendamentos.length > 0 && (
                              <>
                                <div className="text-[9px] p-1 rounded bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-[var(--color-primary)]/20 leading-tight truncate">
                                  {clientes.find(c => c.id === dayAgendamentos[0].clienteId)?.nome}
                                </div>
                                {dayAgendamentos.length > 1 && (
                                  <div className="text-[8px] font-bold text-[var(--color-primary)] mt-0.5">
                                    + {dayAgendamentos.length - 1} atendimentos
                                  </div>
                                )}
                              </>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Draggable Clients Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-4 pb-8 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-20">
        <h3 className="text-xs font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <GripVertical size={14} /> Selecione um cliente e arraste a terapia
        </h3>
        <div className="flex overflow-x-auto pb-2 gap-3 snap-x">
          {clientes.map(cliente => {
            const isExpanded = expandedClienteId === cliente.id;
            const clientePacotes = pacotes.filter(p => p.clienteId === cliente.id);
            const terapiasContratadas = clientePacotes.flatMap(p => 
              p.itens.map(item => ({
                pacoteId: p.id,
                itemPacoteId: item.id,
                terapiaId: item.terapiaId,
                nome: terapias.find(t => t.id === item.terapiaId)?.nome || 'Desconhecida',
                restante: item.quantidadeRestante,
                total: item.quantidade
              }))
            );

            return (
              <div key={cliente.id} className="snap-start shrink-0 flex flex-col gap-2">
                <div 
                  onClick={() => setExpandedClienteId(isExpanded ? null : cliente.id)}
                  className={`px-4 py-2.5 rounded-full border shadow-sm cursor-pointer transition-colors ${
                    isExpanded 
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                      : 'bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border-gray-200 dark:border-gray-700 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]'
                  }`}
                >
                  <span className="text-sm font-medium whitespace-nowrap">
                    {cliente.nome}
                  </span>
                </div>
                
                {isExpanded && terapiasContratadas.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    {terapiasContratadas.map((tc, idx) => (
                      <div 
                        key={`${tc.pacoteId}-${tc.itemPacoteId}-${idx}`}
                        draggable={tc.restante > 0}
                        onDragStart={(e) => {
                          if (tc.restante <= 0) {
                            e.preventDefault();
                            return;
                          }
                          e.dataTransfer.setData('clienteId', cliente.id);
                          e.dataTransfer.setData('terapiaId', tc.terapiaId);
                          e.dataTransfer.setData('pacoteId', tc.pacoteId);
                          e.dataTransfer.setData('itemPacoteId', tc.itemPacoteId);
                        }}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                          tc.restante > 0 
                            ? 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-[var(--color-primary)]/30 text-[var(--color-primary)] cursor-grab active:cursor-grabbing' 
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed opacity-40 grayscale'
                        }`}
                      >
                        {tc.nome} {tc.restante}/{tc.total}
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && terapiasContratadas.length === 0 && (
                  <div className="px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs text-[var(--color-text-sec-light)]">
                    Sem pacotes
                  </div>
                )}
              </div>
            );
          })}
          {clientes.length === 0 && (
            <p className="text-sm text-[var(--color-text-sec-light)]">Nenhum cliente ativo.</p>
          )}
        </div>
      </div>

      {/* Modal Novo Atendimento */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                Novo Atendimento
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-sec-light)] p-1">
                <X size={24} />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl flex items-start gap-2">
                <AlertCircle size={18} className="text-[var(--color-error)] shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--color-error)] font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Cliente</label>
                <div className="px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl font-medium">
                  {clientes.find(c => c.id === formClienteId)?.nome}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-2">Terapias Selecionadas</label>
                <div className="space-y-2 mb-3">
                  {formTerapiaIds.map((tid, index) => {
                    const t = terapias.find(x => x.id === tid);
                    return (
                      <div key={`${tid}-${index}`} className="flex items-center justify-between bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{t?.nome} ({t?.duracao} min)</span>
                        <button 
                          onClick={() => {
                            const newIds = [...formTerapiaIds];
                            newIds.splice(index, 1);
                            setFormTerapiaIds(newIds);
                            // Recalcular valor
                            const newVal = newIds.reduce((acc, id) => acc + (terapias.find(x => x.id === id)?.valor || 0), 0);
                            setFormValor(newVal);
                          }}
                          className="text-[var(--color-error)] p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-2">
                  <select 
                    value=""
                    onChange={(e) => {
                      const tid = e.target.value;
                      if (!tid) return;
                      const newIds = [...formTerapiaIds, tid];
                      setFormTerapiaIds(newIds);
                      // Somar valor
                      const t = terapias.find(x => x.id === tid);
                      if (t) setFormValor(prev => prev + t.valor);
                    }}
                    className="flex-1 px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  >
                    <option value="">+ Adicionar Terapia...</option>
                    {terapias.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.duracao} min)</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Data</label>
                  <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Horário</label>
                  <input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={formValor} onChange={e => setFormValor(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Status</label>
                  <select value={formStatusPagamento} onChange={e => setFormStatusPagamento(e.target.value as any)} className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
              </div>

              {/* Recorrência */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={recorrencia} onChange={e => setRecorrencia(e.target.checked)} className="w-5 h-5 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Repetir Agendamento (Recorrência)</span>
                </label>

                {recorrencia && (
                  <div className="flex gap-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-3 rounded-xl">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Frequência</label>
                      <select value={frequencia} onChange={e => setFrequencia(e.target.value as any)} className="w-full px-2 py-2 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-lg text-sm outline-none">
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">Até quando?</label>
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-2 py-2 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-lg text-sm outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSaveAgendamento}
                className="w-full py-3.5 mt-2 bg-[var(--color-primary)] text-white font-medium rounded-xl shadow-md hover:opacity-90 transition-opacity"
              >
                Salvar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
