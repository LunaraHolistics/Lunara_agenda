import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, ShieldAlert, X, GripVertical, Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Cliente, Terapia, Agendamento, Bloqueio, Pacote } from '../types';
import { AsyncStorage } from '../utils/storage';
import { useAppContext } from '../AppContext';

export default function AgendaScreen() {
  const { 
    completeAppointment, 
    showNotification, 
    confirmAction, 
    safeDate, 
    promptAction, 
    session,
    clientes,
    terapias,
    agendamentos,
    pacotes,
    bloqueios,
    updateAgendamento,
    updatePacote,
    fetchData
  } = useAppContext();
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBloqueiosOpen, setIsBloqueiosOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [showOrfaos, setShowOrfaos] = useState(false);
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(null);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Form State - Agendamento
  const [formClienteId, setFormClienteId] = useState('');
  const [activePackage, setActivePackage] = useState<Pacote | null>(null);

  useEffect(() => {
    if (formClienteId) {
      const active = pacotes.find(p => p.clienteId === formClienteId);
      setActivePackage(active || null);
    } else {
      setActivePackage(null);
    }
  }, [formClienteId, pacotes]);

  const [formTerapiaIds, setFormTerapiaIds] = useState<string[]>([]);
  const [formPacoteId, setFormPacoteId] = useState<string | undefined>(undefined);
  const [formItemPacoteId, setFormItemPacoteId] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('');
  const [formValor, setFormValor] = useState(0);
  const [formStatusPagamento, setFormStatusPagamento] = useState<'Pendente' | 'Pago'>('Pendente');
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
    fetchData();
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage-sync', fetchData);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage-sync', fetchData);
    };
  }, [refreshTrigger]);

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

  // Handlers
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const agendamentoId = e.dataTransfer.getData('agendamentoId');
    const clienteId = e.dataTransfer.getData('clienteId');
    const terapiaId = e.dataTransfer.getData('terapiaId');
    const pacoteId = e.dataTransfer.getData('pacoteId');
    const itemPacoteId = e.dataTransfer.getData('itemPacoteId');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (agendamentoId) {
      const itemToUpdate = agendamentos.find(a => String(a.id) === String(agendamentoId));
      
      if (itemToUpdate) {
        // Garantimos que date e time sejam atualizados no estado local via updateAgendamento
        const updatedItem = { ...itemToUpdate, date: dateStr, time: itemToUpdate.time };
        
        // updateAgendamento no AppContext já faz o update otimista no estado global
        updateAgendamento(updatedItem).catch(err => {
          console.error('Erro ao salvar agendamento:', err);
          showNotification('Erro ao reagendar.', 'error');
        });
        
        showNotification('Agendamento reagendado!', 'success');
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
      setFormValor(terapia?.valor || terapia?.price || 0);
      setFormHora('09:00');
      setIsModalOpen(true);
    }
  };

  const handleSaveAgendamento = async () => {
    if (!formClienteId || formTerapiaIds.length === 0 || !formData || !formHora) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    const selectedTerapias = formTerapiaIds.map(tid => terapias.find(t => t.id === tid)).filter(Boolean) as Terapia[];
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

    const saveAll = async (formaPagamento?: string) => {
      const newAgendamentos: Agendamento[] = [];
      const prevPacotes = [...pacotes];

      for (let d of datesToSchedule) {
        const agendamentoId = crypto.randomUUID();
        const newAgendamento: Agendamento = {
          id: agendamentoId,
          userId: session?.user?.id || '',
          clientId: formClienteId,
          therapyItemId: formTerapiaIds[0],
          therapyName: selectedTerapias.map(t => t.name).join(' + '),
          date: d,
          time: formHora,
          packageId: formPacoteId,
          statusPagamento: formStatusPagamento,
          statusAtendimento: 'Agendado',
          formaPagamento: formaPagamento,
          dataPagamento: formaPagamento ? new Date().toISOString().split('T')[0] : undefined,
          valorCobrado: Number(formValor)
        };
        newAgendamentos.push(newAgendamento);
      }

      // Handle package updates if applicable
      let updatedPacote: Pacote | null = null;
      if (formPacoteId && formItemPacoteId) {
        const pacote = pacotes.find(p => p.id === formPacoteId);
        if (pacote) {
          const itensArray = Array.isArray(pacote.itens) ? pacote.itens : (typeof pacote.itens === 'string' ? JSON.parse(pacote.itens) : []);
          const updatedItens = itensArray.map((item: any) => {
            if (item.id === formItemPacoteId) {
              return { ...item, quantidadeRestante: Number(item.quantidadeRestante || 0) - datesToSchedule.length };
            }
            return item;
          });
          updatedPacote = { ...pacote, itens: updatedItens };
        }
      }

      // Background persistence using AppContext methods for better reactivity
      const persist = async () => {
        try {
          for (const ag of newAgendamentos) {
            // Usamos o StorageService diretamente aqui para evitar o crypto.randomUUID() duplo do addAgendamento se quisermos manter o ID gerado acima
            // Ou podemos simplesmente chamar addAgendamento se não nos importarmos com o ID exato gerado aqui.
            // Para manter a consistência com o resto do app, vamos usar addAgendamento mas adaptado se necessário.
            // Na verdade, addAgendamento no AppContext gera um novo ID. 
            // Vamos usar o StorageService.saveItem diretamente para manter o ID que geramos para o financeiro.
            await StorageService.saveItem(StorageKeys.AGENDAMENTOS, ag);
            
            if (formStatusPagamento === 'Pago') {
              const cliente = clientes.find(c => String(c.id) === String(formClienteId));
              const clienteNome = cliente?.name || cliente?.nome || 'Cliente';
              const transacao = {
                id: crypto.randomUUID(),
                userId: session?.user?.id || '',
                descricao: `Atendimento - ${clienteNome}`,
                valor: Number(formValor),
                data: new Date().toISOString().split('T')[0],
                dataPagamento: new Date().toISOString().split('T')[0],
                metodo: formaPagamento,
                categoria: 'Atendimento',
                status: 'Pago'
              };
              await StorageService.saveItem(StorageKeys.TRANSACOES, transacao);
            }
          }

          if (updatedPacote) {
            await updatePacote(updatedPacote);
          }
          
          fetchData(); // Refresh global state
        } catch (err) {
          console.error("Erro na persistência em segundo plano:", err);
          showNotification('Erro ao salvar no banco. Verifique sua conexão.', 'error');
        }
      };

      // Optimistic UI update (manual since we have multiple agendamentos)
      // We'll trigger a refresh after persist
      persist();

      setIsModalOpen(false);
      showNotification('Agendado com sucesso!', 'success');
    };

    if (formStatusPagamento === 'Pago') {
      promptAction('Forma de Pagamento (PIX, Crédito, Débito, Transferência, Dinheiro):', 'PIX', async (forma) => {
        if (forma) {
          await saveAll(forma);
        }
      }, { title: 'Registrar Pagamento', placeholder: 'PIX, Dinheiro, etc.' });
    } else {
      await saveAll();
    }
  };

  const handleDeleteAgendamento = async (agendamentoId: string) => {
    confirmAction('Deseja realmente excluir este agendamento?', async () => {
      try {
        const allAgendamentos = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
        const agendamento = allAgendamentos.find(a => String(a.id) === String(agendamentoId));
        
        if (agendamento?.packageId) {
          const pacotesList = await StorageService.getItems<Pacote>(StorageKeys.PACOTES);
          const pacote = pacotesList.find(p => String(p.id) === String(agendamento.packageId));
          if (pacote) {
            const itensArray = typeof pacote.itens === 'string' ? JSON.parse(pacote.itens) : (pacote.itens || []);
            const updatedItens = itensArray.map((item: any) => {
              if (String(item.id) === String(agendamento.therapyItemId)) {
                return { ...item, quantidadeRestante: (item.quantidadeRestante || 0) + 1 };
              }
              return item;
            });
            await StorageService.updateItem(StorageKeys.PACOTES, { ...pacote, itens: updatedItens });
          }
        }

        await StorageService.deleteItem(StorageKeys.AGENDAMENTOS, agendamentoId);
        setRefreshTrigger(prev => prev + 1);
        showNotification('Agendamento excluído!', 'success');
      } catch (error) {
        showNotification('Erro ao excluir agendamento.', 'error');
      }
    }, { isDanger: true });
  };

  const handleCompleteAppointment = async (id: string) => {
    await completeAppointment(id);
    setRefreshTrigger(prev => prev + 1);
  };

  const openDayAgenda = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsDayAgendaOpen(true);
  };

  // Long Press logic for dragging existing appointments
  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      // Logic for starting drag if needed via state
    }, 500);
  };

  return (
    <div className="flex flex-col h-full relative bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[var(--color-text-sec-light)] transition-colors"><ChevronLeft size={24} /></button>
          <h2 className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] min-w-[140px] text-center capitalize">
            {monthName} <span className="text-[var(--color-primary)]">{year}</span>
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[var(--color-text-sec-light)] transition-colors"><ChevronRight size={24} /></button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowOrfaos(!showOrfaos)}
            className={`p-2 rounded-full transition-all ${showOrfaos ? 'bg-[var(--color-primary)] text-white shadow-lg scale-110' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'}`}
            title="Sessões Órfãs"
          >
            <AlertCircle size={20} />
          </button>
          <button 
            onClick={() => setIsBloqueiosOpen(true)}
            className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full hover:bg-[var(--color-error)]/20 transition-colors"
          >
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* Orphan Sessions View */}
      {showOrfaos && (
        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 border-b border-orange-100 dark:border-orange-900/30 animate-in slide-in-from-top duration-300">
          <h3 className="text-[10px] font-black text-orange-800 dark:text-orange-300 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <AlertCircle size={14} /> Pacotes Aguardando Agendamento
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {clientes.map(cliente => {
              const clientePacotes = pacotes.filter(p => p.clienteId === cliente.id);
              const orfaos = clientePacotes.flatMap(p => {
                const itensArray: any[] = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []);
                return itensArray.filter(item => Number(item.quantidadeRestante || 0) > 0).map(item => ({
                  pacoteId: p.id,
                  itemPacoteId: item.id,
                  terapiaId: item.terapiaId,
                  nome: terapias.find(t => t.id === item.terapiaId)?.name || 'Desconhecida',
                  restante: item.quantidadeRestante
                }));
              });

              if (orfaos.length === 0) return null;

              return (
                <div key={cliente.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 shrink-0 min-w-[160px]">
                  <p className="text-[11px] font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-2 truncate border-b border-gray-100 dark:border-gray-700 pb-1">{cliente.name}</p>
                  <div className="space-y-1.5">
                    {orfaos.map((o, idx) => (
                      <div 
                        key={idx} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('clienteId', cliente.id);
                          e.dataTransfer.setData('terapiaId', o.terapiaId);
                          e.dataTransfer.setData('pacoteId', o.pacoteId);
                          e.dataTransfer.setData('itemPacoteId', o.itemPacoteId);
                        }}
                        className="flex justify-between items-center gap-2 cursor-grab active:cursor-grabbing bg-orange-50 dark:bg-orange-900/20 p-1 rounded"
                      >
                        <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] truncate">{o.nome}</span>
                        <span className="text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded-full">{o.restante}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-52 scrollbar-hide">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black uppercase tracking-tighter text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] py-2">
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
                    if (day === null) return <div key={`empty-${weekIdx}-${dayIdx}`} className="aspect-square opacity-20" />;
                    
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayAgendamentos = agendamentos
                      .filter(a => a.date === dateStr && a.statusAtendimento !== 'Cancelado')
                      .sort((a, b) => a.time.localeCompare(b.time));
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
                        className={`min-h-[65px] rounded-xl flex flex-col p-1.5 relative cursor-pointer transition-all border ${
                          isToday 
                            ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' 
                            : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-gray-100 dark:border-gray-800'
                        } ${isExpanded ? 'h-auto shadow-lg ring-1 ring-primary' : 'aspect-square overflow-hidden'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[11px] font-black ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-sec-light)] opacity-50'}`}>{day}</span>
                          {hasBloqueio && <ShieldAlert size={10} className="text-[var(--color-error)]" />}
                        </div>

                        <div className="flex flex-col gap-1">
                          {isExpanded ? (
                            dayAgendamentos.map(ag => {
                              const cliente = clientes.find(c => c.id === ag.clientId);
                              const isRealizado = ag.statusAtendimento === 'Realizado';
                              return (
                                <div 
                                  key={ag.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData('agendamentoId', ag.id);
                                  }}
                                  className={`text-[9px] p-1 rounded border leading-tight ${
                                    isRealizado ? 'bg-gray-100 text-gray-400' : 'bg-white dark:bg-gray-700 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                                  }`}
                                >
                                  <div className="flex justify-between items-center font-black">
                                    <span>{ag.time}</span>
                                    {isRealizado && <CheckCircle2 size={8} />}
                                  </div>
                                  <div className="truncate">{cliente?.name?.split(' ')[0]}</div>
                                </div>
                              );
                            })
                          ) : (
                            dayAgendamentos.length > 0 && (
                              <>
                                <div className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-primary)] text-white font-bold leading-tight truncate">
                                  {clientes.find(c => c.id === dayAgendamentos[0].clientId)?.name?.split(' ')[0]}
                                </div>
                                {dayAgendamentos.length > 1 && (
                                  <div className="text-[8px] font-black text-[var(--color-primary)] mt-0.5 bg-[var(--color-primary)]/10 px-1 rounded-sm w-fit">
                                    +{dayAgendamentos.length - 1}
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
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-4 pb-10 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.15)] z-20 rounded-t-[2.5rem]">
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 opacity-50"></div>
        <h3 className="text-[10px] font-black text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
          <GripVertical size={14} className="animate-pulse" /> Arraste a terapia para agendar
        </h3>
        <div className="flex overflow-x-auto pb-4 gap-3 snap-x scroll-smooth no-scrollbar">
          {clientes.filter(cliente => pacotes.some(p => p.clienteId === cliente.id)).map(cliente => {
            const isExpanded = expandedClienteId === cliente.id;
            const clientePacotes = pacotes.filter(p => p.clienteId === cliente.id);
            const terapiasContratadas = clientePacotes.flatMap(p => {
              const itensArray: any[] = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []);
              return itensArray.map(item => ({
                pacoteId: p.id,
                itemPacoteId: item.id,
                terapiaId: item.terapiaId,
                nome: terapias.find(t => t.id === item.terapiaId)?.name || 'Desconhecida',
                restante: item.quantidadeRestante,
                total: item.quantidadeTotal
              }));
            });

            return (
              <div key={cliente.id} className={`snap-start shrink-0 flex flex-col gap-2 transition-all duration-300 ${isExpanded ? 'min-w-[180px]' : 'min-w-[120px]'}`}>
                <div 
                  onClick={() => setExpandedClienteId(isExpanded ? null : cliente.id)}
                  className={`px-4 py-3 rounded-2xl border shadow-sm cursor-pointer transition-all flex items-center justify-between ${
                    isExpanded 
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                      : 'bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border-gray-100 dark:border-gray-700 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]'
                  }`}
                >
                  <span className="text-xs font-bold truncate">
                    {cliente.name?.split(' ')[0] || "Sem Nome"}
                  </span>
                  {terapiasContratadas.length > 0 && <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-white' : 'bg-[var(--color-primary)]'}`}></div>}
                </div>
                
                {isExpanded && (
                  <div className="flex flex-col gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                    {terapiasContratadas.length > 0 ? (
                      terapiasContratadas.map((tc, idx) => (
                        <div 
                          key={`${tc.pacoteId}-${tc.itemPacoteId}-${idx}`}
                          draggable={tc.restante > 0}
                          onDragStart={(e) => {
                            if (tc.restante <= 0) { e.preventDefault(); return; }
                            e.dataTransfer.setData('clienteId', cliente.id);
                            e.dataTransfer.setData('terapiaId', tc.terapiaId);
                            e.dataTransfer.setData('pacoteId', tc.pacoteId);
                            e.dataTransfer.setData('itemPacoteId', tc.itemPacoteId);
                          }}
                          className={`px-3 py-2.5 rounded-xl border text-[10px] font-black flex justify-between items-center transition-all ${
                            tc.restante > 0 
                              ? 'bg-white dark:bg-gray-800 border-[var(--color-primary)]/20 text-[var(--color-primary)] cursor-grab active:cursor-grabbing' 
                              : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-400 opacity-50 grayscale cursor-not-allowed'
                          }`}
                        >
                          <span className="truncate mr-2">{tc.nome}</span>
                          <span className={`px-1.5 rounded-md ${tc.restante > 0 ? 'bg-[var(--color-primary)]/10' : 'bg-gray-200'}`}>{tc.restante}/{tc.total}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-[10px] text-center text-gray-400 italic">
                        Sem sessões disponíveis
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Novo Atendimento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tighter">
                Agendar <span className="text-[var(--color-primary)]">Sessão</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-transform active:scale-90">
                <X size={24} className="text-[var(--color-text-sec-light)]" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-[var(--color-error)]/10 border-l-4 border-[var(--color-error)] rounded-r-xl flex items-center gap-3">
                <AlertCircle size={20} className="text-[var(--color-error)] shrink-0" />
                <p className="text-xs text-[var(--color-error)] font-bold">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-5 pb-8">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Cliente</label>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {clientes.find(c => c.id === formClienteId)?.name || "Cliente"}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-3">Terapias Selecionadas</label>
                <div className="space-y-2 mb-3">
                  {formTerapiaIds.map((tid, index) => {
                    const t = terapias.find(x => x.id === tid);
                    return (
                      <div key={`${tid}-${index}`} className="flex items-center justify-between bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] px-4 py-3 rounded-2xl border border-[var(--color-primary)]/10 shadow-sm">
                        <span className="text-sm font-bold">{t?.name || "Terapia"} <span className="text-xs font-normal opacity-60 ml-1">({t?.duration || 0}m)</span></span>
                        <button 
                          onClick={() => {
                            const newIds = [...formTerapiaIds];
                            newIds.splice(index, 1);
                            setFormTerapiaIds(newIds);
                          }}
                          className="bg-red-50 dark:bg-red-900/20 text-red-500 p-1.5 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Data</label>
                  <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Horário</label>
                  <input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Valor Total</label>
                  <div className="flex items-center gap-1 font-black text-[var(--color-success)]">
                    <span>R$</span>
                    <input type="number" step="0.01" value={formValor} onChange={e => setFormValor(parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none" />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Pagamento</label>
                  <select value={formStatusPagamento} onChange={e => setFormStatusPagamento(e.target.value as any)} className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer">
                    <option value="Pendente">🔴 Pendente</option>
                    <option value="Pago">🟢 Pago</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={recorrencia} onChange={e => setRecorrencia(e.target.checked)} className="w-5 h-5 rounded-lg text-[var(--color-primary)] border-gray-300 focus:ring-[var(--color-primary)]" />
                  <span className="text-xs font-black uppercase tracking-tight text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Habilitar Recorrência</span>
                </label>

                {recorrencia && (
                  <div className="grid grid-cols-2 gap-3 mt-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-[var(--color-text-sec-light)] mb-1">Intervalo</label>
                      <select value={frequencia} onChange={e => setFrequencia(e.target.value as any)} className="w-full p-2 bg-white dark:bg-gray-700 rounded-xl text-xs font-bold outline-none shadow-sm">
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-[var(--color-text-sec-light)] mb-1">Repetir até</label>
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 rounded-xl text-xs font-bold outline-none shadow-sm" />
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSaveAgendamento}
                className="w-full py-5 mt-4 bg-[var(--color-primary)] text-white font-black text-sm uppercase tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}